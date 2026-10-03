import os
import uuid

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal
from models import AudioNote
from storage import upload_audio
from tasks import process_audio


app = FastAPI()


# -----------------------------------------
# CORS
# -----------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------
# HEALTH
# -----------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


# -----------------------------------------
# CREATE NOTE / UPLOAD AUDIO
# -----------------------------------------

@app.post("/notes")
def create_note(file: UploadFile = File(...)):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is missing"
        )

    # Read file
    audio_data = file.file.read()

    if not audio_data:
        raise HTTPException(
            status_code=400,
            detail="Empty audio file"
        )

    file_size = len(audio_data)

    # Create DB row first
    db = SessionLocal()

    try:

        note = AudioNote(
            filename=file.filename,
            file_size=file_size,
            status="UPLOADING"
        )

        db.add(note)
        db.commit()
        db.refresh(note)

        # Unique storage path
        safe_filename = os.path.basename(
            file.filename
        )

        storage_path = (
            f"uploads/{note.id}_"
            f"{uuid.uuid4().hex}_"
            f"{safe_filename}"
        )

        # Upload to Supabase
        try:

            upload_audio(
                storage_path=storage_path,
                audio_data=audio_data,
                content_type=(
                    file.content_type
                    or "application/octet-stream"
                )
            )

        except Exception as e:

            note.status = "FAILED"
            note.error_message = str(e)
            db.commit()

            raise HTTPException(
                status_code=500,
                detail=str(e)
            )

        # Save storage location
        note.storage_path = storage_path
        note.status = "QUEUED"

        db.commit()
        db.refresh(note)

        # Send background task
        process_audio.delay(note.id)

        return {
            "id": note.id,
            "filename": note.filename,
            "status": note.status
        }

    finally:
        db.close()


# -----------------------------------------
# GET ALL NOTES
# -----------------------------------------

@app.get("/notes")
def get_notes():

    db = SessionLocal()

    try:

        notes = (
            db.query(AudioNote)
            .order_by(
                AudioNote.created_at.desc()
            )
            .all()
        )

        return [
            {
                "id": note.id,
                "filename": note.filename,
                "file_size": note.file_size,
                "status": note.status,
                "created_at": note.created_at,
            }
            for note in notes
        ]

    finally:
        db.close()


# -----------------------------------------
# GET SINGLE NOTE
# -----------------------------------------

@app.get("/notes/{note_id}")
def get_note(note_id: int):

    db = SessionLocal()

    try:

        note = (
            db.query(AudioNote)
            .filter(AudioNote.id == note_id)
            .first()
        )

        if not note:
            raise HTTPException(
                status_code=404,
                detail="Note not found"
            )

        return {
            "id": note.id,
            "filename": note.filename,
            "file_size": note.file_size,
            "status": note.status,
            "transcript": note.transcript,
            "summary": note.summary,
            "error_message": note.error_message,
            "created_at": note.created_at,
            "updated_at": note.updated_at,
        }

    finally:
        db.close()


# -----------------------------------------
# RETRY FAILED NOTE
# -----------------------------------------

@app.post("/notes/{note_id}/retry")
def retry_note(note_id: int):

    db = SessionLocal()

    try:

        note = (
            db.query(AudioNote)
            .filter(AudioNote.id == note_id)
            .first()
        )

        if not note:
            raise HTTPException(
                status_code=404,
                detail="Note not found"
            )

        if not note.storage_path:
            raise HTTPException(
                status_code=400,
                detail="Audio file is missing"
            )

        note.status = "QUEUED"
        note.error_message = None

        db.commit()

        process_audio.delay(note.id)

        return {
            "id": note.id,
            "status": "QUEUED"
        }

    finally:
        db.close()