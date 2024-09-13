import os
import sqlite3
import json
import logging
from typing import List, Dict, Optional
from server.schemas.patient import Patient
from server.database.connection import PatientDatabase
from server.database.jobs import (
    generate_jobs_list_from_plan,
    are_all_jobs_completed,
)

db = PatientDatabase()


def get_patients_by_date(date: str) -> List[Dict]:
    """
    Retrieve patients with encounters on a specific date.

    Args:
        date (str): The encounter date to search for.

    Returns:
        List[Dict]: A list of dictionaries containing patient information.
    """
    logging.info(f"Getting patients by encounter date: {date}")
    db.cursor.execute(
        "SELECT * FROM patients WHERE encounter_date = ?", (date,)
    )
    return db.cursor.fetchall()


def get_patient_by_id(patient_id: int) -> Optional[Dict]:
    """
    Retrieve a patient by their ID.

    Args:
        patient_id (int): The ID of the patient to retrieve.

    Returns:
        Optional[Dict]: A dictionary containing patient information if found, None otherwise.
    """
    db.cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
    row = db.cursor.fetchone()
    if row is None:
        return None

    # Convert the row to a dictionary
    column_names = [description[0] for description in db.cursor.description]
    return dict(zip(column_names, row))


def save_patient(patient: Patient) -> int:
    """
    Save a new patient to the database.

    Args:
        patient (Patient): The patient object to save.

    Returns:
        int: The ID of the newly saved patient.
    """
    jobs_list = generate_jobs_list_from_plan(patient.encounter_plan)
    all_jobs_completed = are_all_jobs_completed(jobs_list)

    logging.info("Saving patient")
    db.cursor.execute(
        """
    INSERT INTO patients (
        name, dob, ur_number, gender, encounter_date, primary_history, additional_history,
        investigations, encounter_detail, impression, encounter_plan, raw_transcription,
        transcription_duration, process_duration, encounter_summary, jobs_list,
        all_jobs_completed, final_letter
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        (
            patient.name,
            patient.dob,
            patient.ur_number,
            patient.gender,
            patient.encounter_date,
            patient.primary_history,
            patient.additional_history,
            patient.investigations,
            patient.encounter_detail,
            patient.impression,
            patient.encounter_plan,
            patient.raw_transcription,
            patient.transcription_duration,
            patient.process_duration,
            patient.encounter_summary,
            json.dumps(jobs_list),
            all_jobs_completed,
            patient.final_letter,
        ),
    )
    db.commit()
    return db.cursor.lastrowid


def update_patient(patient: Patient) -> None:
    """
    Update an existing patient in the database.

    Args:
        patient (Patient): The patient object with updated information.
    """
    db.cursor.execute(
        "SELECT encounter_plan, jobs_list FROM patients WHERE id = ?",
        (patient.id,),
    )
    row = db.cursor.fetchone()

    db_encounter_plan = (
        row["encounter_plan"].strip() if row and row["encounter_plan"] else ""
    )
    patient_encounter_plan = (
        patient.encounter_plan.strip() if patient.encounter_plan else ""
    )

    if db_encounter_plan != patient_encounter_plan:
        jobs_list = generate_jobs_list_from_plan(patient.encounter_plan)
    else:
        if row and row["jobs_list"]:
            jobs_list = json.loads(row["jobs_list"])
        else:
            jobs_list = []

        if not jobs_list and patient.jobs_list:
            jobs_list = (
                json.loads(patient.jobs_list)
                if isinstance(patient.jobs_list, str)
                else patient.jobs_list
            )

        if not jobs_list and patient_encounter_plan:
            jobs_list = generate_jobs_list_from_plan(patient.encounter_plan)

    all_jobs_completed = are_all_jobs_completed(jobs_list)

    db.cursor.execute(
        """
    UPDATE patients
    SET name = ?, dob = ?, ur_number = ?, gender = ?, encounter_date = ?,
    primary_history = ?, additional_history = ?, investigations = ?,
    encounter_detail = ?, impression = ?, encounter_plan = ?,
    raw_transcription = ?, transcription_duration = ?, process_duration = ?,
    encounter_summary = ?, jobs_list = ?, all_jobs_completed = ?, final_letter = ?
    WHERE id = ?
    """,
        (
            patient.name,
            patient.dob,
            patient.ur_number,
            patient.gender,
            patient.encounter_date,
            patient.primary_history,
            patient.additional_history,
            patient.investigations,
            patient.encounter_detail,
            patient.impression,
            patient.encounter_plan,
            patient.raw_transcription,
            patient.transcription_duration,
            patient.process_duration,
            patient.encounter_summary,
            json.dumps(jobs_list),
            all_jobs_completed,
            patient.final_letter,
            patient.id,
        ),
    )
    db.commit()


def search_patient_by_ur_number(ur_number: str) -> List[Dict]:
    """
    Search for a patient by their UR number.

    Args:
        ur_number (str): The UR number to search for.

    Returns:
        List[Dict]: A list containing the patient information if found, empty list otherwise.

    Raises:
        Exception: If an error occurs during the database query.
    """
    cursor = None  # Initialize cursor variable
    try:
        print(f"Executing query for UR number: {ur_number}")
        db.cursor.execute(
            """
            SELECT * FROM patients
            WHERE ur_number = ?
            ORDER BY encounter_date DESC
            LIMIT 1
        """,
            (ur_number,),
        )
        row = db.cursor.fetchone()
        if row:
            patient = dict(row)
            encounter_date_str = patient.get("encounter_date")
            print(f"Most recent encounter: {encounter_date_str}")
            return [
                patient
            ]  # Return as a list for consistency with the original function
        else:
            print("No patient found")
            return []
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise e
    finally:
        if cursor is not None:
            db.cursor.close()  # Close the cursor only if it was created


def delete_patient_by_id(patient_id: int) -> bool:
    """
    Delete a patient from the database by their ID.

    Args:
        patient_id (int): The ID of the patient to delete.

    Returns:
        bool: True if the patient was successfully deleted.

    Raises:
        Exception: If an error occurs during the deletion process.
    """
    cursor = None  # Initialize cursor variable
    try:
        db.cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
        db.commit()  # Commit the transaction to save changes
        return True
    except Exception as e:
        raise e
    finally:
        if cursor is not None:
            db.cursor.close()  # Close the cursor only if it was created


def update_patient_letter(patient_id: int, letter: str) -> None:
    """
    Update the final letter for a patient.

    Args:
        patient_id (int): The ID of the patient.
        letter (str): The final letter content.
    """
    db.cursor.execute(
        """
    UPDATE patients
    SET final_letter = ?
    WHERE id = ?
    """,
        (letter, patient_id),
    )
    db.commit()


async def fetch_patient_letter(patient_id: int) -> Optional[str]:
    """
    Fetch the final letter for a patient.

    Args:
        patient_id (int): The ID of the patient.

    Returns:
        Optional[str]: The final letter content if found, None otherwise.
    """
    db.cursor.execute(
        """
    SELECT final_letter
    FROM patients
    WHERE id = ?
    """,
        (patient_id,),
    )
    row = db.cursor.fetchone()
    return row["final_letter"] if row else None
