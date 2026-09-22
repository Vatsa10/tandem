import { createDeepSeek } from "@ai-sdk/deepseek";
import { env } from "@/lib/env";

// Lazy — reading env.DEEPSEEK_API_KEY at module load time would make any
// build that imports this file fail before the key is even needed.
let chatModel: ReturnType<ReturnType<typeof createDeepSeek>> | undefined;

export function getChatModel() {
  if (!chatModel) {
    const deepseek = createDeepSeek({ apiKey: env.DEEPSEEK_API_KEY });
    chatModel = deepseek("deepseek-chat");
  }
  return chatModel;
}
