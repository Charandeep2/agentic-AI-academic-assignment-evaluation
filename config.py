"""
Configuration settings for the AI Academic Assessment System.
Loads from .env file with sensible defaults for development.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Base directory
BASE_DIR = Path(__file__).parent.resolve()

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'academic_system.db'}")

# LLM Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.0-flash")
USE_MOCK_LLM = os.getenv("USE_MOCK_LLM", "true").lower() == "true"

# RAG Configuration
CHROMA_PERSIST_DIR = str(BASE_DIR / "chroma_db")
KNOWLEDGE_BASE_DIR = str(BASE_DIR / "knowledge_base_docs")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))

# File Upload
UPLOAD_DIR = str(BASE_DIR / "uploads")
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
ALLOWED_EXTENSIONS = {".txt", ".pdf", ".py", ".java", ".cpp", ".c", ".md", ".docx", ".ipynb"}

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
os.makedirs(KNOWLEDGE_BASE_DIR, exist_ok=True)
