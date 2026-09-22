"use client";

import { useEffect, useRef, useState } from "react";
import { ruleGate, type GateTurn } from "@/lib/agent/gate";
import { realtimeToolSpecs, runsOnClient } from "@/lib/agent/tools";
import { BOT_DISPLAY_NAME } from "@/lib/agent/trigger";
import Avatar from "./avatar";

export type AgentState = "idle" | "listening" | "thinking" | "speaking";

const TRANSCRIPT_WS = "wss://meeting-data.bot.recall.ai/api/v1/transcript";

// The gate reasons about the last few turns, and an unbounded array in a
// long meeting is just a leak. The get_transcript tool reads from the same
// buffer, so this is also how far back the agent can look without asking
// the server.
const TRANSCRIPT_WINDOW = 40;

const PERSONA =
  `You are ${BOT_DISPLAY_NAME}, sitting in a live meeting as a participant. ` +
  "You are speaking out loud to a room of people, so: one or two sentences, " +
  "plain spoken language, no markdown, no lists read aloud. " +
  "You have tools. Use search_meetings before answering anything about what " +
  "was said or decided previously — do not guess at the history. Use " +
  "get_transcript to catch up on this call. If an answer is long, contains a " +
  "link, or the conversation has already moved on, call send_chat instead of " +
  "saying it. If you do not know and no tool helps, say so briefly.";

export default function AgentClient({ token }: { token: string }) {
  const [state, setState] = useState<AgentState>("idle");
  const transcriptRef = useRef<GateTurn[]>([]);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const busyRef = useRef(false);
  // What the agent is currently answering, so the spoken reply can be
  // recorded against the question that prompted it.
  const pendingRef = useRef<{ speaker: string; question: string } | null>(null);

  useEffect(() => {
    let closed = false;

    // Tools that need the database, the Recall key or the OpenAI key run
    // behind /api/agent/tool. get_transcript is the exception — this page
    // holds the live transcript, so answering it here saves a round trip
    // and works even if the server is slow.
    async function runTool(name: string, args: Record<string, unknown>) {
      if (runsOnClient(name)) {
        const limit = Number(args.limit ?? 20);
        const recent = transcriptRef.current.slice(-limit);
        if (recent.length === 0) return "Nothing has been said yet.";
        return recent.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n");
      }

      const res = await fetch("/api/agent/tool", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name, args }),
      });
      if (!res.ok) return `The ${name} tool is unavailable.`;
      const { result } = await res.json();
      return result as string;
    }

    function send(message: unknown) {
      channelRef.current?.send(JSON.stringify(message));
    }

    function finishTurn() {
      busyRef.current = false;
      if (!closed) setState("listening");
    }

    // Persist the exchange so the chat responder and the next voice turn
    // see what was already said out loud.
    async function recordTurn(spoken: string) {
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (!pending || !spoken.trim()) return;

      await fetch("/api/agent/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          speaker: pending.speaker,
          question: pending.question,
          answer: spoken,
        }),
      }).catch(() => {
        // A failed log must not take the agent down mid-meeting.
      });
    }

    // The spoken words come back on response.done as the transcript of each
    // audio part.
    function spokenText(response: unknown): string {
      const output =
        (response as { output?: Array<{ content?: Array<{ transcript?: string }> }> })
          ?.output ?? [];
      return output
        .flatMap((item) => item.content ?? [])
        .map((part) => part.transcript ?? "")
        .join(" ")
        .trim();
    }

    async function handleRealtimeEvent(message: {
      type: string;
      name?: string;
      call_id?: string;
      arguments?: string;
      response?: unknown;
    }) {
      // The model asked for a tool. Run it, hand the output back as a
      // function_call_output item, then ask for the spoken answer.
      if (message.type === "response.function_call_arguments.done") {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(message.arguments ?? "{}");
        } catch {
          args = {};
        }

        const output = await runTool(message.name ?? "", args);

        send({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: message.call_id,
            output,
          },
        });
        send({ type: "response.create" });
        return;
      }

      if (message.type === "response.done") {
        const spoken = spokenText(message.response);
        if (spoken) {
          transcriptRef.current.push({ speaker: BOT_DISPLAY_NAME, text: spoken });
          void recordTurn(spoken);
        }
        finishTurn();
      }
      if (message.type === "error") {
        pendingRef.current = null;
        finishTurn();
      }
    }

    // One session for the whole meeting: tools and persona are configured
    // once, and each answered question is a `response.create` on it. The
    // budget is granted in slices, so the session is opened on the first
    // question rather than at page load — an idle bot costs nothing.
    async function openSession(): Promise<boolean> {
      if (peerRef.current) return true;

      const res = await fetch("/api/agent/realtime-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) return false;
      const { clientSecret } = await res.json();

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      peer.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
          void audioRef.current.play();
        }
      };

      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;

      channel.onopen = () => {
        send({
          type: "session.update",
          session: {
            type: "realtime",
            instructions: PERSONA,
            tools: realtimeToolSpecs(),
            tool_choice: "auto",
            // The page hears the meeting through Recall's transcript
            // websocket, not through a microphone, so the model gets text
            // in and speaks audio out.
            output_modalities: ["audio"],
          },
        });
      };

      channel.onmessage = (event) => {
        void handleRealtimeEvent(JSON.parse(event.data));
      };

      const offer = await peer.createOffer({ offerToReceiveAudio: true });
      await peer.setLocalDescription(offer);

      const sdp = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      await peer.setRemoteDescription({ type: "answer", sdp: await sdp.text() });
      return true;
    }

    async function answer(speaker: string, text: string) {
      if (!(await openSession())) {
        pendingRef.current = null;
        finishTurn();
        return;
      }

      send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: `${speaker} said: ${text}` }],
        },
      });
      send({ type: "response.create" });
      setState("speaking");
    }

    function handleUtterance(speaker: string, text: string) {
      const transcript = transcriptRef.current;
      transcript.push({ speaker, text });
      if (transcript.length > TRANSCRIPT_WINDOW) transcript.shift();

      // One answer at a time. Queuing them would have the bot replying to a
      // question the room has already moved past.
      if (busyRef.current) return;

      const { decision } = ruleGate(text, transcript.slice(0, -1));
      if (decision !== "speak") return;

      busyRef.current = true;
      pendingRef.current = { speaker, question: text };
      setState("thinking");
      void answer(speaker, text);
    }

    const socket = new WebSocket(TRANSCRIPT_WS);

    socket.onopen = () => setState("listening");

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const words = message?.data?.words;
      if (!Array.isArray(words) || words.length === 0) return;

      const text = words
        .map((w: { text: string }) => w.text)
        .join(" ")
        .trim();
      if (!text) return;

      const speaker = message?.data?.participant?.name ?? "Someone";
      if (speaker === BOT_DISPLAY_NAME) return;

      handleUtterance(speaker, text);
    };

    socket.onclose = () => setState("idle");

    return () => {
      closed = true;
      socket.close();
      channelRef.current?.close();
      peerRef.current?.close();
      channelRef.current = null;
      peerRef.current = null;
    };
  }, [token]);

  return (
    <>
      <Avatar state={state} />
      <audio ref={audioRef} autoPlay />
    </>
  );
}
