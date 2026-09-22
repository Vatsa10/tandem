"use client";

import { useEffect, useRef } from "react";
import type { AgentState } from "./agent-client";

// This is the bot's video tile in the meeting — the only thing anyone in
// the call sees of Tandem. It has one job: make the agent's state legible
// at a glance, so nobody wonders whether it heard them.
const COLORS: Record<AgentState, string> = {
  idle: "#3f3f46",
  listening: "#22d3ee",
  thinking: "#a78bfa",
  speaking: "#34d399",
};

export default function Avatar({ state }: { state: AgentState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Read inside the animation loop rather than restarting the loop on
  // every state change — the loop runs for the whole meeting.
  const stateRef = useRef<AgentState>(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frame = 0;

    function draw(now: number) {
      if (!canvas || !context) return;

      const { width, height } = canvas;
      context.fillStyle = "#0a0a0a";
      context.fillRect(0, 0, width, height);

      // Breathing pulse — slow when idle, quicker while speaking, so the
      // tile reads as alive without being distracting.
      const speed = stateRef.current === "speaking" ? 400 : 1400;
      const pulse = 0.5 + 0.5 * Math.sin(now / speed);
      const radius = Math.min(width, height) * (0.22 + 0.05 * pulse);

      context.beginPath();
      context.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      context.fillStyle = COLORS[stateRef.current];
      context.globalAlpha = 0.85;
      context.fill();
      context.globalAlpha = 1;

      context.font = "500 28px ui-sans-serif, system-ui, sans-serif";
      context.fillStyle = "#e4e4e7";
      context.textAlign = "center";
      context.fillText("Tandem", width / 2, height / 2 + radius + 56);

      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
