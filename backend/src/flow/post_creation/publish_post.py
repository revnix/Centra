from langgraph.types import interrupt
from src.flow.states.evelyn import EVALN
from instagrapi import Client
import os
import requests
import json

# ---------- ENV VARIABLES ----------

INSTAGRAM_USERNAME = os.getenv("INSTAGRAM_USERNAME")
INSTAGRAM_PASSWORD = os.getenv("INSTAGRAM_PASSWORD")

FACEBOOK_PAGE_ID = os.getenv("FACEBOOK_PAGE_ID")
FACEBOOK_ACCESS_TOKEN = os.getenv("FACEBOOK_ACCESS_TOKEN")


# ---------- COMMON HELPERS ----------

def format_list(title: str, items: list) -> str:
    if not items:
        return ""
    return f"\n{title}:\n" + "\n".join([f"• {item}" for item in items]) + "\n"


def validate_apply_link(post: dict) -> bool:
    link = post.get("apply_link")
    return not link or link.startswith("http")


# ---------- CAPTION BUILDERS ----------

def build_instagram_caption(post: dict) -> str:
    caption = build_full_caption(post)
    return caption[:2200]


def build_facebook_caption(post: dict) -> str:
    return build_full_caption(post)


def build_full_caption(post: dict) -> str:
    caption = (
        f" NEW JOB OPPORTUNITY \n\n"
        f" Position: {post.get('job_title', 'N/A')}\n"
        f" Location: {post.get('location', 'N/A')}\n\n"
        f"{post.get('summary', 'N/A')}\n"
    )

    caption += format_list("Responsibilities", post.get("responsibilities", []))
    caption += format_list("Requirements", post.get("requirements", []))
    caption += format_list("Preferred Qualifications", post.get("preferred_qualifications", []))
    caption += format_list("Skills", post.get("skills", []))
    caption += format_list("Benefits", post.get("benefits", []))

    if post.get("apply_link"):
        caption += f"\n Apply here:\n{post['apply_link']}\n"

    caption += (
        "\n Apply now or share with someone who might be interested!\n\n"
        "#Hiring #JobOpening #Career #TechJobs #RemoteJobs #ApplyNow"
    )

    return caption


# ---------- MAIN NODE ----------

def publish_post(state: EVALN) -> dict:
    jd = state.get("jd", {})
    post = jd.get("post", {})

    if jd.get("status") != "approved":
        return {}

    if not validate_apply_link(post):
        print("Invalid apply link.")
        return {}

    platform = interrupt({
        "message": "Select platform to publish the Job Description",
        "options": ["instagram", "facebook", "cancel"]
    })

    if platform == "cancel":
        return {"jd": {**jd, "publish_status": "cancelled"}}

    confirm = interrupt({
        "message": f"Do you want to publish this JD on {platform}?",
        "options": ["yes", "no"]
    })

    if confirm != "yes":
        return {"jd": {**jd, "publish_status": "Failed_at_Publish"}}

    publishers = {
        "instagram": publish_to_instagram,
        "facebook": publish_to_facebook
    }

    success = publishers[platform](post)

    return {
        "jd": {
            **jd,
            "publish_status": {
                **jd.get("publish_status", {}),
                platform: "published" if success else "failed"
            }
        }
    }


# ---------- INSTAGRAM ----------

def publish_to_instagram(post: dict) -> bool:
    if not INSTAGRAM_USERNAME or not INSTAGRAM_PASSWORD:
        return False

    cl = Client()

    try:
        cl.login(INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD)
    except Exception as e:
        print(f"Instagram login failed: {e}")
        return False

    caption = build_instagram_caption(post)

    image_path = os.path.join(
        os.path.dirname(__file__),
        "remember-why-you-started-kvwh2yysc6826h2k.jpg"
    )

    if not os.path.exists(image_path):
        return False

    try:
        cl.photo_upload(path=image_path, caption=caption)
        return True
    except Exception as e:
        print(f"Instagram upload failed: {e}")
        return False


# ---------- FACEBOOK ----------

def publish_to_facebook(post: dict) -> bool:
    if not FACEBOOK_PAGE_ID or not FACEBOOK_ACCESS_TOKEN:
        return False

    url = f"https://graph.facebook.com/{FACEBOOK_PAGE_ID}/feed"

    payload = {
        "message": build_facebook_caption(post),
        "access_token": FACEBOOK_ACCESS_TOKEN
    }

    response = requests.post(url, data=payload)
    return response.status_code == 200
