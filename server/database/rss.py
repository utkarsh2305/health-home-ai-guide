import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Dict
from fastapi import HTTPException
import logging
import httpx
import feedparser
from ollama import AsyncClient

from server.database.connection import PatientDatabase
from server.schemas.dashboard import RssFeed, RssItem
from server.utils.rss import (
    get_feed_title,
    generate_item_digest,
    fetch_rss_feed,
)

db = PatientDatabase()
logger = logging.getLogger(__name__)


class RefreshManager:
    """Manages the refresh state of RSS feeds."""

    def __init__(self):
        self.lock: asyncio.Lock = asyncio.Lock()
        self.is_refreshing: bool = False

    async def start_refresh(self) -> bool:
        """
        Attempts to start a refresh operation.

        Returns:
            bool: True if refresh started, False if already in progress.
        """
        async with self.lock:
            if self.is_refreshing:
                return False
            self.is_refreshing = True
            return True

    async def end_refresh(self) -> None:
        """Ends the current refresh operation."""
        async with self.lock:
            self.is_refreshing = False


refresh_manager = RefreshManager()


def _to_iso8601(date_string: str) -> str:
    """
    Converts a date string to ISO 8601 format.

    Args:
        date_string (str): The date string to convert.

    Returns:
        str: The date in ISO 8601 format.
    """
    try:
        dt = datetime.fromisoformat(date_string.replace("Z", "+00:00"))
    except ValueError:
        dt = datetime.now(timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


async def fetch_and_insert_initial_items(
    feed_id: int, feed_url: str, limit: int = 10
) -> None:
    """
    Fetches and inserts initial items for a new RSS feed.

    Args:
        feed_id (int): The ID of the feed.
        feed_url (str): The URL of the feed.
        limit (int, optional): The maximum number of items to fetch. Defaults to 10.
    """
    try:
        logger.info(f"Fetching initial items for feed {feed_url}")
        new_items = await fetch_rss_feed(feed_url)
        new_items = new_items[:limit]  # Limit to the first 10 items

        async def process_item(item: RssItem) -> Dict[str, str]:
            digest = await generate_item_digest(item)
            return {
                "item": item,
                "digest": digest,
            }

        processed_items = await asyncio.gather(
            *(process_item(item) for item in new_items)
        )

        db = PatientDatabase()  # Create a new database connection
        try:
            for result in processed_items:
                item = result["item"]
                digest = result["digest"]
                db.cursor.execute(
                    """
                    INSERT INTO rss_items (feed_id, title, link, description, published, digest, added_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        feed_id,
                        item.title,
                        str(item.link),
                        item.description,
                        _to_iso8601(item.published),
                        digest,
                        datetime.now(timezone.utc).isoformat(),
                    ),
                )
            db.db.commit()
            logger.info(
                f"Added {len(new_items)} initial items for feed {feed_url}"
            )
        finally:
            db.db.close()
    except Exception as e:
        logger.error(f"Error adding initial items for feed {feed_url}: {e}")


async def add_feed(feed: RssFeed) -> int:
    """
    Adds a new RSS feed to the database.

    Args:
        feed (RssFeed): The feed to add.

    Returns:
        int: The ID of the newly added feed.

    Raises:
        HTTPException: If the feed URL already exists or there's a server error.
    """
    try:
        with db.db:
            db.cursor.execute(
                "INSERT INTO rss_feeds (url, title, last_refreshed) VALUES (?, ?, ?)",
                (
                    str(feed.url),
                    feed.title,
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            feed_id = db.cursor.lastrowid

        return feed_id
    except db.db.IntegrityError:
        raise HTTPException(status_code=400, detail="Feed URL already exists")
    except Exception as e:
        logger.error(f"Error adding feed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


async def refresh_single_feed(feed_id: int, feed_url: str) -> None:
    """
    Refreshes a single RSS feed.

    Args:
        feed_id (int): The ID of the feed to refresh.
        feed_url (str): The URL of the feed to refresh.
    """
    try:
        new_items = await fetch_rss_feed(feed_url)

        db.cursor.execute(
            "SELECT link FROM rss_items WHERE feed_id = ?", (feed_id,)
        )
        existing_links = set(row[0] for row in db.cursor.fetchall())

        for item in new_items:
            if str(item.link) not in existing_links:
                digest = await generate_item_digest(item)
                db.cursor.execute(
                    """
                    INSERT INTO rss_items (feed_id, title, link, description, published, digest, added_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        feed_id,
                        item.title,
                        str(item.link),
                        item.description,
                        _to_iso8601(item.published),
                        digest,
                        datetime.now(timezone.utc).isoformat(),
                    ),
                )

        db.cursor.execute(
            "UPDATE rss_feeds SET last_refreshed = ? WHERE id = ?",
            (datetime.now(timezone.utc).isoformat(), feed_id),
        )
        db.commit()
        logger.info(
            f"Feed {feed_url} refreshed successfully. {len(new_items)} new items processed."
        )
    except Exception as e:
        logger.error(f"Error refreshing feed {feed_url}: {e}")
        db.db.rollback()


def get_feeds() -> List[RssFeed]:
    """
    Retrieves all RSS feeds from the database.

    Returns:
        List[RssFeed]: A list of all RSS feeds.
    """
    db.cursor.execute("SELECT id, url, title FROM rss_feeds")
    return [
        RssFeed(id=row[0], url=row[1], title=row[2])
        for row in db.cursor.fetchall()
    ]


def remove_feed(feed_id: int) -> None:
    """
    Removes an RSS feed and its items from the database.

    Args:
        feed_id (int): The ID of the feed to remove.

    Raises:
        Exception: If the feed is not found.
    """
    db.cursor.execute("DELETE FROM rss_items WHERE feed_id = ?", (feed_id,))
    db.cursor.execute("DELETE FROM rss_feeds WHERE id = ?", (feed_id,))
    if db.cursor.rowcount == 0:
        raise Exception("Feed not found")
    db.commit()


async def refresh_feeds(feed_id: Optional[int] = None) -> str | int:
    """
    Refreshes all RSS feeds or a specific feed.

    Args:
        feed_id (Optional[int], optional): The ID of a specific feed to refresh. Defaults to None.

    Returns:
        str | int: A message if refresh is in progress, or the number of feeds refreshed.
    """
    if not await refresh_manager.start_refresh():
        return "A refresh operation is already in progress"

    try:
        if feed_id:
            db.cursor.execute(
                "SELECT id, url FROM rss_feeds WHERE id = ?", (feed_id,)
            )
        else:
            db.cursor.execute("SELECT id, url FROM rss_feeds")

        feeds = db.cursor.fetchall()
        refresh_tasks = [
            refresh_single_feed(feed[0], feed[1]) for feed in feeds
        ]
        await asyncio.gather(*refresh_tasks)
        return len(feeds)
    finally:
        await refresh_manager.end_refresh()


def fetch_rss_items_from_db(
    feed_ids: Optional[List[int]] = None, limit: int = 10
) -> List[RssItem]:
    """
    Fetches RSS items from the database.

    Args:
        feed_ids (Optional[List[int]], optional): List of feed IDs to fetch items from. Defaults to None.
        limit (int, optional): Maximum number of items to fetch. Defaults to 10.

    Returns:
        List[RssItem]: A list of RSS items.
    """
    query = """
    SELECT ri.title, ri.link, ri.description, ri.published, rf.title AS feed_title, ri.added_at, ri.digest
    FROM rss_items ri
    JOIN rss_feeds rf ON ri.feed_id = rf.id
    """
    params = []

    if feed_ids:
        query += f" WHERE ri.feed_id IN ({','.join('?' * len(feed_ids))})"
        params.extend(feed_ids)

    query += " ORDER BY ri.added_at DESC LIMIT ?"
    params.append(limit)

    db.cursor.execute(query, params)
    return [
        RssItem(
            title=row[0],
            link=row[1],
            description=row[2],
            published=row[3],
            feed_title=row[4],
            added_at=row[5],
            digest=row[6],
        )
        for row in db.cursor.fetchall()
    ]


def get_recent_digests(limit: Optional[int] = 3) -> List[dict]:
    """
    Retrieves the most recent RSS item digests.

    Args:
        limit (Optional[int], optional): Maximum number of digests to retrieve. Defaults to 3.

    Returns:
        List[dict]: A list of dictionaries containing digest information.
    """
    db.cursor.execute(
        """
        SELECT rss_items.title, rss_items.digest, rss_feeds.title AS feed_title,
               rss_items.link, rss_items.published, rss_items.added_at
        FROM rss_items
        JOIN rss_feeds ON rss_items.feed_id = rss_feeds.id
        ORDER BY rss_items.added_at DESC
        LIMIT ?
        """,
        (limit,),
    )
    return [
        {
            "title": row[0],
            "digest": row[1],
            "feed_title": row[2],
            "link": row[3],
            "published": row[4],
            "added_at": row[5],
        }
        for row in db.cursor.fetchall()
    ]
