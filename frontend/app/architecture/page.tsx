export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10 text-black">
      <div className="mx-auto max-w-5xl">

        <a
          href="/"
          className="text-blue-600 hover:underline"
        >
          ← Back to Audio Notes
        </a>

        <h1 className="mt-6 text-4xl font-bold text-black">
          Architecture
        </h1>

        <p className="mt-3 text-black">
          Audio Notes uses an asynchronous processing pipeline so that
          long audio files do not block the user's request.
        </p>

        {/* System Flow */}

        <section className="mt-8 rounded-xl bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-black">
            System Flow
          </h2>

          <div className="mt-6 space-y-3 text-center font-medium">

            <div className="rounded-lg border bg-gray-100 p-4 text-black">
              Next.js Frontend
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-lg border bg-gray-100 p-4 text-black">
              FastAPI Backend
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-lg border bg-gray-100 p-4 text-black">
              Supabase Storage + PostgreSQL
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-lg border bg-gray-100 p-4 text-black">
              Celery + Redis
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-lg border bg-gray-100 p-4 text-black">
              Background Worker
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-lg border bg-gray-100 p-4 text-black">
              Gnani Batch STT
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-lg border bg-gray-100 p-4 text-black">
              Gemini LLM
            </div>

            <div className="text-black">↓</div>

            <div className="rounded-lg border bg-gray-100 p-4 text-black">
              PostgreSQL
            </div>

          </div>
        </section>

        {/* Upload Flow */}

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-black">
            1. Upload Flow
          </h2>

          <p className="mt-3 text-black">
            The user selects an audio file in the Next.js frontend.
            The file is sent to FastAPI using a multipart upload.
          </p>

          <p className="mt-3 text-black">
            FastAPI stores the audio file in the private Supabase
            Storage bucket and creates an audio_notes row in PostgreSQL.
            The row starts in the QUEUED state.
          </p>
        </section>

        {/* Background Jobs */}

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-black">
            2. Background Processing
          </h2>

          <p className="mt-3 text-black">
            FastAPI places a Celery task into Redis and immediately
            returns the note ID to the frontend.
          </p>

          <p className="mt-3 text-black">
            A Celery worker consumes the task and performs the
            long-running transcription and summarization work.
          </p>
        </section>

        {/* Transcription */}

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-black">
            3. Transcription
          </h2>

          <p className="mt-3 text-black">
            The worker downloads the audio from private storage and
            sends it to the Gnani Batch STT API.
          </p>

          <p className="mt-3 text-black">
            Gnani Batch processing is asynchronous. The worker creates
            a job, starts it, polls its status, and downloads the
            resulting transcript after completion.
          </p>
        </section>

        {/* Summary */}

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-black">
            4. Summarization
          </h2>

          <p className="mt-3 text-black">
            After transcription completes, the worker sends the
            transcript to a Gemini model to generate a concise summary
            and important key points.
          </p>

          <p className="mt-3 text-black">
            Both the transcript and summary are stored in PostgreSQL.
          </p>
        </section>

        {/* Long Audio */}

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-black">
            5. Long Audio Handling
          </h2>

          <p className="mt-3 text-black">
            Long recordings are processed asynchronously instead of
            keeping the browser request open. The frontend polls the
            note status every few seconds and displays stages such as
            QUEUED, TRANSCRIBING, SUMMARIZING, and COMPLETED.
          </p>

          <p className="mt-3 text-black">
            Audio is stored in object storage rather than PostgreSQL,
            keeping the database focused on metadata and generated text.
          </p>
        </section>

        {/* Sync vs Async */}

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-black">
            6. Why Background Processing?
          </h2>

          <p className="mt-3 text-black">
            Transcription of long audio can take significantly longer
            than a normal HTTP request. Running it synchronously would
            leave the upload request waiting and makes failures harder
            to handle.
          </p>

          <p className="mt-3 text-black">
            Using Celery and Redis separates the upload request from
            long-running processing and allows the worker to retry or
            recover from temporary external API failures.
          </p>
        </section>

        {/* Failure Handling */}

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-black">
            7. Failure Handling
          </h2>

          <p className="mt-3 text-black">
            Processing failures are stored in the database along with
            an error message. The frontend displays the failure and
            provides a Retry action.
          </p>

          <p className="mt-3 text-black">
            Temporary API rate limits and service errors are retried
            with backoff where appropriate.
          </p>
        </section>

        {/* Future Improvements */}

        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold text-black">
            8. What I Would Improve With More Time
          </h2>

          <p className="mt-3 text-black">
            With more development time, I would add streaming or
            chunked uploads for very large files, more detailed progress
            reporting, webhook-based transcription completion, stronger
            authentication and authorization, automated cleanup of old
            files, and production monitoring.
          </p>
        </section>

      </div>
    </main>
  );
}