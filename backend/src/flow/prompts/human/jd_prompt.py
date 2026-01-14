from langchain_core.prompts import ChatPromptTemplate


JD_GENERATION_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a senior HR professional.
Your task is to generate a professional, clear, and industry-standard
Job Description (JD).

Rules:
- Output MUST be structured JSON
- Do NOT include explanations or markdown
- Keep language professional and concise
"""
    ),
    (
        "human",
        """Job Title: {job_title}
Location: {location}
Skills: {skills}
company_name: {company_name}
employment_type: {employment_type}
experience_level: {experience_level}
feedback: {feedback}

Generate the complete Job Description."""
    ),
])
