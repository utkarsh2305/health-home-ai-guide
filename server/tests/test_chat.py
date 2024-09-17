import pytest
from unittest.mock import Mock, patch
from server.utils.chat import ChatEngine
from server.schemas.chat import ChatRequest, ChatResponse


@pytest.fixture
def chat_engine():
    return ChatEngine()


def test_chat_engine_initialization(chat_engine):
    assert isinstance(chat_engine, ChatEngine)
    assert chat_engine.BASE_URL == chat_engine.config["OLLAMA_BASE_URL"]


@patch("server.utils.chat.ollamaClient")
@patch("server.utils.chat.chromadb.PersistentClient")
def test_chat_simple_response(mock_chroma, mock_ollama, chat_engine):
    mock_ollama.return_value.chat.return_value = {
        "message": {"content": "This is a test response."}
    }

    conversation_history = [{"role": "user", "content": "Hello, how are you?"}]

    response = chat_engine.chat(conversation_history)

    assert isinstance(response, dict)
    assert "final_answer" in response
    assert isinstance(response["final_answer"], str)
    assert len(response["final_answer"]) > 0


def test_sanitizer(chat_engine):
    assert chat_engine.sanitizer("Type 2 Diabetes") == "type_2_diabetes"
    assert (
        chat_engine.sanitizer("Heart Disease (Cardiovascular)")
        == "heart_disease"
    )
