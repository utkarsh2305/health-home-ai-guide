import asyncio
import logging
import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from server.api import chat, config, dashboard, patient, rag, transcribe
from server.database.config import ConfigManager


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
DATA_DIR = Path("/usr/src/app/data")
BUILD_DIR = Path("/usr/src/app/build")
IS_TESTING = os.getenv("TESTING", "false").lower() == "true"

# @app.middleware("http")
# async def log_requests(request: Request, call_next):
#    body = await request.body()
#    logging.info(f"Request body: {body.decode()}")
#    response = await call_next(request)
#    return response


@app.get("/test-db")
async def test_db():
    try:
        result = test_database()
        logger.info(f"Database test succeeded: {result}")
        return {"success": "Database test succeeded", "result": result}
    except Exception as e:
        logger.error(f"Database test failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Database test failed: {str(e)}"
        )


# Include routers
app.include_router(patient.router, prefix="/api")
app.include_router(transcribe.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(rag.router, prefix="/api")
app.include_router(config.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


# React app routes
@app.get("/new-patient")
@app.get("/settings")
@app.get("/rag")
@app.get("/clinic-summary")
@app.get("/outstanding-tasks")
async def serve_react_app():
    return FileResponse(BUILD_DIR / "index.html")


# Serve static files
app.mount("/", StaticFiles(directory=BUILD_DIR, html=True), name="static")


# Optional: Catch-all route for any other paths
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    return FileResponse(BUILD_DIR / "index.html")


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        log_level="debug",
    )
