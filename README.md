# Tandem

Tandem puts an AI teammate in your meetings. It joins Zoom, Google Meet, and
Microsoft Teams, and does two things:

- **Notetaker** — records the call, produces a speaker-attributed transcript, a
  summary, action items, and highlights, then answers questions about it
  afterwards (RAG chat with citations, per-meeting or across a category).
- **Live agent** — during the call it listens, knows when to speak, and answers
  out loud, grounded in the transcript so far and your past meetings. When
  speaking would interrupt, it answers in the meeting chat instead.

Both features are the same bot on the same meeting record, over the same
corpus: the live agent's answers come from the notetaker's history.

## Layout

| Path | What |
|------|------|
| `web/` | The product. Next.js 16 app — dashboard, notetaker pipeline, RAG chat, live agent. See [`web/README.md`](./web/README.md). |
| `tools/tandem/` | Standalone MCP server (Go): drives a headless Chrome so **your own Claude Code session** joins a Google Meet and talks. Local dev tool, not part of the hosted product. See [`tools/tandem/README.md`](./tools/tandem/README.md). |
| `docs/` | Specs and design documents. |

## Quick start

```bash
cd web
npm install
npm run dev
```

Environment setup, service accounts, and migrations: [`web/README.md`](./web/README.md).
