# Tandem — Windows-native rebrand of Vox

**Date:** 2026-07-14
**Status:** Approved design, pre-implementation

## Goal

Turn the `vox` codebase into **Tandem**, a standalone product (not framed as a
fork) that runs natively on **Windows**, driven locally by the user's Claude
Code. An AI presence that joins a Google Meet, listens, and talks back in a
low-latency voice backed by the user's Claude agent.

Non-goals (explicitly dropped):
- Deploy-to-a-host / always-on cloud server. Local Windows PC only.
- macOS native app (`app/`) — deleted.
- Native rewrite of the Linux audio stack — unnecessary (see Key Insight).

## Key Insight

The code already has two audio backends:

- **Container path** (`ms.container = GOOS == "linux"`, `meet.go:180`):
  PulseAudio + Xvfb virtual devices. Linux-only.
- **In-browser path** (every other OS, the `else` branch `meet.go:214`): mic-in
  via WebAudio / `MediaStreamTrackProcessor` in `hook.js`, voice-out by
  replacing the mic track in-page (`meet.go:152`). **No PulseAudio, no Xvfb, no
  ffmpeg — just Chrome + the Go binary.**

On Windows `GOOS != "linux"`, so it already selects the in-browser path. The
Linux-only files (`pulse.go`, `xvfb.go`, `pulseio.go`) are pure Go + `os/exec`;
they compile on Windows and only *execute* inside the container branch, so they
are inert at runtime. "Native Windows core" therefore reduces to: make the
in-browser path find Chrome on Windows, build it, and prove it on a live call.

## Part A — Native Windows core

1. **`chromePath()` (`meet.go:131`)** — add Windows locations, checked after
   `CHROME_PATH`:
   - `%ProgramFiles%\Google\Chrome\Application\chrome.exe`
   - `%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe`
   - `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`
   - Chromium equivalents; fall back to `chrome.exe` on PATH.
   Use `os.Getenv` for the env-var roots (works cross-platform; harmless on
   mac/linux since those vars are empty there).

2. **Build** — `go build -o tandem.exe`. No build tags added; `pulse.go` /
   `xvfb.go` compile fine and never run on Windows. Add one `// ponytail:` note
   at the container branch explaining they're Linux-only-at-runtime.

3. **Live-call verification (the gate)** — the in-browser path is commented
   "flaky" and is untested on Windows Chrome. Before claiming done, run a real
   Google Meet on Windows in realtime mode and confirm: (a) the bot hears a
   spoken question, (b) the bot's voice is audible to the meeting. If audio-out
   fails, that is the one place real debugging may be needed (track-replacement
   in `hook.js`). This is the milestone that de-risks the whole project.

4. **Run flow (docs)** — no Docker:
   ```
   go build -o tandem.exe
   claude mcp add tandem -- C:\path\to\tandem.exe
   # with env: TANDEM_VOICE=realtime, OPENAI_API_KEY=sk-..., TANDEM_OWNER="Your Name"
   ```
   Realtime mode needs only `OPENAI_API_KEY`.

## Part B — Rebrand to Tandem

Mechanical but wide (351 occurrences across the kept files). Scope:

- **Env vars** `VOX_*` → `TANDEM_*` (all 19). Breaking change, acceptable for a
  fresh product. Update every reader in `*.go` and any script/docs.
- **Identifiers / strings**: `serverName = "vox"` → `"tandem"` (`mcp.go:27`);
  binary `tandem.exe`; user dir `~/.vox` → `~/.tandem` (`main.go:26`); log
  prefixes `[vox]` → `[tandem]`; temp/profile names `vox-chrome-*`,
  `vox-silence.wav` → `tandem-*`.
- **Module path** `github.com/AugmentedEmpathy/vox` → the user's own repo.
  **Default: `github.com/Vatsa10/tandem`** — confirm at review. Update `go.mod`
  and any internal import (package is `main`, so likely just `go.mod`).
- **README** — rewritten Windows-first as an original product. Remove the
  denoland/littledivy fork framing, the `app/` section, and Docker as the
  primary path (keep a short "Linux/Docker (optional)" note). Screenshots left
  as-is unless the user supplies new ones.
- **Keep** the container code working (`pulse.go`, `xvfb.go`, `pulseio.go`,
  `Dockerfile`, `docker-entrypoint.sh`, `build.sh`, the container branch) — just
  demote it in docs. Rename its `vox_*` PulseAudio device names + `VOX_*` refs
  for consistency.

## Deletions

- `app/` — entire macOS Deno Desktop app. Removes ~half the rename surface.
- Any README/link references pointing into `app/`.

## Testing

- **Build check**: `go build -o tandem.exe` succeeds on Windows.
- **Smoke**: `tandem.exe` starts, logs `MCP server ready (stdio) — tandem`.
- **Live gate (manual)**: one real Google Meet call on Windows, realtime mode,
  round-trip audio confirmed (hear-in + speak-out). This is required before
  "done" — the project's core risk lives here.
- No new unit-test framework; the live call is the meaningful test.

## Open item for review

- Confirm the module path / GitHub repo name before the rename touches `go.mod`.
