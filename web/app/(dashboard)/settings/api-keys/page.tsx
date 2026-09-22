import { ApiKeyManager } from "@/components/api-key-manager";
import { PageHeader } from "@/components/ui/page-header";
import { listApiKeys } from "@/lib/agent/api-key-store";
import { getCurrentUserId } from "@/lib/auth";

// Keys are created and revoked between requests, so this must not be frozen
// at build time.
export const dynamic = "force-dynamic";

export default async function ApiKeysSettingsPage() {
  const userId = await getCurrentUserId();
  const keys = await listApiKeys(userId);

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <PageHeader
        eyebrow="Access"
        title="API keys"
        description="Give the Tandem MCP server on your own machine access to your meeting history, so the local voice agent can answer from past calls."
      />

      <ApiKeyManager
        initialKeys={keys.map((key) => ({
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          createdAt: key.createdAt.toISOString(),
          lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
