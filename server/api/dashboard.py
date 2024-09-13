from fastapi import APIRouter, BackgroundTasks
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse
from pydantic import HttpUrl, ValidationError
from server.database.rss import (
    fetch_rss_items_from_db,
    get_feed_title,
    RssFeed,
    add_feed,
    get_feeds,
    remove_feed,
    get_recent_digests,
    refresh_feeds,
    refresh_single_feed,
    refresh_manager,
    fetch_and_insert_initial_items,
)
from server.database.todo import (
    add_todo_item,
    get_todo_items,
    update_todo_item,
    delete_todo_item,
)
from server.schemas.dashboard import (
    RssFeed,
    TodoItem,
    RssFeedRefreshRequest,
    RssFeedList,
)
import logging
from datetime import datetime
from email.utils import parsedate_to_datetime

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/rss/fetch")
async def fetch_rss(feed_list: RssFeedList):
    feed_ids = [feed.id for feed in feed_list.feeds if feed.id is not None]

    if not feed_ids:
        # If no specific feed IDs are provided, fetch from all feeds
        items = fetch_rss_items_from_db(limit=10)
    else:
        items = fetch_rss_items_from_db(feed_ids=feed_ids, limit=10)

    return {"items": items}


@router.get("/rss/title")
async def get_rss_title(url: HttpUrl):
    title = await get_feed_title(str(url))
    return {"title": title}


@router.post("/rss/add")
async def add_rss_feed(feed: RssFeed, background_tasks: BackgroundTasks):
    try:
        if not feed.title:
            feed.title = await get_feed_title(str(feed.url))
        feed_id = await add_feed(feed)  # Add 'await' here

        # Schedule the fetching and insertion as a background task
        background_tasks.add_task(
            fetch_and_insert_initial_items, feed_id, str(feed.url)
        )

        return {"message": "Feed added successfully"}
    except ValidationError as ve:
        logger.error(f"Validation error: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Unexpected error in add_rss_feed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/rss/list")
async def list_rss_feeds():
    feeds = get_feeds()
    return {"feeds": feeds}


@router.get("/rss/digest")
async def get_rss_digest():
    digests = get_recent_digests(limit=3)  # Get the 3 most recent digests
    return {"digests": digests}


@router.delete("/rss/remove/{feed_id}")
async def remove_rss_feed(feed_id: int):
    try:
        remove_feed(feed_id)
        return {"message": "Feed removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/todos")
async def add_todo(todo: TodoItem):
    try:
        new_todo = add_todo_item(todo.task)
        return JSONResponse(content={"todo": new_todo})
    except Exception as e:
        logging.error(f"Error adding todo item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/todos")
async def get_todos():
    try:
        todos = get_todo_items()
        return JSONResponse(content={"todos": todos})
    except Exception as e:
        logging.error(f"Error fetching todo items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/todos/{todo_id}")
async def update_todo(todo_id: int, todo: TodoItem):
    try:
        updated_todo = update_todo_item(todo_id, todo.task, todo.completed)
        return JSONResponse(content={"todo": updated_todo})
    except Exception as e:
        logging.error(f"Error updating todo item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/todos/{todo_id}")
async def delete_todo(todo_id: int):
    try:
        delete_todo_item(todo_id)
        return JSONResponse(
            content={"message": "Todo item deleted successfully"}
        )
    except Exception as e:
        logging.error(f"Error deleting todo item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rss/refresh")
async def refresh_rss_feeds(request: RssFeedRefreshRequest):
    try:
        result = await refresh_feeds(request.feed_id)
        if isinstance(result, str):  # It's an error message
            return {"message": result}

        if request.feed_id:
            return {
                "message": f"Feed with id {request.feed_id} refreshed successfully"
            }
        else:
            return {"message": f"{result} feeds refreshed successfully"}
    except Exception as e:
        logger.error(f"Error refreshing feeds: {e}")
        raise HTTPException(status_code=500, detail="Error refreshing feeds")
