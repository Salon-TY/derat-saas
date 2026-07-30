import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Bot, Loader2, Sparkles, User } from "lucide-react";

import { askAiAssistant } from "@/lib/api/ai-assistant.functions";
import {
  AI_MAX_HISTORY_MESSAGE_LENGTH,
  AI_MAX_HISTORY_MESSAGES,
  AI_MAX_MESSAGE_LENGTH,
  type AssistantLink,
} from "@/lib/ai-assistant/contracts";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  links?: AssistantLink[];
};

const STARTER_PROMPTS = [
  "Quelles interventions sont prévues aujourd’hui ?",
  "Quels rapports sont à vérifier ?",
  "Quelles factures sont en retard ?",
];

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AiAssistantPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Bonjour. Je peux consulter vos clients, interventions, documents et stocks, sans rien modifier.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 250);
    return () => window.clearTimeout(timer);
  }, [open]);

  async function submitMessage(content: string) {
    const message = content.trim();
    if (!message || loading || message.length > AI_MAX_MESSAGE_LENGTH) return;

    const history = messages
      .filter((item) => item.id !== "welcome")
      .slice(-AI_MAX_HISTORY_MESSAGES)
      .map(({ role, content: historyContent }) => ({
        role,
        content: historyContent.slice(0, AI_MAX_HISTORY_MESSAGE_LENGTH),
      }));
    setMessages((current) => [...current, { id: messageId(), role: "user", content: message }]);
    setDraft("");
    setLoading(true);

    try {
      const reply = await askAiAssistant({
        data: {
          message,
          history,
        },
      });
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          content: reply.answer,
          links: reply.links,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          content:
            "La consultation est indisponible pour le moment. Vérifiez votre connexion puis réessayez.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submitMessage(draft);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-w-none flex-col gap-0 overflow-hidden p-0 [&>button]:text-primary-foreground [&>button]:hover:bg-white/10 sm:max-w-md">
        <SheetHeader className="border-b bg-primary px-5 py-5 pr-14 text-left text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-foreground/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-primary-foreground">Assistant IA</SheetTitle>
              <SheetDescription className="mt-1 text-primary-foreground/70">
                Consultation sécurisée en lecture seule
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 bg-muted/20">
          <div className="space-y-4 px-4 py-5">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={message.id}
                  className={cn("flex items-start gap-3", !isAssistant && "flex-row-reverse")}
                >
                  <div
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-xl",
                      isAssistant ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent",
                    )}
                    aria-hidden="true"
                  >
                    {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      isAssistant
                        ? "rounded-tl-md border bg-card text-foreground shadow-soft"
                        : "rounded-tr-md bg-primary text-primary-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    {message.links && message.links.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-current/10 pt-3">
                        {message.links.map((link) => (
                          <a
                            key={link.href}
                            href={link.href}
                            className="inline-flex min-h-9 items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {messages.length === 1 && (
              <div className="space-y-2 pl-11">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void submitMessage(prompt)}
                    className="block min-h-11 w-full rounded-xl border bg-card px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-3" aria-live="polite">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border bg-card px-4 py-3 text-sm text-muted-foreground shadow-soft">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Consultation…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        <form
          onSubmit={handleSubmit}
          className="border-t bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-soft focus-within:ring-2 focus-within:ring-ring">
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, AI_MAX_MESSAGE_LENGTH))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (draft.trim() && !loading) void submitMessage(draft);
                }
              }}
              maxLength={AI_MAX_MESSAGE_LENGTH}
              placeholder="Posez une question…"
              aria-label="Question pour l’assistant"
              rows={2}
              disabled={loading}
              className="max-h-32 min-h-11 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !draft.trim()}
              aria-label="Envoyer la question"
              className="h-11 w-11 shrink-0 rounded-xl"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span>Lecture seule · aucune action automatique</span>
            <span>
              {draft.length}/{AI_MAX_MESSAGE_LENGTH}
            </span>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
