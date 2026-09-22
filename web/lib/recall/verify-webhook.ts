import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// Svix-compatible scheme: https://docs.recall.ai/docs/authenticating-requests-from-recallai
export function verifyRecallWebhookSignature(
  headers: Headers,
  rawBody: string,
): boolean {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const secretBytes = Buffer.from(
    env.RECALL_WEBHOOK_SECRET.replace(/^whsec_/, ""),
    "base64",
  );
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  return signatureHeader.split(" ").some((candidate) => {
    const [, sig] = candidate.split(",");
    if (!sig) return false;
    const sigBuf = Buffer.from(sig);
    return (
      sigBuf.length === expectedBuf.length &&
      timingSafeEqual(sigBuf, expectedBuf)
    );
  });
}
