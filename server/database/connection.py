import os
import sqlite3
import json
import logging
from datetime import datetime
from server.schemas.patient import Patient
from server.schemas.dashboard import RssFeed, RssItem


class PatientDatabase:
    def __init__(self, db_dir="/usr/src/app/data"):
        self.db_dir = db_dir
        self.is_test = os.environ.get("TESTING", "False").lower() == "true"
        self.db_name = (
            "test_scribe_database.sqlite"
            if self.is_test
            else "scribe_database.sqlite"
        )
        self.db_path = os.path.join(db_dir, self.db_name)
        self.ensure_data_directory()
        self.connect_to_database()
        self.create_tables()

    def ensure_data_directory(self):
        if not os.path.exists(self.db_dir):
            logging.info(
                "Data directory does not exist. Creating data directory."
            )
            os.makedirs(self.db_dir)
        else:
            logging.info("Data directory exists.")
        logging.info(f"Database path: {self.db_path}")

    def connect_to_database(self):
        self.db = sqlite3.connect(self.db_path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.cursor = self.db.cursor()

    def create_tables(self):
        self.cursor.execute(
            """
                CREATE TABLE IF NOT EXISTS patients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    dob TEXT,
                    ur_number TEXT,
                    gender TEXT,
                    encounter_date TEXT,
                    primary_history TEXT,
                    additional_history TEXT,
                    investigations TEXT,
                    encounter_detail TEXT,
                    impression TEXT,
                    encounter_plan TEXT,
                    raw_transcription TEXT,
                    transcription_duration REAL,
                    process_duration REAL,
                    encounter_summary TEXT,
                    jobs_list TEXT,
                    all_jobs_completed BOOLEAN,
                    final_letter TEXT
                )
            """
        )
        self.cursor.execute(
            """
                CREATE INDEX IF NOT EXISTS idx_encounter_date ON patients (encounter_date)
            """
        )

        # Dashboard-related tables
        self.cursor.execute(
            """
                CREATE TABLE IF NOT EXISTS rss_feeds (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT NOT NULL UNIQUE,
                    title TEXT,
                    last_refreshed TEXT
                )
            """
        )
        self.cursor.execute(
            """
                CREATE TABLE IF NOT EXISTS todos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task TEXT NOT NULL,
                    completed BOOLEAN NOT NULL DEFAULT 0
                )
            """
        )
        self.cursor.execute(
            """
                CREATE TABLE IF NOT EXISTS rss_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    feed_id INTEGER,
                    title TEXT NOT NULL,
                    link TEXT NOT NULL,
                    description TEXT,
                    published TEXT,
                    digest TEXT,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (feed_id) REFERENCES rss_feeds (id)
                )
            """
        )

        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """
        )

        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS prompts (
                key TEXT PRIMARY KEY,
                system TEXT,
                initial TEXT,
                clinicalHistoryInitial TEXT,
                planInitial TEXT
            )
        """
        )

        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS options (
                category TEXT,
                key TEXT,
                value TEXT,
                PRIMARY KEY (category, key)
            )
        """
        )

        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS custom_headings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """
        )

        self.db.commit()

    def test_database(self):
        encounter_date = "12-06-2024"
        test_encounter_plan = "1. Task one\n2. Task two\n3. Task three\nPlan: Something else\n4. Task four"
        test_jobs_list = json.dumps(
            generate_jobs_list_from_plan(test_encounter_plan)
        )

        self.cursor.execute(
            """
            INSERT INTO patients (name, dob, ur_number, gender, encounter_date,
                                  primary_history, additional_history, investigations,
                                  encounter_detail, impression, encounter_plan,
                                  raw_transcription, transcription_duration, process_duration,
                                  encounter_summary, jobs_list, all_jobs_completed, final_letter)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                "Test User",
                "12-06-2024",
                "UR12345",
                "M",
                encounter_date,
                "Primary History",
                "Additional History",
                "Investigations",
                "Encounter Detail",
                "Impression",
                "Encounter Plan",
                "Raw Transcription",
                10.5,
                20.5,
                "Encounter Summary",
                test_jobs_list,
                0,
                "Test Letter",
            ),
        )
        self.db.commit()

        self.cursor.execute(
            "SELECT * FROM patients WHERE id = ?", (self.cursor.lastrowid,)
        )
        return self.cursor.fetchone()

    def commit(self):
        self.db.commit()

    def execute(self):
        self.db.execute()

    def close(self):
        self.db.close()

    def clear_test_database(self):
        if self.is_test:
            tables = [
                "patients",
                "rss_feeds",
                "todos",
                "rss_items",
                "config",
                "prompts",
                "options",
                "custom_headings",
            ]
            for table in tables:
                self.cursor.execute(f"DELETE FROM {table}")
            self.db.commit()
