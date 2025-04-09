
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# OpenAI API configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Agent configuration
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gpt-4")
FAST_MODEL = os.getenv("FAST_MODEL", "gpt-3.5-turbo")

# Server configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")

# CORS configuration
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
