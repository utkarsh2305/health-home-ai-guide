from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from fastapi import FastAPI
import json

from server.api.chat import router
from server.utils.chat import ChatEngine
from server import server

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_chat_endpoint():
    with patch("server.utils.chat.ollamaClient") as mock_ollama_client, patch(
        "server.utils.chat.chromadb.PersistentClient"
    ) as mock_chroma, patch(
        "server.utils.chat.config_manager.get_config"
    ) as mock_get_config, patch(
        "server.utils.chat.config_manager.get_prompts_and_options"
    ) as mock_get_prompts:

        # Mock configurations
        mock_get_config.return_value = {
            "OLLAMA_BASE_URL": "http://mock-ollama",
            "PRIMARY_MODEL": "mock-model",
        }
        mock_get_prompts.return_value = {
            "prompts": {"chat": {"system": "You are a helpful assistant."}}
        }

        # Set up mock Ollama client
        mock_chat = MagicMock()
        mock_chat.return_value = {
            "message": {
                "content": "This is a test response from the mocked Ollama API."
            }
        }
        mock_ollama_client.return_value.chat = mock_chat

        # Set up mock ChromaDB client
        mock_chroma.return_value.list_collections.return_value = []

        # Test data
        test_request = {
            "messages": [
                {"role": "user", "content": "What is the capital of France?"}
            ]
        }

        # Make a request to your chat endpoint
        response = client.post("/chat", json=test_request)

        # Print the response for debugging
        print(f"Status Code: {response.status_code}")
        print(f"Response Content: {response.content}")

        # Assert the response
        assert (
            response.status_code == 200
        ), f"Unexpected status code: {response.status_code}, content: {response.content}"

        response_json = response.json()
        assert (
            "message" in response_json
        ), f"Unexpected response structure: {response_json}"
        assert (
            response_json["message"]
            == "This is a test response from the mocked Ollama API."
        )

        # Verify that the mock Ollama chat method was called
        mock_chat.assert_called_once()


if __name__ == "__main__":
    test_chat_endpoint()
