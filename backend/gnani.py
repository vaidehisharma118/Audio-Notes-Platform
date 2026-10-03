import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

GNANI_API_KEY = os.getenv("GNANI_API_KEY")
GNANI_BASE_URL = "https://api.vachana.ai"


def transcribe_audio(
    audio_data,
    filename,
    content_type="audio/ogg"
):
    if not GNANI_API_KEY:
        raise Exception("GNANI_API_KEY is not configured")

    headers = {
        "X-API-Key-ID": GNANI_API_KEY
    }

    # -----------------------------------------
    # 1. CREATE JOB
    # -----------------------------------------

    create_url = f"{GNANI_BASE_URL}/stt/v3/batch/jobs"

    config = (
        '{"model":"gnani-prisma-v2.5",'
        '"language_code":"en-IN",'
        '"mode":"transcribe",'
        '"with_diarization":false,'
        '"is_multi_channel":false}'
    )

    files = {
        "config": (
            None,
            config,
            "application/json"
        ),
        "files": (
            filename,
            audio_data,
            content_type
        )
    }

    response = requests.post(
        create_url,
        headers=headers,
        files=files,
        timeout=60
    )

    if response.status_code != 201:
        raise Exception(
            f"Gnani create job failed: "
            f"{response.status_code} {response.text}"
        )

    job_id = response.json()["job_id"]

    print(f"Gnani job created: {job_id}")

    # -----------------------------------------
    # 2. START JOB
    # -----------------------------------------

    start_url = (
        f"{GNANI_BASE_URL}/stt/v3/batch/jobs/"
        f"{job_id}/start"
    )

    started = False

    for attempt in range(5):

        response = requests.post(
            start_url,
            headers=headers,
            timeout=60
        )

        if response.status_code == 202:
            started = True
            print("Gnani job started")
            break

        if response.status_code == 429:

            retry_after = response.headers.get(
                "Retry-After"
            )

            if retry_after:
                try:
                    wait_time = int(retry_after)
                except ValueError:
                    wait_time = 30
            else:
                # Increasing backoff
                wait_time = 30 * (attempt + 1)

            print(
                f"Gnani /start rate limited. "
                f"Attempt {attempt + 1}/5. "
                f"Waiting {wait_time} seconds..."
            )

            time.sleep(wait_time)
            continue

        raise Exception(
            f"Gnani start job failed: "
            f"{response.status_code} {response.text}"
        )

    if not started:
        raise Exception(
            "Gnani /start remained rate limited "
            "after 5 attempts"
        )

    # -----------------------------------------
    # 3. POLL STATUS
    # -----------------------------------------

    status_url = (
        f"{GNANI_BASE_URL}/stt/v3/batch/jobs/"
        f"{job_id}"
    )

    for attempt in range(60):

        time.sleep(10)

        response = requests.get(
            status_url,
            headers=headers,
            timeout=60
        )

        if response.status_code == 429:

            retry_after = response.headers.get(
                "Retry-After"
            )

            if retry_after:
                try:
                    wait_time = int(retry_after)
                except ValueError:
                    wait_time = 30
            else:
                wait_time = 30

            print(
                f"Gnani status rate limited. "
                f"Waiting {wait_time} seconds..."
            )

            time.sleep(wait_time)
            continue

        if response.status_code != 200:
            raise Exception(
                f"Gnani status check failed: "
                f"{response.status_code} {response.text}"
            )

        status = response.json()["status"]

        print(
            f"Gnani status: {status}"
        )

        if status == "COMPLETED":
            break

        if status in [
            "FAILED",
            "START_FAILED",
            "CANCELLED"
        ]:
            raise Exception(
                f"Gnani job failed with status: {status}"
            )

    else:
        raise Exception(
            "Gnani transcription timed out"
        )

    # -----------------------------------------
    # 4. GET TRANSCRIPT URL
    # -----------------------------------------

    files_url = (
        f"{GNANI_BASE_URL}/stt/v3/batch/jobs/"
        f"{job_id}/files"
    )

    for attempt in range(5):

        response = requests.get(
            files_url,
            headers=headers,
            params={"status": "COMPLETED"},
            timeout=60
        )

        if response.status_code == 200:
            break

        if response.status_code == 429:

            retry_after = response.headers.get(
                "Retry-After"
            )

            if retry_after:
                try:
                    wait_time = int(retry_after)
                except ValueError:
                    wait_time = 30
            else:
                wait_time = 30 * (attempt + 1)

            print(
                f"Gnani /files rate limited. "
                f"Waiting {wait_time} seconds..."
            )

            time.sleep(wait_time)
            continue

        raise Exception(
            f"Gnani files request failed: "
            f"{response.status_code} {response.text}"
        )

    else:
        raise Exception(
            "Gnani /files remained rate limited "
            "after 5 attempts"
        )

    result = response.json()

    if "data" not in result or not result["data"]:
        raise Exception(
            "Gnani returned no completed files"
        )

    transcript_url = result["data"][0].get(
        "transcript_url"
    )

    if not transcript_url:
        raise Exception(
            "Gnani response did not contain "
            "transcript_url"
        )

    # -----------------------------------------
    # 5. DOWNLOAD TRANSCRIPT
    # -----------------------------------------

    response = requests.get(
        transcript_url,
        timeout=60
    )

    if response.status_code != 200:
        raise Exception(
            f"Transcript download failed: "
            f"{response.status_code} {response.text}"
        )

    transcript_data = response.json()

    transcript = transcript_data.get(
        "full_transcript"
    )

    if not transcript:
        raise Exception(
            "Transcript is empty"
        )

    return {
        "job_id": job_id,
        "transcript": transcript
    }