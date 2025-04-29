import random
import logging
from fastapi import HTTPException
from ollama import Client as ollamaClient
from server.database.config import config_manager
from server.schemas.grammars import LetterDraft

async def generate_letter_content(
    patient_name: str,
    gender: str,
    template_data: dict,
    additional_instruction: str | None = None,
    context: list | None = None
):
    """Generates letter content using Ollama based on provided data and prompts."""
    config = config_manager.get_config()
    prompts = config_manager.get_prompts_and_options()
    client = ollamaClient(host=config["OLLAMA_BASE_URL"])

    try:
        # Always start with system messages
        request_body = [
             {
                "role": "system",
                "content": prompts["prompts"]["letter"]["system"]
            },
            {
                "role": "system",
                "content": additional_instruction or ""
            }
        ]

        # Add doctor context if available
        user_settings = config_manager.get_user_settings()
        doctor_name = user_settings.get("name", "")
        specialty = user_settings.get("specialty", "")
        if doctor_name or specialty:
            doctor_context = "Write the letter in the voice of "
            doctor_context += f"{doctor_name}, " if doctor_name else ""
            doctor_context += f"a {specialty} specialist." if specialty else "a specialist."
            request_body.append({"role": "system", "content": doctor_context})

        # Format clinic note
        clinic_note = "\n\n".join(
            f"{key.replace('_', ' ').title()}:\n{value}"
            for key, value in template_data.items()
            if value
        )

        # Always include initial patient data as first user message
        user_message = {
            "role": "user",
            "content": f"Patient Name: {patient_name}\nGender: {gender}\n\nClinic Note:\n{clinic_note}",
        }

        # Add any context from the frontend
        if context:
            context_messages = context.copy()
            request_body.extend(context_messages)

        # Check if using Qwen3 model
        model_name = config["PRIMARY_MODEL"].lower()
        thinking = ""

        if "qwen3" in model_name:
            print(f"Qwen3 model detected: {model_name}. Getting explicit thinking step.", flush=True)

            # Create a copy of request_body for the thinking step
            thinking_messages = request_body.copy()
            thinking_messages.append(user_message)
            thinking_messages.append({
                "role": "assistant",
                "content": "<think>"
            })

            # Make initial call for thinking only
            thinking_options = prompts["options"]["general"].copy()
            thinking_options["stop"] = ["</think>"]

            thinking_response = client.chat(
                model=config["PRIMARY_MODEL"],
                messages=thinking_messages,
                options=thinking_options
            )

            # Extract thinking content
            thinking = thinking_response["message"]["content"] + "</think>"

        # Add user message to the main request body
        request_body.append(user_message)

        # If we have thinking, add it to the conversation
        if thinking:
            request_body.append({
                "role": "assistant",
                "content": thinking
            })

        # Set up response format for structured output
        response_format = LetterDraft.model_json_schema()

        # Letter options
        options = prompts["options"]["general"].copy() # General options
        options["temperature"] = prompts["options"]["letter"]["temperature"] # User defined temperature

        # Generate the letter content with structured output
        response = client.chat(
            model=config["PRIMARY_MODEL"],
            messages=request_body,
            format=response_format,
            options=options
        )

        # Parse the JSON response
        letter_response = LetterDraft.model_validate_json(response["message"]["content"])


        return letter_response.content.strip()

    except Exception as e:
        logging.error(f"Error generating letter content: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error generating letter content: {e}"
        )


def _choose_random_pleasantry():
    """
    Selects a random pleasantry from a predefined list.

    Returns:
        str: A randomly chosen pleasantry.
    """
    pleasantries = [
        "Kind regards",
        "Best wishes",
        "Sincerely",
        "Warm regards",
        "Yours truly",
        "With best regards",
    ]
    return pleasantries[random.randint(0, len(pleasantries) - 1)]


def _format_name(patient_name):
    """
    Formats the patient's name from 'Last, First' to 'First Last' format.

    Args:
        patient_name (str): The patient's name in 'Last, First' format.

    Returns:
        str: The formatted name in 'First Last' format.

    Raises:
        HTTPException: If the patient name is not provided.
    """
    if not patient_name:
        raise HTTPException(status_code=400, detail="Patient name is required")

    name_parts = patient_name.split(",")
    last_name = name_parts[0].strip()
    first_name = name_parts[1].strip()
    return f"{first_name} {last_name}"
