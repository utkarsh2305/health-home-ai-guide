from datetime import datetime
from ollama import Client as ollamaClient
from server.schemas.patient import Patient
from server.database.config import config_manager
import logging


async def summarize_encounter(patient: Patient) -> str:
    """
    Summarize a patient encounter based on provided patient information.

    Args:
        patient (Patient): A Patient object containing relevant encounter information.

    Returns:
        str: A summarized description of the patient encounter.

    Raises:
        ValueError: If DOB or Encounter Date is missing from the patient data.
    """
    logging.info("Received summarisation request")
    config = config_manager.get_config()
    prompts = config_manager.get_prompts_and_options()

    client = ollamaClient(host=config["OLLAMA_BASE_URL"])

    if not patient.dob or not patient.encounter_date:
        raise ValueError("DOB or Encounter Date is missing")

    combined_text = "\n\n".join(
        [
            patient.primary_history,
            patient.additional_history,
            patient.investigations,
            patient.encounter_detail,
            patient.impression,
            patient.encounter_plan,
        ]
    )
    age = calculate_age(patient.dob, patient.encounter_date)
    initial_summary_content = (
        f"{age} year old {'male' if patient.gender == 'M' else 'female'} with"
    )

    request_body = [
        {"role": "system", "content": prompts["prompts"]["summary"]["system"]},
        {"role": "user", "content": combined_text},
        {"role": "assistant", "content": initial_summary_content},
    ]

    summary_content = client.chat(
        model=config["SECONDARY_MODEL"],
        messages=request_body,
        options=prompts["options"]["general"],
    )["message"]["content"]

    # Truncate at the first empty line
    summary_content = summary_content.split("\n\n")[0]
    logging.debug(f"Summary content: {summary_content}")

    return initial_summary_content + summary_content


def calculate_age(dob: str, encounter_date: str = None) -> int:
    """
    Calculate the age of a patient at the time of encounter or current date.

    Args:
        dob (str): Date of birth in 'YYYY-MM-DD' format.
        encounter_date (str, optional): Date of encounter in 'YYYY-MM-DD' format.
            If not provided, current date is used.

    Returns:
        int: The calculated age in years.

    Raises:
        ValueError: If DOB is missing or in an invalid format.
    """
    if not dob:
        raise ValueError("DOB is missing")

    try:
        birth_date = datetime.strptime(dob, "%Y-%m-%d")
        encounter_date_obj = (
            datetime.strptime(encounter_date, "%Y-%m-%d")
            if encounter_date
            else datetime.today()
        )
    except ValueError:
        raise ValueError("Invalid date format. Use 'YYYY-MM-DD'.")

    age = encounter_date_obj.year - birth_date.year
    if (encounter_date_obj.month, encounter_date_obj.day) < (
        birth_date.month,
        birth_date.day,
    ):
        age -= 1

    return age
