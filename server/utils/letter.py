import random
import logging
from fastapi import HTTPException
from ollama import Client as ollamaClient
from server.database.config import config_manager


async def generate_letter_content(
    patient_name: str, primary_history: str, summary_text: str
):
    """
    Generates letter content based on patient information and summary text.

    Args:
        patient_name (str): The name of the patient in 'Last, First' format.
        primary_history (str): The patient's haematological history.
        summary_text (str): A summary text to be included in the letter.

    Returns:
        str: The generated letter content.

    Raises:
        HTTPException: If there's an error during the generation process.
    """
    config = config_manager.get_config()
    prompts = config_manager.get_prompts_and_options()
    client = ollamaClient(host=config["OLLAMA_BASE_URL"])

    try:
        formatted_name = _format_name(patient_name)
        name_parts = patient_name.split(",")
        first_name = name_parts[1].strip()

        initial_letter_content = _generate_initial_content(
            formatted_name, primary_history, first_name
        )

        request_body = [
            {
                "role": "system",
                "content": prompts["prompts"]["letter"]["system"],
            },
            {
                "role": "user",
                "content": summary_text,
            },
            {
                "role": "assistant",
                "content": initial_letter_content,
            },
        ]

        ollama_letter_response = client.chat(
            model=config["PRIMARY_MODEL"],
            messages=request_body,
            options=prompts["options"]["letter"],
        )["message"]["content"]

        random_pleasantry = _choose_random_pleasantry()
        combined_content = f"{initial_letter_content}{ollama_letter_response}\n{random_pleasantry},"

        return combined_content

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


def _generate_initial_content(formatted_name, primaryHistory, first_name):
    """
    Generates the initial content of the letter including a random opening phrase.

    Args:
        formatted_name (str): The patient's full name in 'First Last' format.
        primaryHistory (str): The patient's haematological history.
        first_name (str): The patient's first name.

    Returns:
        str: The initial content of the letter.
    """
    phrases = [
        "I reviewed <name> today",
        "I caught up with <name>",
        "<name> has been",
        "Today, I met with <name>",
        "I had a consultation with <name>",
        "I saw <name> today",
        "Following up with <name>",
        "I had the pleasure of meeting <name> today",
        "My consultation with <name> today",
        "During my appointment with <name> today",
    ]

    random_phrase = random.choice(phrases).replace("<name>", first_name)
    initial_letter_content = f"Dear Colleague,\n\nRe: {formatted_name}\n\n{primaryHistory}\n\n{random_phrase}"
    return initial_letter_content
