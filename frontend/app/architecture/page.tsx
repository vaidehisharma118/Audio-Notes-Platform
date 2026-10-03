export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10 text-black">
      <div className="mx-auto max-w-5xl">

        {/* Header */}

        <div className="mb-8">
          <a
            href="/"
            className="text-blue-600 hover:underline"
          >
            ← Back to Audio Notes
          </a>

          <h1 className="mt-6 text-4xl font-bold text-black">
            System Architecture
          </h1>

          <p className="mt-3 text-gray-700">
            This page explains how an uploaded audio file moves through
            the Audio Notes system, how long-running processing is
            handled, and where the generated results are stored.
          </p>

          {/* GitHub link */}

          <a
            href="https://github.com/vaidehisharma118/Audio-Notes-Platform"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block font-medium text-blue-600 hover:underline"
          >
            View Source Code on GitHub →
          </a>
        </div>

        {/* System Flow */}

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-2xl font-semibold text-black">
            Upload → Transcript → Summary
          </h2>

          <div className="mt-6 space-y-3 text-center font-medium">

            <div className="rounded-xl border bg-gray-50 p-4 text-black">
              Next.js Frontend
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-xl border bg-gray-50 p-4 text-black">
              FastAPI Backend
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-xl border bg-gray-50 p-4 text-black">
              Supabase Storage
            </div>

            <div className="text-black">+</div>

            <div className="rounded-xl border bg-gray-50 p-4 text-black">
              PostgreSQL
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-xl border bg-gray-50 p-4 text-black">
              Celery + Redis
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-xl border bg-gray-50 p-4 text-black">
              Background Worker
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-xl border bg-gray-50 p-4 text-black">
              Gnani Batch STT
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-xl border bg-gray-50 p-4 text-black">
              Transcript
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-xl border bg-gray-50 p-4 text-black">
              Gemini
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-xl border bg-gray-50 p-4 text-black">
              PostgreSQL
            </div>
          </div>
        </section>

        {/* Upload */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-2xl font-semibold text-black">
            1. Flow From Upload to Transcript
          </h2>

          <p className="mt-3 text-gray-700">
            The user selects an audio file in the Next.js frontend and
            submits it to the FastAPI backend using a multipart upload.
          </p>

          <p className="mt-3 text-gray-700">
            FastAPI creates a record in PostgreSQL and uploads the audio
            file to a private Supabase Storage bucket. The database
            stores the filename, storage path, file size, processing
            status, transcript, summary, and any error message.
          </p>

          <p className="mt-3 text-gray-700">
            After the file is stored, FastAPI places a Celery task into
            Redis and immediately returns the note ID to the frontend.
          </p>

          <p className="mt-3 text-gray-700">
            The background worker downloads the audio from storage and
            sends it to the Gnani Batch STT API. Gnani processes the
            recording asynchronously. The worker creates the job,
            starts it, polls its status, retrieves the transcript URL,
            and downloads the transcript.
          </p>
        </section>

        {/* Files */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-2xl font-semibold text-black">
            2. Where Files and Data Live
          </h2>

          <p className="mt-3 text-gray-700">
            Audio files are stored in a private Supabase Storage bucket
            called <strong>audio-files</strong>. PostgreSQL is used for
            application data rather than storing the raw audio itself.
          </p>

          <p className="mt-3 text-gray-700">
            PostgreSQL stores the audio metadata, current processing
            status, transcript, generated summary, and error information.
          </p>

          <p className="mt-3 text-gray-700">
            Keeping binary audio in object storage and text/metadata in
            PostgreSQL keeps the database smaller and separates storage
            responsibilities.
          </p>
        </section>

        {/* Long Audio */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-2xl font-semibold text-black">
            3. Handling Long Audio
          </h2>

          <p className="mt-3 text-gray-700">
            Long audio is handled as a background job instead of being
            processed inside the user's HTTP request. This prevents the
            browser from waiting for a long-running transcription request.
          </p>

          <p className="mt-3 text-gray-700">
            Gnani Batch STT is used because it is designed for
            asynchronous processing of long recordings. The Celery
            worker waits for the Gnani job to finish and updates the
            database as the processing moves through different stages.
          </p>

          <p className="mt-3 text-gray-700">
            The frontend polls the backend every few seconds and displays
            stages such as QUEUED, TRANSCRIBING, SUMMARIZING, and
            COMPLETED.
          </p>
        </section>

        {/* Sync vs Background */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-2xl font-semibold text-black">
            4. Synchronous vs Background Work
          </h2>

          <p className="mt-3 text-gray-700">
            The upload request is synchronous only for the initial file
            validation, database record creation, and storage upload.
            Once the file is safely stored, the API queues the processing
            task and returns without waiting for transcription or
            summarization.
          </p>

          <p className="mt-3 text-gray-700">
            Transcription and summarization run in the background using
            Celery workers. Redis acts as the message broker between the
            API and the worker.
          </p>
        </section>

        {/* Failure */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-2xl font-semibold text-black">
            5. Failure Handling
          </h2>

          <p className="mt-3 text-gray-700">
            If storage, transcription, or summarization fails, the
            worker records the error in PostgreSQL and changes the note
            status to FAILED.
          </p>

          <p className="mt-3 text-gray-700">
            The frontend displays the error to the user and provides a
            Retry button. Temporary external API rate-limit responses
            are retried with backoff.
          </p>
        </section>

        {/* More Time */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-2xl font-semibold text-black">
            6. What I Would Do Differently With More Time
          </h2>

          <p className="mt-3 text-gray-700">
            With more time, I would improve large-file uploads using
            streaming or resumable uploads, add more detailed progress
            reporting, use Gnani webhooks where appropriate, add stronger
            authentication and authorization, add automated cleanup and
            retention policies, and introduce production monitoring and
            logging.
          </p>
        </section>

        {/* Tech Stack */}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-2xl font-semibold text-black">
            7. Technologies Used
          </h2>

          <p className="mt-3 text-gray-700">
            Frontend: Next.js and TypeScript
          </p>

          <p className="mt-2 text-gray-700">
            Backend: FastAPI and Python
          </p>

          <p className="mt-2 text-gray-700">
            Database: PostgreSQL
          </p>

          <p className="mt-2 text-gray-700">
            Storage: Supabase Storage
          </p>

          <p className="mt-2 text-gray-700">
            Background Jobs: Celery + Redis
          </p>

          <p className="mt-2 text-gray-700">
            Speech-to-Text: Gnani Batch STT
          </p>

          <p className="mt-2 text-gray-700">
            Summarization: Gemini
          </p>
        </section>

      </div>
    </main>
  );
}
