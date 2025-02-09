"""
Tests for configuration endpoints.
Uses TestClient and checks JSON response structure.
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI
from server.api.config import router

app = FastAPI()
app.include_router(router, prefix="/api")
client = TestClient(app)


def is_valid_json(response):
    try:
        response.json()
        return True
    except ValueError:
        return False


def test_get_prompts():
    response = client.get("/api/prompts")
    assert response.status_code == 200
    assert is_valid_json(response)
    data = response.json()
    # Expect prompts to be a dict
    assert isinstance(data, dict)


def test_get_config():
    response = client.get("/api/config")
    assert response.status_code == 200
    assert is_valid_json(response)
    data = response.json()
    # Expect config to be a dict
    assert isinstance(data, dict)


def test_get_custom_headings():
    response = client.get("/api/custom-headings")
    assert response.status_code == 200
    data = response.json()
    # Check that required keys exist
    for key in ["primaryHistory", "additionalHistory", "investigations", "encounterDetail", "impression", "encounterPlan"]:
        assert key in data


def test_get_all_options():
    response = client.get("/api/options")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)


def test_update_prompts():
    new_prompts = {
        "TEST_PROMPT": {
            "system": "Test System Prompt",
        }
    }
    response = client.post("/api/prompts", json=new_prompts)
    assert response.status_code == 200
    data = response.json()
    assert "message" in data or "updated" in data.get("message", "").lower()


def test_update_config():
    new_config = {"TEST_CONFIG": "test_value"}
    response = client.post("/api/config", json=new_config)
    assert response.status_code == 200
    data = response.json()
    message = data.get("message", "")
    assert "message" in data and ("success" in message.lower())

def test_update_options():
    new_options = {"TEST_OPTION": "test_option_value"}
    response = client.post("/api/options/TEST_CATEGORY", json=new_options)
    assert response.status_code == 200
    data = response.json()
    assert "updated" in data.get("message", "").lower()


def test_reset_to_defaults():
    response = client.post("/api/reset-to-defaults")
    assert response.status_code == 200
    data = response.json()
    assert "reset" in data.get("message", "").lower()
