import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { and, asc, eq } from "drizzle-orm";
import { formatMeetingWhen } from "@/lib/format-date";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { meetings, transcriptChunks } from "@/lib/db/schema";
import { TranscriptDocument } from "@/lib/pdf/transcript-document";

const FORMATS = ["txt", "srt", "pdf"] as const;
type ExportFormat = (typeof FORMATS)[number];

function isExportFormat(value: string): value is ExportFormat {
  return (FORMATS as readonly string[]).includes(value);
}

function formatClockTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

// SRT requires HH:MM:SS,mmm — comma decimal separator, always zero-padded.
function formatSrtTimestamp(ms: number): string {
  const totalMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  return (
    `${hours.toString().padStart(2, "0")}:` +
    `${minutes.toString().padStart(2, "0")}:` +
    `${seconds.toString().padStart(2, "0")},` +
    `${millis.toString().padStart(3, "0")}`
  );
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "meeting"
  );
}

function buildTxt(
  title: string,
  dateLabel: string | null,
  chunks: { speaker: string | null; startMs: number; text: string }[],
): string {
  const header = `${title}\n${dateLabel ?? "Date unknown"} · Transcribed by Tandem\n${"=".repeat(40)}\n\n`;
  const body = chunks
    .map(
      (c) =>
        `[${formatClockTimestamp(c.startMs)}] ${c.speaker ?? "Unknown"}: ${c.text}`,
    )
    .join("\n\n");
  return header + body + "\n";
}

function buildSrt(
  chunks: { speaker: string | null; startMs: number; endMs: number; text: string }[],
): string {
  return chunks
    .map((c, i) => {
      // Guard against zero/negative-duration cues (bad end_ms upstream) —
      // a cue must span at least a moment to render in most players.
      const end = Math.max(c.endMs, c.startMs + 500);
      return (
        `${i + 1}\n` +
        `${formatSrtTimestamp(c.startMs)} --> ${formatSrtTimestamp(end)}\n` +
        `${c.speaker ?? "Unknown"}: ${c.text}\n`
      );
    })
    .join("\n");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const formatParam = url.searchParams.get("format") ?? "txt";

  if (!isExportFormat(formatParam)) {
    return Response.json(
      { error: `format must be one of: ${FORMATS.join(", ")}` },
      { status: 400 },
    );
  }

  const userId = await getCurrentUserId();

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, userId)));

  if (!meeting) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  }

  const chunks = await db
    .select({
      speaker: transcriptChunks.speaker,
      startMs: transcriptChunks.startMs,
      endMs: transcriptChunks.endMs,
      text: transcriptChunks.text,
    })
    .from(transcriptChunks)
    .where(eq(transcriptChunks.meetingId, meeting.id))
    .orderBy(asc(transcriptChunks.startMs));

  if (chunks.length === 0) {
    return Response.json(
      { error: "No transcript available for this meeting" },
      { status: 400 },
    );
  }

  const title = meeting.title ?? "Untitled meeting";
  const dateLabel = meeting.startedAt
    ? formatMeetingWhen(meeting.startedAt)
    : null;
  const filenameBase = slugify(title);

  if (formatParam === "txt") {
    return new Response(buildTxt(title, dateLabel, chunks), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.txt"`,
      },
    });
  }

  if (formatParam === "srt") {
    return new Response(buildSrt(chunks), {
      headers: {
        "Content-Type": "application/x-subrip; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.srt"`,
      },
    });
  }

  const pdfBuffer = await renderToBuffer(
    createElement(TranscriptDocument, {
      title,
      dateLabel,
      summary: meeting.summary,
      chunks,
    }),
  );

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
}
