from langchain_groq import ChatGroq
import os

def get_chatgroq_llm():
    """
    Returns a ChatGroq model instance using GROQ_API_KEY from .env.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set in .env!")

    return ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.7,
        api_key=api_key
    )
