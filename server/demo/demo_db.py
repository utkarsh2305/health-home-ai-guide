import sys
import os
import json
import datetime
import random

# Add the parent directory of 'server' to the Python path
sys.path.append("/usr/src/app")

from server.database.connection import PatientDatabase
from server.schemas.patient import Patient

# Get the directory of the current script
current_dir = os.path.dirname(os.path.abspath(__file__))

# Create an instance of PatientDatabase
patient_db = PatientDatabase()


def generate_jobs_list_from_plan(plan):
    jobs = [
        item.strip()
        for item in plan.split("\n")
        if item.strip() and item.strip()[0].isdigit()
    ]
    jobs_list = [
        {"id": index + 1, "job": job, "completed": False}
        for index, job in enumerate(jobs)
    ]
    return jobs_list


def clear_database():
    print("Clearing existing database...")
    patient_db.cursor.execute("DELETE FROM patients")
    patient_db.db.commit()
    print("Database cleared.")


def initialize_fake_patients():
    today = datetime.date.today()
    yesterday = today - datetime.timedelta(days=1)

    json_file_path = os.path.join(current_dir, "example_patients.json")

    with open(json_file_path, "r") as f:
        data = json.load(f)

    fake_patients = []

    encounter_dates = [today] * 10 + [yesterday] * 10
    random.shuffle(encounter_dates)

    for patient_data, encounter_date in zip(data["patients"], encounter_dates):
        patient = {
            "name": patient_data["name"],
            "dob": patient_data["dob"],
            "ur_number": patient_data["ur_number"],
            "gender": patient_data["gender"],
            "encounter_date": encounter_date.strftime("%Y-%m-%d"),
            "primary_history": patient_data["primary_history"],
            "additional_history": patient_data["oahp"],
            "investigations": patient_data["investigations"],
            "encounter_detail": patient_data["clinical_history"],
            "impression": patient_data["impression"],
            "encounter_plan": patient_data["plan"],
            "raw_transcription": f"Raw transcription for {patient_data['name']}",
            "transcription_duration": round(random.uniform(5.0, 15.0), 2),
            "process_duration": round(random.uniform(10.0, 30.0), 2),
            "encounter_summary": patient_data["encounter_summary"],
            "final_letter": f"Final letter for {patient_data['name']}'s appointment",
        }

        jobs_list = generate_jobs_list_from_plan(patient["encounter_plan"])
        patient["jobs_list"] = json.dumps(jobs_list)
        patient["all_jobs_completed"] = False

        fake_patients.append(patient)

    for patient in fake_patients:
        patient_db.cursor.execute(
            """
            INSERT INTO patients (name, dob, ur_number, gender, encounter_date,
                                  primary_history, additional_history, investigations,
                                  encounter_detail, impression, encounter_plan,
                                  raw_transcription, transcription_duration, process_duration,
                                  encounter_summary, jobs_list, all_jobs_completed, final_letter)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                patient["name"],
                patient["dob"],
                patient["ur_number"],
                patient["gender"],
                patient["encounter_date"],
                patient["primary_history"],
                patient["additional_history"],
                patient["investigations"],
                patient["encounter_detail"],
                patient["impression"],
                patient["encounter_plan"],
                patient["raw_transcription"],
                patient["transcription_duration"],
                patient["process_duration"],
                patient["encounter_summary"],
                patient["jobs_list"],
                patient["all_jobs_completed"],
                patient["final_letter"],
            ),
        )

    patient_db.db.commit()
    print(f"Initialized {len(fake_patients)} fake patients.")


def main():
    clear_database()
    print("Initializing database with fake patients...")
    initialize_fake_patients()
    print("Initialization complete.")


if __name__ == "__main__":
    main()
    # Close the database connection when done
    patient_db.close()
