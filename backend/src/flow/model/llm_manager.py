from langchain_groq import ChatGroq
from dotenv import load_dotenv

import os

load_dotenv()

def get_llm():
    """
    Returns a ChatGroq model instance using GROQ_API_KEY from .env.
    Using 70B for complex conversational logic and evaluation.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set in .env!")

    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        api_key=api_key
    )

def get_fast_llm():
    """
    Returns a faster, smaller model for simple extraction tasks.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set in .env!")

    return ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.1,
        api_key=api_key
    )
