"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Note = {
  id: number;
  filename: string;
  file_size: number;
  status: string;
  transcript?: string | null;
  summary?: string | null;
  error_message?: string | null;
  created_at?: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // -----------------------------------------
  // Load previous notes
  // -----------------------------------------

  async function loadNotes() {
    try {
      const response = await fetch(`${API_URL}/notes`);

      if (!response.ok) {
        throw new Error("Failed to load notes");
      }

      const data = await response.json();
      setNotes(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadNotes();
  }, []);

  // -----------------------------------------
  // Upload file
  // -----------------------------------------

  async function uploadFile() {
    if (!file) {
      setError("Please select an audio file.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/notes`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      const noteResponse = await fetch(
        `${API_URL}/notes/${data.id}`
      );

      const note = await noteResponse.json();

      setSelectedNote(note);
      setFile(null);

      // Reset file input
      const input = document.getElementById(
        "audio-upload"
      ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      await loadNotes();

      pollNote(data.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  }

  // -----------------------------------------
  // Poll processing status
  // -----------------------------------------

  async function pollNote(id: number) {
    try {
      const response = await fetch(
        `${API_URL}/notes/${id}`
      );

      const note: Note = await response.json();

      setSelectedNote(note);
      await loadNotes();

      if (
        note.status !== "COMPLETED" &&
        note.status !== "FAILED"
      ) {
        setTimeout(() => {
          pollNote(id);
        }, 3000);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // -----------------------------------------
  // Open previous note
  // -----------------------------------------

  async function openNote(id: number) {
    try {
      const response = await fetch(
        `${API_URL}/notes/${id}`
      );

      const note = await response.json();

      setSelectedNote(note);

      if (
        note.status !== "COMPLETED" &&
        note.status !== "FAILED"
      ) {
        pollNote(id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // -----------------------------------------
  // Retry failed note
  // -----------------------------------------

  async function retryNote(id: number) {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/notes/${id}/retry`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Retry failed");
      }

      setSelectedNote((previous) =>
        previous
          ? {
              ...previous,
              status: "QUEUED",
              error_message: null,
            }
          : previous
      );

      await loadNotes();
      pollNote(id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Retry failed"
      );
    }
  }

  // -----------------------------------------
  // Status styling
  // -----------------------------------------

  function getStatusClass(status: string) {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";

      case "FAILED":
        return "bg-red-100 text-red-700";

      case "TRANSCRIBING":
        return "bg-yellow-100 text-yellow-700";

      case "SUMMARIZING":
        return "bg-purple-100 text-purple-700";

      case "UPLOADING":
        return "bg-orange-100 text-orange-700";

      default:
        return "bg-blue-100 text-blue-700";
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 text-black sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">

        {/* --------------------------------------- */}
        {/* Header */}
        {/* --------------------------------------- */}

        <div className="mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-black">
                Audio Notes
              </h1>

              <p className="mt-2 text-gray-600">
                Upload audio and get an AI-powered transcript and summary.
              </p>
            </div>

            <a
              href="/architecture"
              className="w-fit text-sm font-medium text-blue-600 hover:underline"
            >
              View Architecture →
            </a>
          </div>
        </div>

        {/* --------------------------------------- */}
        {/* Upload Card */}
        {/* --------------------------------------- */}

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-2xl font-semibold text-black">
            Upload Audio
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Select an audio recording to transcribe and summarize.
          </p>

          {/* Custom file picker */}

          <div className="mt-5 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center transition hover:border-gray-400">

            <input
              id="audio-upload"
              type="file"
              accept="audio/*"
              onChange={(e) =>
                setFile(e.target.files?.[0] || null)
              }
              className="hidden"
            />

            <label
              htmlFor="audio-upload"
              className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800"
            >
              Choose Audio File
            </label>

            <p className="mt-3 text-sm font-medium text-gray-700">
              {file
                ? file.name
                : "No audio file selected"}
            </p>

            {file && (
              <div className="mt-1 text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}

            {!file && (
              <p className="mt-1 text-xs text-gray-500">
                Supported audio formats
              </p>
            )}
          </div>

          {/* Upload button */}

          <button
            onClick={uploadFile}
            disabled={uploading || !file}
            className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {uploading
              ? "Uploading..."
              : "Upload & Process"}
          </button>

          {/* Error */}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* --------------------------------------- */}
        {/* Selected Note */}
        {/* --------------------------------------- */}

        {selectedNote && (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">

            {/* Note header */}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="break-all text-2xl font-semibold text-black">
                  {selectedNote.filename}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Note #{selectedNote.id}
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${getStatusClass(
                  selectedNote.status
                )}`}
              >
                {selectedNote.status}
              </span>
            </div>

            {/* Processing state */}

            {selectedNote.status !== "COMPLETED" &&
              selectedNote.status !== "FAILED" && (
                <div className="mt-6 rounded-xl bg-gray-50 p-5">
                  <p className="font-semibold text-black">
                    Processing your audio...
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    Current stage:{" "}
                    <span className="font-medium text-black">
                      {selectedNote.status}
                    </span>
                  </p>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    This page automatically checks for updates.
                  </p>
                </div>
              )}

            {/* Failed state */}

            {selectedNote.status === "FAILED" && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
                <p className="font-semibold text-red-700">
                  Processing failed
                </p>

                <p className="mt-2 break-words text-sm text-red-600">
                  {selectedNote.error_message ||
                    "An unexpected error occurred."}
                </p>

                <button
                  onClick={() =>
                    retryNote(selectedNote.id)
                  }
                  className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Transcript */}

            {selectedNote.transcript && (
              <section className="mt-7">
                <h3 className="mb-3 text-xl font-semibold text-black">
                  Transcript
                </h3>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 leading-7 text-black whitespace-pre-wrap">
                  {selectedNote.transcript}
                </div>
              </section>
            )}

            {/* Summary */}

            {selectedNote.summary && (
              <section className="mt-7">
                <h3 className="mb-3 text-xl font-semibold text-black">
                  Summary
                </h3>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 leading-7 text-black whitespace-pre-wrap">
                  {selectedNote.summary}
                </div>
              </section>
            )}
          </div>
        )}

        {/* --------------------------------------- */}
        {/* Previous Notes */}
        {/* --------------------------------------- */}

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-2xl font-semibold text-black">
            Previous Notes
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Click a note to reopen its transcript and summary.
          </p>

          <div className="mt-5">
            {notes.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-500">
                No uploads yet.
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() =>
                      openNote(note.id)
                    }
                    className="flex w-full flex-col gap-3 rounded-xl border border-gray-200 p-4 text-left transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-black">
                        {note.filename}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Note #{note.id}
                      </p>
                    </div>

                    <span
                      className={`w-fit shrink-0 rounded-full px-3 py-1 text-sm font-medium ${getStatusClass(
                        note.status
                      )}`}
                    >
                      {note.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}