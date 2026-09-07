// La saisie, collante en pied — porte le bouton "+" (affordance principale du
// menu, seule affordance sur mobile) et le bouton d'envoi (reste dans le
// flux, jamais flottant : ne doit jamais entrer en collision avec le FAB de
// l'app, brief §6.10).
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Loader2, Plus } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { AI_MAX_MESSAGE_LENGTH } from "@/lib/ai-assistant/contracts";
import { cn } from "@/lib/utils";
import { CopiloteMenu } from "./copilote-menu";

export function CopiloteSaisie({
  onSubmit,
  disabled,
  menuOpen,
  onMenuOpenChange,
  /** Change de valeur "truthy" pour redonner le focus au champ (ex. ouverture du Sheet). */
  autoFocusKey,
  className,
}: {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  autoFocusKey?: unknown;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!autoFocusKey) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 250);
    return () => window.clearTimeout(timer);
  }, [autoFocusKey]);

  function submit() {
    const message = draft.trim();
    if (!message || disabled || message.length > AI_MAX_MESSAGE_LENGTH) return;
    onSubmit(message);
    setDraft("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  return (
    <form onSubmit={handleSubmit} className={cn("mt-6", className)}>
      <div className="flex items-end gap-2 rounded-xl border border-border/50 bg-card p-2 shadow-soft focus-within:ring-2 focus-within:ring-ring">
        <Popover open={menuOpen} onOpenChange={onMenuOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-label="Ouvrir le menu du Copilote"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="top"
            className="w-[min(320px,calc(100vw-32px))] overflow-hidden rounded-xl border border-border/50 bg-card p-0 shadow-soft"
          >
            <CopiloteMenu
              onSelect={(question) => {
                onMenuOpenChange(false);
                onSubmit(question);
              }}
            />
          </PopoverContent>
        </Popover>
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, AI_MAX_MESSAGE_LENGTH))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          maxLength={AI_MAX_MESSAGE_LENGTH}
          placeholder="Posez une question…"
          aria-label="Question pour le Copilote"
          rows={2}
          disabled={disabled}
          className="max-h-32 min-h-11 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
        />
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          aria-label="Envoyer la question"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground disabled:opacity-50"
        >
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Lecture seule · aucune action automatique</span>
        <span className="tabular-nums">
          {draft.length}/{AI_MAX_MESSAGE_LENGTH}
        </span>
      </div>
    </form>
  );
}
