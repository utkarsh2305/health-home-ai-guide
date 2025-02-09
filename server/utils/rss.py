import httpx
import feedparser
from fastapi import HTTPException
from pydantic import HttpUrl
from typing import List
from server.schemas.dashboard import RssItem
from server.database.config import config_manager
from ollama import AsyncClient
from datetime import datetime


async def get_feed_title(feed_url: str) -> str:
    """Fetches the title of an RSS feed."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(feed_url)
            response.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=400, detail=f"Error fetching RSS feed: {str(e)}"
            )

    feed = feedparser.parse(response.text)
    return feed.feed.get("title", "Unknown Feed")


async def generate_combined_digest(articles: List[dict]) -> str:
    """Generates a combined summary of multiple articles."""
    config = config_manager.get_config()
    client = AsyncClient(host=config["OLLAMA_BASE_URL"])

    # Get user settings for doctor's name and specialty
    user_settings = config_manager.get_user_settings()
    specialty = user_settings.get("specialty", "medical")

    # Prepare the content for summarization
    articles_text = "\n\n".join(
        [
            f"Article {i+1}:\nTitle: {article['title']}\nAbstract: {article['description']}"
            for i, article in enumerate(articles)
        ]
    )

    system_prompt = f"You are a helpful assistant that summarizes medical literature for a busy {specialty} specialist."
    user_prompt = f"Create a single, short, and coherent paragraph of around 3-4 sentences that summarizes the main points from these {len(articles)} medical articles:\n\n{articles_text}"

    request_body = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
        {"role": "assistant", "content": "Here is the combined summary:\n"},
    ]

    try:
        response = await client.chat(
            model=config["PRIMARY_MODEL"],
            messages=request_body,
        )
        return response["message"]["content"]
    except Exception as e:
        logger.error(f"Error generating combined digest: {str(e)}")
        return "Unable to generate combined digest at this time."


async def generate_item_digest(item: RssItem) -> str:
    """Generates a summary of a single RSS item."""
    config = config_manager.get_config()
    client = AsyncClient(host=config["OLLAMA_BASE_URL"])

    system_prompt = "You are a helpful assistant that summarizes medical literature for a busy medical specialist."
    user_prompt = f"Summarize the following article in two or three sentences:\n\nTitle: {item.title}\nDescription: {item.description}"
    request_body = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
        {"role": "assistant", "content": "Here is the summarized content:\n"},
    ]

    try:
        response = await client.chat(
            model=config["PRIMARY_MODEL"],
            messages=request_body,
        )
        digest = response["message"]["content"]
        return digest
    except Exception as e:
        logger.error(f"Error generating digest: {str(e)}")
        return "Unable to generate digest at this time."


async def fetch_rss_feed(feed_url: str) -> List[RssItem]:
    """Fetches and processes an RSS feed."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(feed_url)
            response.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=400, detail=f"Error fetching RSS feed: {str(e)}"
            )

    feed = feedparser.parse(response.text)

    if not feed.entries:
        raise HTTPException(
            status_code=400, detail="No entries found in the RSS feed"
        )

    def get_entry_date(entry):
        # Try to get the published date, fall back to updated date, or use epoch if neither exists
        date = entry.get("published_parsed") or entry.get("updated_parsed")
        if date:
            return datetime(*date[:6])
        return datetime.fromtimestamp(0)

    # Sort entries by date, most recent first
    sorted_entries = sorted(feed.entries, key=get_entry_date, reverse=True)

    rss_items = []
    for entry in sorted_entries:
        published = entry.get("published") or entry.get("updated")
        rss_items.append(
            RssItem(
                title=entry.get("title", "No title"),
                link=entry.get("link", "#"),
                description=entry.get("description", "No description"),
                published=published,
            )
        )

    return rss_items
