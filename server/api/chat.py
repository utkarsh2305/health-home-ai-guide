from fastapi import APIRouter, Depends
from fastapi.exceptions import HTTPException
from server.utils.chat import ChatEngine
from server.schemas.chat import ChatRequest, ChatResponse
import logging

router = APIRouter()


def _get_chat_engine():
    return ChatEngine()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    chat_request: ChatRequest,
    chat_engine: ChatEngine = Depends(_get_chat_engine),
):
    """
    Process a chat request and return a response.

    Args:
        chat_request (ChatRequest): The incoming chat request containing messages.
        chat_engine (ChatEngine): The chat engine to process the request.

    Returns:
        ChatResponse: The response to the chat request.

    Raises:
        HTTPException: If an error occurs during processing.
    """
    try:
        logging.info("Received chat request")
        logging.debug(f"Chat request: {chat_request}")

        conversation_history = chat_request.messages

        logging.debug(f"Conversation history: {conversation_history}")

        response = chat_engine.chat(conversation_history)

        result = ChatResponse(message=response["final_answer"])

        if (
            "function_response" in response
            and response["function_response"] is not None
        ):
            result.context = {
                str(i + 1): item
                for i, item in enumerate(response["function_response"])
            }

        return result
    except Exception as e:
        logging.error(f"An error occurred: {e}")
        raise HTTPException(status_code=500, detail=str(e))
