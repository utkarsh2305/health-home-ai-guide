import chromadb
from chromadb.config import Settings
from chromadb.utils.embedding_functions import OllamaEmbeddingFunction
from ollama import Client as ollamaClient
import re
from server.database.config import config_manager


class ChatEngine:
    """
    A class to manage chat interactions, including retrieving relevant medical literature
    and generating responses using an AI model.
    """

    def __init__(self):
        """
        Initialize the ChatEngine with necessary configurations, clients, and models.
        """
        self.config = config_manager.get_config()
        self.prompts = config_manager.get_prompts_and_options()
        self.CHAT_SYSTEM_MESSAGE = [
            {
                "role": "system",
                "content": self.prompts["prompts"]["chat"]["system"],
            }
        ]
        self.BASE_URL = self.config["OLLAMA_BASE_URL"]
        self.ollama_client = ollamaClient(host=self.BASE_URL)
        self.chroma_client = self._initialize_chroma_client()
        self.embedding_model = self._initialize_embedding_model()
        self.last_successful_collection = "misc"

    def _initialize_chroma_client(self):
        """
        Initialize and return a ChromaDB client.

        Returns:
            chromadb.PersistentClient: An instance of the ChromaDB client.
        """
        return chromadb.PersistentClient(
            path="/usr/src/app/data/chroma",
            settings=Settings(anonymized_telemetry=False),
        )

    def _initialize_embedding_model(self):
        """
        Initialize and return an Ollama embedding model.

        Returns:
            OllamaEmbeddingFunction: An instance of the Ollama embedding model.
        """
        return OllamaEmbeddingFunction(
            url=f"{self.BASE_URL}/api/embeddings",
            model_name="mxbai-embed-large:latest",
        )

    def sanitizer(self, disease_name: str) -> str:
        """
        Sanitize the disease name for use as a collection name.

        Args:
            disease_name (str): The raw disease name.

        Returns:
            str: The sanitized disease name.
        """
        return (
            re.sub(r"[.\(\n/].*", "", disease_name.lower().replace(" ", "_"))
            .rstrip("_")
            .strip()
        )

    def get_relevant_literature(self, disease_name: str, question: str) -> str:
        """
        Retrieve relevant literature for a given disease and question.

        Args:
            disease_name (str): The name of the disease.
            question (str): The question to search for in the literature.

        Returns:
            str: Relevant literature excerpts or a message if no literature is found.
        """
        print(disease_name)
        collections = self.chroma_client.list_collections()
        collection_names = [collection.name for collection in collections]

        sanitized_disease_name = self.sanitizer(disease_name)

        if sanitized_disease_name in collection_names:
            print("Relevant collection exists")
            try:
                collection = self.chroma_client.get_collection(
                    name=sanitized_disease_name,
                    embedding_function=self.embedding_model,
                )
                context = collection.query(
                    query_texts=[question],
                    n_results=6,
                    include=["documents", "metadatas"],
                )
                print("Relevant context found")
            except Exception as e:
                print("No relevant literature available")
                return "No relevant literature available"

            output_strings = []
            for i, doc_list in enumerate(context["documents"]):
                for j, doc in enumerate(doc_list):
                    source = context["metadatas"][i][j]["source"]
                    formatted_source = source.replace("_", " ").title()
                    cleaned_doc = doc.strip().replace("\n", " ")
                    output_strings.append(
                        f'According to {formatted_source}:\n\n"...{cleaned_doc}..."\n'
                    )

            return output_strings
        else:
            return "No relevant literature available"

    def get_response(self, conversation_history: list) -> dict:
        """
        Generate a response based on the conversation history and relevant literature.

        Args:
            conversation_history (list): A list of previous messages in the conversation.

        Returns:
            dict: A dictionary containing the final answer and optionally the function response.
        """
        collections = self.chroma_client.list_collections()
        collection_names = [collection.name for collection in collections]
        collection_names_string = ", ".join(collection_names)

        disease_question_options = {
            "temperature": 0.1,
            "num_ctx": 2048,
            "stop": [".", "(", "\n", "/"],
        }

        context_question_options = {"temperature": 0.1, "num_ctx": 2048}

        message_list = self.CHAT_SYSTEM_MESSAGE + conversation_history

        response = self.ollama_client.chat(
            model=self.config["PRIMARY_MODEL"],
            messages=message_list,
            tools=[
                {
                    "type": "function",
                    "function": {
                        "name": "get_relevant_literature",
                        "description": f"Get the relevant medical literature (only use if appropriate to answer the most recent question, otherwise just answer the question without reference to these tools and functions). Available disease areas:{collection_names_string}",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "disease_name": {
                                    "type": "string",
                                    "description": f"The disease that this question is referring to (must be one of: {collection_names_string}, other)",
                                },
                                "question": {
                                    "type": "string",
                                    "description": "The question to be answered. Try and be specific.",
                                },
                            },
                            "required": ["disease_name", "question"],
                        },
                    },
                },
            ],
        )

        if not response["message"].get("tool_calls"):
            final_answer = response["message"]["content"]
            function_response = None
        else:
            available_functions = {
                "get_relevant_literature": self.get_relevant_literature
            }
            for tool in response["message"]["tool_calls"]:
                function_to_call = available_functions[tool["function"]["name"]]
                function_response_list = function_to_call(
                    tool["function"]["arguments"]["disease_name"],
                    tool["function"]["arguments"]["question"],
                )
                function_response_string = "\n".join(function_response_list)
                if function_response_list == "No relevant literature available":
                    context_response = {
                        "role": "tool",
                        "content": "No relevant literature available in the database. Answer the user's question but inform them that you were unable to find any relevant information.",
                    }
                    temp_conversation_history = conversation_history + [
                        context_response
                    ]
                    context_answer = self.ollama_client.chat(
                        model=self.config["PRIMARY_MODEL"],
                        messages=temp_conversation_history,
                        options=context_question_options,
                    )
                    final_answer = context_answer["message"]["content"]
                    function_response = None
                else:
                    context_response = {
                        "role": "tool",
                        "content": f"The below text is taken from a relevant section of the guidelines.\n\n{function_response_string}",
                    }
                    temp_conversation_history = conversation_history + [
                        context_response
                    ]
                    context_answer = self.ollama_client.chat(
                        model=self.config["PRIMARY_MODEL"],
                        messages=temp_conversation_history,
                        options=context_question_options,
                    )
                    final_answer = context_answer["message"]["content"]
                    function_response = function_response_list

        if function_response is not None:
            return {
                "final_answer": final_answer,
                "function_response": function_response,
            }
        else:
            return {"final_answer": final_answer}

    def chat(self, conversation_history: list) -> dict:
        return self.get_response(conversation_history)


# Usage
def main():
    """
    Main interface for chat interactions.

    Args:
        conversation_history (list): A list of previous messages in the conversation.

    Returns:
        dict: The response from get_response method.
    """
    chat_engine = ChatEngine()
    conversation_history = [
        {"role": "user", "content": "What are the symptoms of diabetes?"}
    ]
    response = chat_engine.chat(conversation_history)
    print(response)


if __name__ == "__main__":
    main()
