import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

BUCKET_NAME = "audio-files"


def get_headers(content_type=None):
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
    }

    if content_type:
        headers["Content-Type"] = content_type

    return headers


def upload_audio(storage_path, audio_data, content_type):
    url = (
        f"{SUPABASE_URL}/storage/v1/object/"
        f"{BUCKET_NAME}/{storage_path}"
    )

    headers = get_headers(content_type)
    headers["x-upsert"] = "false"

    response = requests.post(
        url,
        headers=headers,
        data=audio_data,
        timeout=120
    )

    if response.status_code not in [200, 201]:
        raise Exception(
            f"Supabase upload failed: "
            f"{response.status_code} {response.text}"
        )


def download_audio(storage_path):
    url = (
        f"{SUPABASE_URL}/storage/v1/object/"
        f"{BUCKET_NAME}/{storage_path}"
    )

    response = requests.get(
        url,
        headers=get_headers(),
        timeout=120
    )

    if response.status_code != 200:
        raise Exception(
            f"Supabase download failed: "
            f"{response.status_code} {response.text}"
        )

    return response.content