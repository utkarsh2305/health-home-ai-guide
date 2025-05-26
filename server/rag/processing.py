import fitz  # PyMuPDF
from .semantic_chunker import ClusterSemanticChunker
import chromadb
from chromadb.config import Settings
import os
import asyncio
from server.database.config import config_manager
from server.schemas.grammars import ClinicalSuggestionList
from server.utils.llm_client import get_llm_client

# Initialize ConfigManager
config = config_manager.get_config()
prompts = config_manager.get_prompts_and_options()


# Function to process all PDFs in a given directory
async def process_pdfs_in_directory(directory_path):
    """Processes all PDFs in a given directory."""
    for filename in os.listdir(directory_path):
        if filename.endswith(".pdf"):
            pdf_path = os.path.join(directory_path, filename)
            await process_single_pdf(pdf_path)


async def extract_pdf_information(pdf_path):
    """Extracts information from a PDF given its path."""
    global extracted_text_store
    extracted_text_store = None
    filename = os.path.basename(pdf_path)
    extracted_text = extract_text_from_pdf(pdf_path)
    extracted_text_store = extracted_text

    collection_names = chroma_client.list_collections()
    collection_names_string = ", ".join(collection_names)

    words = extracted_text.split()
    sample_text = " ".join(words[:500])

    # Initialize the LLM client
    client = get_llm_client()

    # Check if using a model that requires the thinking step
    model_name = config["PRIMARY_MODEL"].lower()
    uses_thinking_step = "qwen3" in model_name

    disease_question_options = {
        **prompts["options"]["chat"],  # Unpack the chat options
        "stop": [".", "(", "\n", "/"],  # Add the stop tokens
    }

    # Helper function for handling thinking step
    async def process_with_thinking(messages, options=None, completion_prompt=None):
        """
        Process a request with or without thinking step based on model.

        Args:
            messages (list): The message list for the chat
            options (dict, optional): Custom options for the API call
            completion_prompt (str, optional): Text to add to assistant's response to complete it

        Returns:
            dict: The response from the LLM
        """
        if options is None:
            options = disease_question_options.copy()

        if not uses_thinking_step:
            # For models that don't need thinking step
            if completion_prompt:
                messages.append({"role": "assistant", "content": completion_prompt})
            return await client.chat(
                model=config["PRIMARY_MODEL"],
                messages=messages,
                options=options,
            )

        # For models that use thinking step
        thinking_messages = messages.copy()
        thinking_messages.append({
            "role": "assistant",
            "content": "<think>"
        })

        thinking_options = options.copy()
        thinking_options["stop"] = ["</think>"]

        thinking_response = await client.chat(
            model=config["PRIMARY_MODEL"],
            messages=thinking_messages,
            options=thinking_options
        )

        thinking = "<think>" + thinking_response["message"]["content"] + "</think>"

        # Complete message with thinking
        complete_messages = messages.copy()
        complete_messages.append({
            "role": "assistant",
            "content": thinking
        })

        if completion_prompt:
            complete_messages.append({"role": "assistant", "content": completion_prompt})

        return await client.chat(
            model=config["PRIMARY_MODEL"],
            messages=complete_messages,
            options=options,
        )

    # Disease question processing
    initial_messages = [
        {
            "role": "system",
            "content": prompts["prompts"]["chat"]["system"],
        },
        {
            "role": "user",
            "content": f"{sample_text}\n\nIs the above block of specifically addressing any of the following list of diseases? {collection_names_string}\nAnswer Yes or No.",
        },
    ]

    disease_question = await process_with_thinking(initial_messages)
    disease_answer = disease_question["message"]["content"].strip()
    sanitized_disease_answer = disease_answer.lower().replace(" ", "_")

    if sanitized_disease_answer == "yes":
        # Initial messages for "Yes" path
        initial_messages = [
            {
                "role": "system",
                "content": prompts["prompts"]["chat"]["system"],
            },
            {
                "role": "user",
                "content": f"{sample_text}\n\nIs the above block of text *primaryily* related to any of the following list of diseases? {collection_names_string}\nAnswer Yes or No.",
            },
            {
                "role": "assistant",
                "content": "Yes",
            },
            {
                "role": "user",
                "content": f"Here is the list again:\n{collection_names_string}\nRespond only with the disease name as it appears in that list.",
            },
        ]

        disease_choice = await process_with_thinking(initial_messages, completion_prompt="The disease is:")
        disease_choice_response = disease_choice["message"]["content"].strip()
        disease_name = disease_choice_response.lower().replace(" ", "_")
    else:
        # Initial messages for "No" path
        initial_messages = [
            {
                "role": "system",
                "content": prompts["prompts"]["chat"]["system"],
            },
            {
                "role": "user",
                "content": f"{sample_text}\n\nIs the above block of text related to any of the following list of diseases? {collection_names_string}\nAnswer Yes or No.",
            },
            {
                "role": "assistant",
                "content": "No",
            },
            {
                "role": "user",
                "content": f"{sample_text}\n\nWhat is the disease that the above block of text is referring to? Answer only with the name of the disease in American English, do not use acronyms. If there is more than one disease, then respond with only the name of the main disease of the text.",
            },
        ]

        disease_choice = await process_with_thinking(initial_messages, completion_prompt="The disease is:")
        disease_choice_response = disease_choice["message"]["content"].strip()
        disease_name = disease_choice_response.lower().replace(" ", "_")

    # Focus area determination
    focus_area_messages = [
        {
            "role": "system",
            "content": prompts["prompts"]["chat"]["system"],
        },
        {
            "role": "user",
            "content": f"{sample_text}\n\nIs the block of text focused on guidelines, diagnosis, treatment, epidemiology, pathophysiology, prognosis, clinical features, prevention, or miscellaneous? (answer only with one word)",
        },
    ]

    focus_area_response = await process_with_thinking(focus_area_messages)
    focus_area = (
        focus_area_response["message"]["content"]
        .strip()
        .lower()
        .replace(" ", "_")
    )

    # Document source selection
    existing_sources = list_sources_from_all_collections()
    existing_sources_string = ", ".join(existing_sources)

    source_question_messages = [
        {
            "role": "system",
            "content": prompts["prompts"]["chat"]["system"],
        },
        {
            "role": "user",
            "content": f"{sample_text}\n\nIs the source of this document one of the following? {existing_sources_string}\nAnswer Yes or No.",
        },
    ]

    document_source_question = await process_with_thinking(source_question_messages)
    source_answer = (
        document_source_question["message"]["content"].strip().lower()
    )

    if source_answer == "yes":
        # Initial messages for "Yes" source path
        initial_messages = [
            {
                "role": "system",
                "content": prompts["prompts"]["chat"]["system"],
            },
            {
                "role": "user",
                "content": f"{sample_text}\n\nWhich of the following sources is this document from? {existing_sources_string}\nRespond only with the source name as it appears in that list.",
            },
        ]

        document_source_choice = await process_with_thinking(initial_messages, completion_prompt="The source is:")
        document_source = (
            document_source_choice["message"]["content"]
            .strip()
            .lower()
            .replace(" ", "_")
        )
    else:
        # Initial messages for "No" source path
        initial_messages = [
            {
                "role": "system",
                "content": prompts["prompts"]["chat"]["system"],
            },
            {
                "role": "user",
                "content": f"{sample_text}\n\nWhat is the source of this document? Only give the name, no other commentary.",
            },
        ]

        document_source_response = await process_with_thinking(initial_messages)
        document_source = (
            document_source_response["message"]["content"]
            .strip()
            .lower()
            .replace(" ", "_")
        )

    return disease_name, focus_area, document_source, filename


async def generate_specialty_suggestions():
    """Generate RAG chat suggestions based on user's specialty from DB."""
    try:
        # Get user settings from DB
        user_settings = config_manager.get_user_settings()
        specialty = user_settings.get("specialty", "General Practice")

        # Get config and prompts
        config = config_manager.get_config()
        prompts = config_manager.get_prompts_and_options()

        # Initialize the LLM client
        client = get_llm_client()

        suggestion_prompt = f"""As an expert in {specialty}, generate 3 brief, focused clinical questions that are 4-5 words long.

        Rules:
        - Each question MUST be 5-6 words only
        - Be specific and concise
        - Use common medical abbreviations when appropriate

        Examples of good questions:
        - "What are the ET diagnostic criteria?"
        - "Best treatment for severe sepsis?"
        - "What's the diagnostic approach for RA?"

        Format your response as structured JSON matching this schema:
        {{
            "suggestions": [
                {{
                    "question": "string",
                }}
            ]
        }}"""

        # Check if using Qwen3 model
        model = config["SECONDARY_MODEL"]
        model_name = model.lower()
        is_qwen3 = "qwen3" in model_name

        # Add /no_think for Qwen3 models
        if is_qwen3:
            suggestion_prompt = f"{suggestion_prompt} /no_think"

        messages = [
            {
                "role": "system",
                "content": "You are a medical education assistant. Keep all responses extremely concise.",
            },
            {"role": "user", "content": suggestion_prompt},
        ]

        # For Qwen3 models, add empty think tags
        if is_qwen3:
            messages.append({"role": "assistant", "content": "<think>\n</think>"})

        response = await client.chat(
            model=model,
            messages=messages,
            format=ClinicalSuggestionList.model_json_schema(),
            options={
                **prompts["options"]["secondary"],
                "temperature": "0.7",
            },
        )

        suggestions = ClinicalSuggestionList.model_validate_json(
            response["message"]["content"]
        )

        return [s.question for s in suggestions.suggestions]

    except Exception as e:
        print(f"Error generating suggestions: {str(e)}")
        return [
            "How to diagnose lupus?",
            "Best treatment for pneumonia?",
            "When to start antibiotics?",
        ]
