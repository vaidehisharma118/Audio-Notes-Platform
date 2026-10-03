import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
]


def _call_gemini(model, transcript):
    url = (
        f"https://generativelanguage.googleapis.com/"
        f"v1beta/models/{model}:generateContent"
    )

    prompt = f"""
You are summarizing an audio transcript.

Give:

Summary:
Write a concise summary in 2-4 sentences.

Key Points:
Give 3-5 important points.

Use only information present in the transcript.
Do not invent facts.

Transcript:
{transcript}
"""

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    }

    headers = {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json"
    }

    # Retry temporary errors
    for attempt in range(3):

        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=120
        )

        if response.status_code == 200:
            data = response.json()

            try:
                parts = data["candidates"][0]["content"]["parts"]

                summary = "\n".join(
                    part["text"]
                    for part in parts
                    if "text" in part
                )

                if summary.strip():
                    return summary

                raise Exception(
                    "Gemini returned an empty response"
                )

            except (KeyError, IndexError, TypeError):
                raise Exception(
                    f"Unexpected Gemini response: {data}"
                )

        # Temporary rate limit / overload
        if response.status_code in [429, 503]:

            wait_time = 10 * (2 ** attempt)

            print(
                f"Gemini {model} returned "
                f"{response.status_code}. "
                f"Retrying in {wait_time} seconds..."
            )

            time.sleep(wait_time)
            continue

        # Permanent error
        raise Exception(
            f"Gemini request failed: "
            f"{response.status_code} {response.text}"
        )

    raise Exception(
        f"Gemini {model} unavailable after retries"
    )


def summarize_text(transcript):

    if not GEMINI_API_KEY:
        raise Exception(
            "GEMINI_API_KEY is not configured"
        )

    last_error = None

    for model in MODELS:

        print(
            f"Trying Gemini model: {model}"
        )

        try:
            result = _call_gemini(
                model,
                transcript
            )

            print(
                f"Gemini summary generated using {model}"
            )

            return result

        except Exception as e:

            last_error = e

            print(
                f"{model} failed: {e}"
            )

    raise Exception(
        f"All Gemini models failed. "
        f"Last error: {last_error}"
    )