import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assistantRequestSchema } from "@/lib/ai-assistant/contracts";

export const askAiAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(assistantRequestSchema)
  .handler(async ({ data, context }) => {
    const { runAiAssistant } = await import("@/lib/ai-assistant/assistant.server");
    return runAiAssistant({ request: data, context });
  });
