# Tandem — put your Claude in the meeting

Tandem is a local **MCP server** that lets your Claude agent join a Google Meet
as a real participant — it listens, talks back in a natural low-latency voice,
knows when to speak (and when to stay quiet), and answers with your Claude
session's full knowledge.

It runs natively on **Windows** (and macOS): a small Go binary drives a headless
Google Chrome that joins the call. All audio — hearing the meeting and speaking
back — happens inside Chrome, so there's nothing to install on your system audio
and no container required.

## Quick start (Windows)

You need three things: **Google Chrome**, **Claude Code**, and an **OpenAI API
key** ([platform.openai.com](https://platform.openai.com/api-keys), with billing
enabled — the Realtime API is pay-as-you-go).

1. **Build the binary** (needs [Go](https://go.dev/dl/)):

   ```powershell
   go build -o tandem.exe
   ```

2. **Add it to Claude Code:**

   ```powershell
   claude mcp add tandem `
     -e TANDEM_VOICE=realtime `
     -e TANDEM_OWNER="Your Name" `
     -e OPENAI_API_KEY=sk-proj-... `
     -- C:\path\to\tandem.exe
   ```

3. **Restart Claude Code** and just say:

   > join my meeting https://meet.google.com/abc-defg-hij

Claude joins as *"Your Name's Claude"*, and you talk. In realtime mode OpenAI
handles speech-in, reasoning, and voice-out, so `OPENAI_API_KEY` is the only key
required.

> **Chrome not found?** Set `CHROME_PATH` to your `chrome.exe`. Tandem auto-checks
> the standard Program Files / LocalAppData locations.

### How it behaves

- **1:1** (just you + the bot): conversational — answers your questions and
  greetings directly.
- **Group calls**: it stays out of the way — speaks only when you address it by
  name ("*Your Name's Claude*, …") or when you're following up on what it just
  said. No talking over people.
- When it needs real detail it doesn't have, it consults your Claude agent
  (`consult_agent`) — which can read your repo, files, git history, and sessions,
  and run commands — then speaks the answer. If the conversation has moved on by
  then, it drops the answer in the meeting chat instead of interrupting.
- It shows a small dithering-shader avatar whose color tracks its state — idle,
  listening, thinking, speaking.

## Meeting memory (optional)

Tandem's voice agent normally knows only the call it is sitting in. Point it at
a Tandem web deployment and it also gets `search_meetings` and
`list_upcoming_meetings` — the transcripts and calendar the web product
records:

```powershell
claude mcp add tandem `
  -e TANDEM_VOICE=realtime `
  -e TANDEM_WEB_URL=https://your-deployment `
  -e TANDEM_API_KEY=tdm_... `
  -- C:\path	o	andem.exe
```

Create the key in the web app under **Settings → API keys**. It is shown once,
stored only as a SHA-256 hash, and can be revoked there at any time. With
either variable unset the tools are simply not offered and nothing else
changes.

## Desktop app (optional UI)

Prefer a UI over driving it from Claude Code directly? [`app/`](app/) is a small
control panel — set your key, install into Claude, join a meeting, take notes.
Build a single-file `tandem-app.exe` with `cd app && deno task build:win`. See
[app/README.md](app/README.md).

## Cost

Realtime mode is billed by OpenAI per audio token (roughly $1–4/hr of active
meeting on `gpt-realtime-2.1-mini`, depending on how much is said). See
[OpenAI pricing](https://platform.openai.com/docs/pricing).

## MCP tools

`join_meeting`, `wait_for_turn`, `speak`, `send_chat`, `stage_answers`,
`get_transcript`, `get_participants`, `mute_yourself`, `unmute_yourself`,
`leave_meeting`.

## Configuration (env vars)

| Var | Default | Purpose |
|-----|---------|---------|
| `OPENAI_API_KEY` | — | **Required** for realtime mode. |
| `TANDEM_VOICE` | (classic) | Set to `realtime` for the one-key OpenAI voice. |
| `TANDEM_OWNER` | `Someone` | Who the bot represents; sets the display name. |
| `TANDEM_REALTIME_MODEL` | `gpt-realtime-2.1-mini` | Realtime model. |
| `TANDEM_REALTIME_VOICE` | `marin` | Voice (marin, cedar, alloy, coral, …). |
| `TANDEM_REALTIME_EFFORT` | `low` | Reasoning effort (minimal→xhigh). |
| `CHROME_PATH` | (auto) | Override the Chrome executable location. |

<details>
<summary>Classic pipeline (no OpenAI)</summary>

Without `TANDEM_VOICE=realtime`, Tandem uses Deepgram (STT) + Groq (fast layer) +
Orpheus/Together (TTS). That needs `DEEPGRAM_API_KEY`, `GROQ_API_KEY`, and
`TOGETHER_API_KEY`. The realtime path is simpler and recommended.
</details>

## How it works

Tandem launches Chrome and injects a hook that joins the Meet audio-only. The
hook captures every remote participant's audio in-browser (via
`MediaStreamTrackProcessor`) and replaces the bot's microphone track in-page with
the generated voice — so hearing and speaking both live inside Chrome, echo-free,
with no OS audio devices touched. A
[social-reasoning gate](research/README.md) decides when to talk; the Go MCP
server on stdio is what your Claude agent drives.

<details>
<summary>Linux / Docker (optional, headless server)</summary>

On Linux, Tandem can instead run fully headless in a container using PulseAudio
virtual devices + Xvfb (no desktop Chrome). Build with the included `Dockerfile`.
This path is kept for server use; the native desktop path above is the default.
</details>
