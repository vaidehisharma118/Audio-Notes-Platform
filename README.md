# Audio Notes Platform

A full-stack audio notes application that allows users to upload audio, transcribe it using Gnani Batch STT, and generate AI-powered summaries.

## Tech Stack

- Next.js
- FastAPI
- PostgreSQL
- Supabase Storage
- Celery
- Redis
- Gnani Batch STT
- Gemini

## Architecture

Next.js → FastAPI → Supabase Storage / PostgreSQL → Celery + Redis → Gnani STT → Gemini → PostgreSQL

## Features

- Audio upload
- Background processing
- Long-audio transcription
- Transcript display
- AI-generated summary
- Previous uploads
- Processing status
- Failure handling and retry
- Architecture documentation

## Run Locally

### Backend

```bash
cd backend
venv\Scripts\activate
python -m uvicorn main:app --reload