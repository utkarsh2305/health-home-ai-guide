import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from server.utils.transcription import (
    transcribe_audio,
    process_transcription,
    _summarize_transcript,
    _refine_summary,
)


@pytest.fixture
def mock_config():
    return {
        "WHISPER_MODEL": "base",
        "WHISPER_BASE_URL": "http://mock-whisper-url/",
        "OLLAMA_BASE_URL": "http://mock-ollama-url/",
        "PRIMARY_MODEL": "llama2",
    }


@pytest.fixture
def mock_prompts():
    return {
        "prompts": {
            "clinicalHistory": {
                "system": "System prompt",
                "initial": "Initial prompt",
            },
            "plan": {"system": "System prompt", "initial": "Initial prompt"},
            "refinement": {
                "system": "Refinement system prompt",
                "clinicalHistoryInitial": "Initial clinical history",
                "planInitial": "Initial plan",
            },
        },
        "options": {"general": {}},
    }


@pytest.mark.asyncio
async def test_transcribe_audio(mock_config):
    with patch(
        "server.utils.transcription.config_manager.get_config",
        return_value=mock_config,
    ):
        with patch("aiohttp.ClientSession.post") as mock_post:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json.return_value = {"text": "Mocked transcription"}
            mock_post.return_value.__aenter__.return_value = mock_response

            result = await transcribe_audio(b"mock audio data")

            assert "text" in result
            assert "transcriptionDuration" in result
            assert isinstance(result["text"], str)
            assert isinstance(result["transcriptionDuration"], float)


@pytest.mark.asyncio
async def test_process_transcription(mock_config, mock_prompts):
    with patch(
        "server.utils.transcription.config_manager.get_config",
        return_value=mock_config,
    ), patch(
        "server.utils.transcription.config_manager.get_prompts_and_options",
        return_value=mock_prompts,
    ), patch(
        "server.utils.transcription.AsyncOllamaClient"
    ) as MockAsyncOllamaClient:
        mock_client = AsyncMock()
        mock_client.chat.return_value = {
            "message": {"content": "Mocked content"}
        }
        MockAsyncOllamaClient.return_value = mock_client

        result = await process_transcription(
            "Mock transcript", "John Doe", "1990-01-01", "M"
        )

        assert len(result) == 3
        assert all(isinstance(item, str) for item in result[:2])
        assert isinstance(result[2], float)


@pytest.mark.asyncio
async def test_summarize_transcript(mock_config, mock_prompts):
    with patch(
        "server.utils.transcription.config_manager.get_config",
        return_value=mock_config,
    ), patch(
        "server.utils.transcription.config_manager.get_prompts_and_options",
        return_value=mock_prompts,
    ), patch(
        "server.utils.transcription.AsyncOllamaClient"
    ) as MockAsyncOllamaClient:
        mock_client = AsyncMock()
        mock_client.chat.return_value = {
            "message": {"content": "Mocked summary"}
        }
        MockAsyncOllamaClient.return_value = mock_client

        result = await _summarize_transcript(
            "Mock transcript", "clinicalHistory", "John Doe", "1990-01-01", "M"
        )

        assert isinstance(result, str)


@pytest.mark.asyncio
async def test_refine_summary(mock_config, mock_prompts):
    with patch(
        "server.utils.transcription.config_manager.get_config",
        return_value=mock_config,
    ), patch(
        "server.utils.transcription.config_manager.get_prompts_and_options",
        return_value=mock_prompts,
    ), patch(
        "server.utils.transcription.AsyncOllamaClient"
    ) as MockAsyncOllamaClient:
        mock_client = AsyncMock()
        mock_client.chat.return_value = {
            "message": {"content": "Mocked refined summary"}
        }
        MockAsyncOllamaClient.return_value = mock_client

        result = await _refine_summary("Mock summary", "clinicalHistory")

        assert isinstance(result, str)
