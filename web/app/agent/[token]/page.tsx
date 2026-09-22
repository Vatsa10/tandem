import AgentClient from "./agent-client";

// Recall's browser loads this page and streams its audio and video into
// the meeting. It renders for a bot, not a person: no chrome, no nav, no
// Clerk. The token in the path is the only credential — see
// lib/agent/sessions.ts.
export const dynamic = "force-dynamic";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main
      style={{
        margin: 0,
        width: "100vw",
        height: "100vh",
        background: "#0a0a0a",
        display: "grid",
        placeItems: "center",
      }}
    >
      <AgentClient token={token} />
    </main>
  );
}
