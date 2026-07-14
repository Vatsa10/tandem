# Tandem — desktop app (UI)

A small control-panel UI for Tandem: set your name + OpenAI key, install Tandem
as an MCP server into Claude, join a Google Meet, and take notes — **no Docker**.

It's a plain [Deno](https://deno.com) HTTP server serving a vanilla web UI. On
**Windows/Linux** it opens in your default browser; on macOS it can also run as a
native `deno desktop` window.

## Run (Windows)

Build the single-file app once, then double-click it:

```powershell
# from the repo root, build the engine first:
go build -o tandem.exe

# then the app:
cd app
deno task build:win     # -> app/dist/tandem-app.exe  (bundles Deno + web + tandem.exe)
```

Run `dist\tandem-app.exe` — it starts a local server and opens the UI in your
browser. No Deno install needed to *run* it (only to build).

Prefer not to compile? With Deno installed: `deno task serve` (opens the browser).
Set `TANDEM_NO_OPEN=1` to suppress the auto-open.

First launch: enter your name + OpenAI key, click **Install into Claude**, then
**Join a meeting** (full link or a bare `abc-defg-hij` code).

## What it does

- **Google Meet** — sends your Claude into a meeting as a participant that
  listens, knows when to speak, and talks. Runs the OpenAI Realtime session
  inside the meeting page — **only an OpenAI key**. The app spawns the native
  `tandem` binary and drives it over MCP.
- **Notes** — save transcripts to `~/.tandem/notes/*.md`; read, summarize, delete.
- **Settings** — name, voice/model, API keys, and a readiness panel (binary,
  Chrome, keys). Keys live locally in `~/.tandem/config.json`.
- **Install into Claude** — registers the native `tandem` binary as an MCP server
  in Claude Desktop + Claude Code (no Docker). Builds it automatically if needed.

## Requirements

- **Google Chrome** (auto-detected; `CHROME_PATH` to override).
- **Deno** 2.9+ — to build/run the app.
- **Go** — to build the `tandem` engine (or the app builds it for you).

## Architecture

```
web/        UI (vanilla HTML/CSS/JS, no build step)
main.ts     Deno.serve HTTP + JSON API; opens the browser (or native window on macOS)
backend.ts  settings, status/deps detection, MCP install, notes, go build — cross-platform
mcp.ts      MCP stdio client — app drives the native tandem binary
calendar.ts optional Google Calendar (upcoming events + Meet links)
```

> **Direct-mic mode** (macOS ffmpeg/avfoundation) is not wired for Windows — the
> Meet path above is the supported flow here.
