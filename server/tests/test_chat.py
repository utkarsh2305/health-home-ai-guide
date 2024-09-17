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
    # Mock the Ollama client response
    mock_ollama.return_value.chat.return_value = {
        "message": {"content": "This is a test response."}
    }

    conversation_history = [{"role": "user", "content": "Hello, how are you?"}]

    response = chat_engine.chat(conversation_history)

    assert isinstance(response, dict)
    assert "final_answer" in response
    assert response["final_answer"] == "This is a test response."


@patch("server.utils.chat.ollamaClient")
@patch("server.utils.chat.chromadb.PersistentClient")
def test_chat_with_literature(mock_chroma, mock_ollama, chat_engine):
    # Mock the Ollama client responses
    mock_ollama.return_value.chat.side_effect = [
        {
            "message": {
                "tool_calls": [
                    {
                        "function": {
                            "name": "get_relevant_literature",
                            "arguments": '{"disease_name": "diabetes", "question": "What are the symptoms?"}',
                        }
                    }
                ]
            }
        },
        {
            "message": {
                "content": "Symptoms of diabetes include increased thirst and frequent urination."
            }
        },
    ]

    # Mock the ChromaDB response
    mock_chroma.return_value.list_collections.return_value = [
        Mock(name="diabetes")
    ]
    mock_chroma.return_value.get_collection.return_value.query.return_value = {
        "documents": [
            [
                "Diabetes symptoms include increased thirst and frequent urination."
            ]
        ],
        "metadatas": [[{"source": "medical_journal"}]],
    }

    conversation_history = [
        {"role": "user", "content": "What are the symptoms of diabetes?"}
    ]

    response = chat_engine.chat(conversation_history)

    assert isinstance(response, dict)
    assert "final_answer" in response
    assert "function_response" in response
    assert "Symptoms of diabetes" in response["final_answer"]


def test_sanitizer(chat_engine):
    assert chat_engine.sanitizer("Type 2 Diabetes") == "type_2_diabetes"
    assert (
        chat_engine.sanitizer("Heart Disease (Cardiovascular)")
        == "heart_disease"
    )
