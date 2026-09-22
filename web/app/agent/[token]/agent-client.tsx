"use client";

import { useEffect, useRef, useState } from "react";
import { ruleGate, type GateTurn } from "@/lib/agent/gate";
import Avatar from "./avatar";

export type AgentState = "idle" | "listening" | "thinking" | "speaking";

const TRANSCRIPT_WS = "wss://meeting-data.bot.recall.ai/api/v1/transcript";

// Keep the gate's window small: it reasons about the last few turns, and
// an unbounded array in a long meeting is just a leak.
const TRANSCRIPT_WINDOW = 12;

export default function AgentClient({ token }: { token: string }) {
  const [state, setState] = useState<AgentState>("idle");
  const transcriptRef = useRef<GateTurn[]>([]);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    // Opens a Realtime session and speaks `answer` aloud. A fresh peer
    // connection per answer keeps the billing window tight — budget is
    // charged per grant, so holding an idle session open wastes it.
    async function speak(answer: string) {
      const res = await fetch("/api/agent/realtime-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        busyRef.current = false;
        setState("listening");
        return;
      }
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
      channel.onopen = () => {
        channel.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions:
                "Say the following to the meeting — same meaning, natural " +
                "delivery, one or two sentences: " +
                answer,
            },
          }),
        );
      };
      channel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type !== "response.done") return;
        setState("listening");
        peer.close();
        peerRef.current = null;
        busyRef.current = false;
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
      setState("speaking");
    }

    async function handleUtterance(speaker: string, text: string) {
      const transcript = transcriptRef.current;
      transcript.push({ speaker, text });
      if (transcript.length > TRANSCRIPT_WINDOW) transcript.shift();

      // One answer at a time. Queuing them would have the bot replying to
      // a question the room has already moved past.
      if (busyRef.current) return;

      const { decision } = ruleGate(text, transcript.slice(0, -1));
      if (decision !== "speak") return;

      busyRef.current = true;
      setState("thinking");

      const res = await fetch("/api/agent/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, question: text, speaker }),
      });

      if (!res.ok) {
        busyRef.current = false;
        setState("listening");
        return;
      }

      const { answer } = await res.json();
      transcript.push({ speaker: "TANDEM", text: answer });
      await speak(answer);
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
      void handleUtterance(speaker, text);
    };

    socket.onclose = () => setState("idle");

    return () => {
      socket.close();
      peerRef.current?.close();
    };
  }, [token]);

  return (
    <>
      <Avatar state={state} />
      <audio ref={audioRef} autoPlay />
    </>
  );
}
