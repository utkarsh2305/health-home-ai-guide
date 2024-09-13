import json
import os
import asyncio
from threading import Lock
from server.database.connection import PatientDatabase


class ConfigManager:
    _instance = None
    _lock = Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ConfigManager, cls).__new__(cls)
                cls._instance.db = PatientDatabase()
                if cls._instance._is_database_empty():
                    cls._instance._initialize_database()
                cls._instance._load_configs()
            return cls._instance

    def _is_database_empty(self):
        self.db.cursor.execute("SELECT COUNT(*) FROM config")
        config_count = self.db.cursor.fetchone()[0]
        self.db.cursor.execute("SELECT COUNT(*) FROM prompts")
        prompts_count = self.db.cursor.fetchone()[0]
        self.db.cursor.execute("SELECT COUNT(*) FROM custom_headings")
        headings_count = self.db.cursor.fetchone()[0]
        self.db.cursor.execute("SELECT COUNT(*) FROM options")
        options_count = self.db.cursor.fetchone()[0]
        return (
            config_count == 0
            and prompts_count == 0
            and headings_count == 0
            and options_count == 0
        )

    def _load_configs(self):
        self.config = {}
        self.prompts = {}
        self.custom_headings = {}

        # Load config
        self.db.cursor.execute("SELECT key, value FROM config")
        for row in self.db.cursor.fetchall():
            self.config[row["key"]] = json.loads(row["value"])

        # Load prompts
        self.db.cursor.execute(
            "SELECT key, system, initial, clinicalHistoryInitial, planInitial FROM prompts"
        )
        for row in self.db.cursor.fetchall():
            self.prompts[row["key"]] = {
                "system": row["system"],
                "initial": row["initial"],
                "clinicalHistoryInitial": row["clinicalHistoryInitial"],
                "planInitial": row["planInitial"],
            }

        # Load custom headings
        self.db.cursor.execute("SELECT key, value FROM custom_headings")
        for row in self.db.cursor.fetchall():
            self.custom_headings[row["key"]] = row["value"]

        # Load options
        self.options = {}
        self.db.cursor.execute("SELECT category, key, value FROM options")
        for row in self.db.cursor.fetchall():
            category = row["category"]
            key = row["key"]
            value = json.loads(row["value"])
            if category not in self.options:
                self.options[category] = {}
            self.options[category][key] = value

    def get_config(self):
        return self.config

    def get_prompts(self):
        return self.prompts

    def get_prompts_and_options(self):
        structured_prompts = {"prompts": self.prompts, "options": self.options}
        return structured_prompts

    def get_custom_headings(self):
        return self.custom_headings

    def update_config(self, new_config):
        for key, value in new_config.items():
            self.db.cursor.execute(
                "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
                (key, json.dumps(value)),
            )
        self.db.commit()
        self._load_configs()

    def update_prompts(self, new_prompts):
        for key, prompt in new_prompts.items():
            self.db.cursor.execute(
                """
                INSERT OR REPLACE INTO prompts
                (key, system, initial, clinicalHistoryInitial, planInitial)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    key,
                    prompt.get("system", ""),
                    prompt.get("initial", ""),
                    prompt.get("clinicalHistoryInitial", ""),
                    prompt.get("planInitial", ""),
                ),
            )
        self.db.commit()
        self._load_configs()

    def update_custom_headings(self, new_headings):
        for key, value in new_headings.items():
            self.db.cursor.execute(
                "INSERT OR REPLACE INTO custom_headings (key, value) VALUES (?, ?)",
                (key, value),
            )
        self.db.commit()
        self._load_configs()

    def get_all_options(self):
        return self.options

    def get_options(self, category):
        return self.options.get(category, {})

    def update_options(self, category, new_options):
        if category not in self.options:
            self.options[category] = {}
        self.options[category].update(new_options)

        for key, value in new_options.items():
            self.db.cursor.execute(
                "INSERT OR REPLACE INTO options (category, key, value) VALUES (?, ?, ?)",
                (category, key, json.dumps(value)),
            )
        self.db.commit()
        self._load_configs()  # Reload to ensure consistency

    def reset_to_defaults(self):
        # Clear existing data for prompts, custom headings, and options
        self.db.cursor.execute("DELETE FROM prompts")
        self.db.cursor.execute("DELETE FROM custom_headings")
        self.db.cursor.execute("DELETE FROM options")
        self.db.commit()

        # Reinitialize with default data
        self._initialize_database()

    def _initialize_database(self):
        self.db.cursor.execute("SELECT COUNT(*) FROM config")
        config_count = self.db.cursor.fetchone()[0]
        if config_count == 0:
            # Initialize config with default entries
            default_config = {
                "WHISPER_BASE_URL": "&nbsp;",
                "WHISPER_MODEL": "&nbsp;",
                "WHISPER_KEY": "&nbsp;",
                "OLLAMA_BASE_URL": "&nbsp;",
                "PRIMARY_MODEL": "&nbsp;",
                "SECONDARY_MODEL": "&nbsp;",
                "EMBEDDING_MODEL": "&nbsp;",
            }
            for key, value in default_config.items():
                self.db.cursor.execute(
                    "INSERT INTO config (key, value) VALUES (?, ?)",
                    (key, json.dumps(value)),
                )
        # Load initial data from JSON files
        prompts_path = "/usr/src/app/server/database/defaults/prompts.json"
        custom_headings_path = (
            "/usr/src/app/server/database/defaults/custom_headings.json"
        )

        with open(prompts_path, "r") as f:
            prompts_data = json.load(f)
        with open(custom_headings_path, "r") as f:
            custom_headings = json.load(f)

        # Populate database tables
        # Prompts
        for key, prompt in prompts_data["prompts"].items():
            self.db.cursor.execute(
                """
                INSERT OR REPLACE INTO prompts
                (key, system, initial, clinicalHistoryInitial, planInitial)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    key,
                    prompt.get("system", ""),
                    prompt.get("initial", ""),
                    prompt.get("clinicalHistoryInitial", ""),
                    prompt.get("planInitial", ""),
                ),
            )

        # Custom Headings
        for key, value in custom_headings.items():
            self.db.cursor.execute(
                "INSERT OR REPLACE INTO custom_headings (key, value) VALUES (?, ?)",
                (key, value),
            )

        # Options
        default_options = prompts_data["options"].get("general", {})
        for category, options in prompts_data["options"].items():
            for key, value in options.items():
                actual_value = options.get(key, default_options.get(key))
                if actual_value is not None:
                    self.db.cursor.execute(
                        "INSERT OR REPLACE INTO options (category, key, value) VALUES (?, ?, ?)",
                        (category, key, json.dumps(actual_value)),
                    )

        self.db.commit()
        self._load_configs()


config_manager = ConfigManager()
