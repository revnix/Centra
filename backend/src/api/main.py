from dotenv import load_dotenv
load_dotenv()

from backend.src.flow.core.llm.chatgroq_model import get_chatgroq_llm
from backend.src.flow.graph.workflow import build_workflow


if __name__ == "__main__":
    app = build_workflow()

    result = app.invoke({
    "job_title": "Frontend Web Developer",
    "job_summary": "Responsible for building modern and responsive user interfaces.",
    "duties_responsibilities": [
        "Develop frontend components",
        "Collaborate with backend engineers",
        "Optimize performance"
    ],
    "qualifications_skills": [
        "BS in CS or related field",
        "Strong JavaScript & React skills",
        "Good communication"
    ],
    "company_name": "Revnix",
    "working_conditions": "Full-time, reports to Engineering Manager.",
    "compensation_benefits": "Competitive salary, health insurance.",
    "location": "Haripur",
    "benefits": [
        "Health insurance",
        "Flexible hours"
    ]
})


    import json
    print("========== STRUCTURED JOB DESCRIPTION ==========")
    print(json.dumps(result, indent=4))


