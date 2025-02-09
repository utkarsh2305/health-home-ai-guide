# server/utils/helpers.py
from datetime import datetime
from ollama import AsyncClient
from server.schemas.patient import Patient, Condition
from server.database.config import config_manager
import logging
import asyncio
from pydantic import BaseModel
from typing import Optional


async def summarize_encounter(patient: Patient) -> tuple[str, Optional[str]]:
    """
    Summarize a patient encounter and extract the primary condition asynchronously.

    Args:
        patient (Patient): A Patient object containing relevant encounter information.

    Returns:
        tuple[str, Optional[str]]: A tuple containing the summarized description and the extracted condition.

    Raises:
        ValueError: If DOB or Encounter Date is missing from the patient data.
    """

    config = config_manager.get_config()
    prompts = config_manager.get_prompts_and_options()

    client = AsyncClient(host=config["OLLAMA_BASE_URL"])

    if not patient.dob or not patient.encounter_date:
        raise ValueError("DOB or Encounter Date is missing")

    template_values = []
    for field_key, field_value in patient.template_data.items():
        if field_value:
            template_values.append(field_value)

    combined_text = "\n\n".join(template_values)

    age = calculate_age(patient.dob, patient.encounter_date)
    initial_summary_content = (
        f"{age} year old {'male' if patient.gender == 'M' else 'female'} with"
    )

    summary_request_body = [
        {"role": "system", "content": prompts["prompts"]["summary"]["system"]},
        {"role": "user", "content": combined_text},
        {"role": "assistant", "content": initial_summary_content},
    ]

    condition_request_body = [
        {
            "role": "system",
            "content": "You are a medical AI that is skilled at extracting the primary diagnosis for a medical encounter. You should return a JSON formatted string that has a singular field called `condition_name` that represents the primary problem according to the ICD-10 WHO classifications",
        },
        {
            "role": "user",
            "content": f"Patient note: {combined_text}. Please provide the primary condition they are being treated for according to the WHO ICD-10 classification. Please do not include the ICD code, rather, just respond with the common name of the condition.",
        },
    ]

    async def fetch_summary():

        response = await client.chat(
            model=config["SECONDARY_MODEL"],
            messages=summary_request_body,
            options=prompts["options"]["secondary"],
        )
        summary_content = response["message"]["content"]

        # Truncate at the first empty line
        summary_content = summary_content.split("\n\n")[0]
        logging.info(f"Summary content: {summary_content}")

        return initial_summary_content + summary_content

    async def fetch_condition():
        response = await client.chat(
            model=config["SECONDARY_MODEL"],
            messages=condition_request_body,
            format=Condition.model_json_schema(),
            options=prompts["options"]["secondary"],
        )
        try:
            condition_response = Condition.model_validate_json(
                response["message"][
                    "content"
                ]
            )

            condition_name = condition_response.condition_name

            logging.info(f"Condition: {condition_name}")
            return condition_name
        except Exception as e:
            logging.error(
                f"Error extracting condition: {e}, response content:{response['message']['content']}"
            )
            return None

    summary, condition = await asyncio.gather(
        fetch_summary(), fetch_condition()
    )

    return summary, condition


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
