from celery_app import celery_app
from database import SessionLocal
from models import AudioNote
from storage import download_audio
from gnani import transcribe_audio
from llm import summarize_text

import mimetypes


@celery_app.task(bind=True)
def process_audio(self, note_id):
    db = SessionLocal()

    try:
        note = (
            db.query(AudioNote)
            .filter(AudioNote.id == note_id)
            .first()
        )

        if not note:
            print(f"Note {note_id} not found")
            return

        # -----------------------------------------
        # TRANSCRIPTION
        # -----------------------------------------

        if not note.transcript:

            note.status = "TRANSCRIBING"
            note.error_message = None
            db.commit()

            print(f"Processing note {note_id}")

            audio_data = download_audio(
                note.storage_path
            )

            content_type = (
                mimetypes.guess_type(note.filename)[0]
                or "audio/ogg"
            )

            result = transcribe_audio(
                audio_data=audio_data,
                filename=note.filename,
                content_type=content_type
            )

            note.transcript = result["transcript"]
            db.commit()

            print(
                f"Transcript saved for note {note_id}"
            )

        else:
            print(
                f"Transcript already exists for note {note_id}. "
                f"Skipping Gnani."
            )

        # -----------------------------------------
        # SUMMARY
        # -----------------------------------------

        note.status = "SUMMARIZING"
        db.commit()

        print(f"Generating summary for note {note_id}")

        summary = summarize_text(
            note.transcript
        )

        note.summary = summary

        # -----------------------------------------
        # COMPLETED
        # -----------------------------------------

        note.status = "COMPLETED"
        note.error_message = None
        db.commit()

        print(
            f"Note {note_id} completed successfully"
        )

    except Exception as e:

        print(
            f"Note {note_id} failed: {str(e)}"
        )

        db.rollback()

        note = (
            db.query(AudioNote)
            .filter(AudioNote.id == note_id)
            .first()
        )

        if note:
            note.status = "FAILED"
            note.error_message = str(e)
            db.commit()

        raise

    finally:
        db.close()