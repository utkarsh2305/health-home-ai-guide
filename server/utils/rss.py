import httpx
import json
import logging
from typing import Dict, List, Union, Any
import feedparser
from datetime import datetime
from server.schemas.dashboard import RssItem
from server.database.config import config_manager
from server.utils.llm_client import get_llm_client
from server.schemas.grammars import NewsDigest, ItemDigest

logger = logging.getLogger(__name__)

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


async def generate_item_digest(item: RssItem) -> str:
    """
    Generates a digest for an RSS item using LLM.

    Args:
        item (RssItem): The RSS item to generate a digest for.

    Returns:
        str: The generated digest.
    """
    try:
        config = config_manager.get_config()
        client = get_llm_client()
        model = config["SECONDARY_MODEL"]
        options = config_manager.get_prompts_and_options()["options"]["secondary"]

        system_prompt = """You are a medical news summarizer. Your task is to summarize medical news articles in a concise, informative way for healthcare professionals. Focus on clinical relevance, key findings, and implications for practice. Keep summaries objective and factual."""

        user_prompt = f"""Summarize this medical article in 1-2 concise sentences that highlight the key finding or clinical implication:

        Title: {item.title}
        Source: {item.feed_title}
        Content: {item.description}"""

        # Check if using Qwen3 model
        model_name = model.lower()
        is_qwen3 = "qwen3" in model_name

        # Create response format
        response_format = ItemDigest.model_json_schema()

        if is_qwen3:
            logger.info(f"Qwen3 model detected: {model_name}. Using thinking step for item digest.")

            # First, get the thinking step
            thinking_messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
                {"role": "assistant", "content": "<think>"}
            ]

            # Create thinking-specific options that stop at </think>
            thinking_options = options.copy()
            thinking_options["stop"] = ["</think>"]

            # Get the thinking content
            thinking_response = await client.chat(
                model=model,
                messages=thinking_messages,
                options=thinking_options
            )

            # Extract thinking content
            thinking = thinking_response["message"]["content"]

            # Now make the full request with the thinking included
            full_messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
                {"role": "assistant", "content": f"<think>{thinking}</think>"}
            ]

            # Get the final response with structured format
            response = await client.chat(
                model=model,
                messages=full_messages,
                format=response_format,
                options=options
            )
        else:
            # Standard approach for other models
            request_body = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            response = await client.chat(
                model=model,
                messages=request_body,
                format=response_format,
                options=options
            )

        content = response["message"]["content"].strip()

        try:
            # Try to parse as JSON
            digest_data = ItemDigest.model_validate_json(content)
            return digest_data.digest
        except Exception as e:
            logger.warning(f"Failed to parse item digest response as JSON: {e}")
            # Just use content as is
            return content

    except Exception as e:
        logger.error(f"Error generating item digest: {e}")
        return "Unable to generate digest."

async def generate_combined_digest(articles: List[Dict[str, str]]) -> str:
    """
    Generates a combined digest for multiple articles using LLM.

    Args:
        articles (List[Dict[str, str]]): List of articles to generate a digest for.

    Returns:
        str: The generated combined digest.
    """
    if not articles:
        return "No recent medical news available."

    try:
        config = config_manager.get_config()
        client = get_llm_client()
        model = config["PRIMARY_MODEL"]
        options = config_manager.get_prompts_and_options()["options"]["general"]

        system_prompt = """You are a medical news curator for busy healthcare professionals. Your task is to create a concise digest of recent medical news articles, highlighting their clinical significance. Focus on what's most relevant to medical practice."""

        # Format articles for the prompt
        article_text = ""
        for i, article in enumerate(articles, 1):
            article_text += f"Article {i}:\nTitle: {article['title']}\nSource: {article.get('feed_title', 'Unknown')}\nDescription: {article['description']}\n\n"

        user_prompt = f"""Create a concise digest of these recent medical news articles in 3-4 sentences total. Focus on clinical implications and highlight the most important findings across all articles:

        {article_text}"""

        # Check if using Qwen3 model
        model_name = model.lower()
        is_qwen3 = "qwen3" in model_name

        # Create response format
        response_format = NewsDigest.model_json_schema()

        if is_qwen3:
            logger.info(f"Qwen3 model detected: {model_name}. Using thinking step for combined digest.")

            # First, get the thinking step
            thinking_messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
                {"role": "assistant", "content": "<think>"}
            ]

            # Create thinking-specific options that stop at </think>
            thinking_options = options.copy()
            thinking_options["stop"] = ["</think>"]

            # Get the thinking content
            thinking_response = await client.chat(
                model=model,
                messages=thinking_messages,
                options=thinking_options
            )

            # Extract thinking content
            thinking = thinking_response["message"]["content"]

            # Now make the full request with the thinking included
            full_messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
                {"role": "assistant", "content": f"<think>{thinking}</think>"}
            ]

            # Get the final response with structured format
            response = await client.chat(
                model=model,
                messages=full_messages,
                format=response_format,
                options=options
            )
        else:
            # Standard approach for other models
            request_body = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            response = await client.chat(
                model=model,
                messages=request_body,
                format=response_format,
                options=options
            )

        content = response["message"]["content"].strip()

        try:
            # Try to parse as JSON
            digest_data = NewsDigest.model_validate_json(content)
            return digest_data.digest
        except Exception as e:
            logger.warning(f"Failed to parse combined digest response as JSON: {e}")
            # Just use content as is
            return content

    except Exception as e:
        logger.error(f"Error generating combined digest: {e}")
        return "Unable to generate digest of recent medical news."


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
