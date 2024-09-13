import os
import sqlite3
import json
import logging
from server.schemas.patient import Patient
from server.database.connection import PatientDatabase

db = PatientDatabase()


def generate_jobs_list_from_plan(plan):
    logging.info("Generating jobs list from the plan")
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


def are_all_jobs_completed(jobs_list):
    logging.info("Checking if all jobs are completed")
    if not jobs_list:
        logging.info("No jobs list provided")
        return False
    return all(item["completed"] for item in jobs_list)


def get_patients_with_outstanding_jobs():
    logging.info("Getting patients with outstanding jobs")
    try:
        db.cursor.execute("SELECT * FROM patients WHERE all_jobs_completed = 0")
        rows = db.cursor.fetchall()
        patients = [dict(row) for row in rows]
        return patients
    except Exception as e:
        logging.error(f"Database error: {e}")
        raise


def update_patient_jobs_list(patient_id: int, jobs_list: list):
    try:
        all_jobs_completed = all(job.completed for job in jobs_list)
        serialized_jobs_list = json.dumps([job.dict() for job in jobs_list])
        db.cursor.execute(
            "UPDATE patients SET jobs_list = ?, all_jobs_completed = ? WHERE id = ?",
            (serialized_jobs_list, all_jobs_completed, patient_id),
        )
        db.db.commit()  # Use db.db to access the SQLite connection
        logging.info(f"To-Do list updated for patient ID: {patient_id}")
    except Exception as e:
        logging.error(f"Database error during to-do list update: {e}")
        raise


def count_incomplete_jobs():
    logging.info("Counting incomplete jobs across all patients")
    try:
        db.cursor.execute(
            "SELECT jobs_list FROM patients WHERE all_jobs_completed = 0"
        )
        rows = db.cursor.fetchall()
        incomplete_jobs_count = sum(
            len(
                [
                    job
                    for job in json.loads(row["jobs_list"])
                    if not job.get("completed", False)
                ]
            )
            for row in rows
            if row["jobs_list"]
        )
        logging.info(f"Total incomplete jobs: {incomplete_jobs_count}")
        return incomplete_jobs_count
    except Exception as e:
        logging.error(f"Database error when counting incomplete jobs: {e}")
        raise
