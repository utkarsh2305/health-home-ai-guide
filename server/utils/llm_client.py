import aiohttp
import json
import logging
from typing import Dict, List, Any, Optional, Union
from server.database.config import config_manager
from enum import Enum

logger = logging.getLogger(__name__)

class LLMProviderType(Enum):
    OLLAMA = "ollama"
    OPENAI_COMPATIBLE = "openai"

class AsyncLLMClient:
    """A unified client interface for LLM providers (Ollama, OpenAI-compatible endpoints)."""

    def __init__(self,
                 provider_type: Union[str, LLMProviderType],
                 base_url: str,
                 api_key: Optional[str] = None,
                 timeout: int = 120):
        """
        Initialize the LLM client.

        Args:
            provider_type: The provider type ("ollama" or "openai_compatible")
            base_url: Base URL for the API
            api_key: API key (required for OpenAI, optional for others)
            timeout: Request timeout in seconds
        """
        if isinstance(provider_type, str):
            try:
                self.provider_type = LLMProviderType(provider_type.lower())
            except ValueError:
                raise ValueError(f"Invalid provider type: {provider_type}. Must be 'ollama' or 'openai_compatible'")
        else:
            self.provider_type = provider_type

        self.base_url = base_url.rstrip("/")
        self.api_key = api_key or "not-needed"
        self.timeout = timeout

        # Initialize the appropriate client based on provider type
        if self.provider_type == LLMProviderType.OLLAMA:
            try:
                from ollama import AsyncClient as AsyncOllamaClient
                self._client = AsyncOllamaClient(host=self.base_url)
            except ImportError:
                raise ImportError("Ollama client not installed. Install with 'pip install ollama'")
        else:
            # For OpenAI-compatible, use the official OpenAI client
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(
                    api_key=self.api_key,
                    base_url=f"{self.base_url}/v1",  # OpenAI client expects /v1 in base_url
                    timeout=timeout
                )
            except ImportError:
                raise ImportError("OpenAI client not installed. Install with 'pip install openai'")

    async def chat(self,
                   model: str,
                   messages: List[Dict[str, str]],
                   format: Optional[Dict] = None,
                   options: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Send a chat completion request.

        Args:
            model: Model name
            messages: List of message dictionaries with 'role' and 'content'
            format: Format specification (Ollama-specific)
            options: Additional options for the model

        Returns:
            Response dictionary
        """
        if self.provider_type == LLMProviderType.OLLAMA:
            return await self._ollama_chat(model, messages, format, options)
        else:
            return await self._openai_compatible_chat(model, messages, format, options)

    async def _ollama_chat(self,
                          model: str,
                          messages: List[Dict[str, str]],
                          format: Optional[Dict] = None,
                          options: Optional[Dict] = None) -> Dict[str, Any]:
        """Send chat request to Ollama."""
        try:
            result = await self._client.chat(
                model=model,
                messages=messages,
                format=format,
                options=options
            )
            return result
        except Exception as e:
            logger.error(f"Error in Ollama chat request: {e}")
            raise

    async def _openai_compatible_chat(self,
                                    model: str,
                                    messages: List[Dict[str, str]],
                                    format: Optional[Dict] = None,
                                    options: Optional[Dict] = None) -> Dict[str, Any]:
        """Send chat request to OpenAI-compatible API using the OpenAI client."""
        try:
            # Prepare parameters for OpenAI
            params = {
                "model": model,
                "messages": messages,
            }

            # Map options from our format to OpenAI format
            if options:
                # Direct mappings
                if "temperature" in options:
                    params["temperature"] = options["temperature"]

                # Renamed mappings
                #if "num_ctx" in options:
                 #   params["max_tokens"] = options["num_ctx"]  # Closest equivalent

                # Handle stop tokens
                if "stop" in options:
                    params["stop"] = options["stop"]

            # Handle format (for JSON responses)
            if format:
                params["response_format"] = {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "field_response",
                        "schema": format
                    },
                }
            # Make the API call
            response = await self._client.chat.completions.create(**params)

            # Convert to Ollama-like format for consistency
            return {
                "model": model,
                "message": {
                    "role": "assistant",
                    "content": response.choices[0].message.content
                }
            }
        except Exception as e:
            logger.error(f"Error in OpenAI-compatible chat request: {e}")
            raise

def get_llm_client():
    """Create and return an LLM client with configuration from config manager."""
    config = config_manager.get_config()
    provider_type = config.get("LLM_PROVIDER", "ollama").lower()
    base_url = config.get("LLM_BASE_URL")
    api_key = config.get("LLM_API_KEY", None)

    return AsyncLLMClient(
        provider_type=provider_type,
        base_url=base_url,
        api_key=api_key
    )
