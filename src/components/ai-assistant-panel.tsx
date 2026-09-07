// Sheet d'accès rapide — variante compacte DU MÊME gabarit de fiche que la
// page /assistant (design/briefs/copilote-assistant.md §6.1). Ne montre pas
// la fiche du jour complète : un bouton pleine largeur y renvoie ("Ouvrir le
// relevé du jour"). Un seul gabarit, deux largeurs.
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { CopiloteCorpsRender } from "@/components/copilote/copilote-corps";
import { CopiloteFiche } from "@/components/copilote/copilote-fiche";
import { CopilotePistes } from "@/components/copilote/copilote-pistes";
import { CopiloteSaisie } from "@/components/copilote/copilote-saisie";
import type { CopiloteSuite } from "@/components/copilote/copilote-suites";
import { useCopiloteFil } from "@/lib/ai-assistant/use-copilote-fil";

export function AiAssistantPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { entries, submit, toggleExpanded, isExpanded } = useCopiloteFil();
  const [menuOpen, setMenuOpen] = useState(false);
  const loading = entries.some((entry) => entry.status === "loading");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length, loading]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-w-none flex-col gap-0 overflow-hidden p-0 [&>button]:text-primary-foreground [&>button]:hover:bg-white/10 sm:max-w-md">
        <SheetHeader className="border-b bg-primary px-5 py-5 pr-14 text-left text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-foreground/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-primary-foreground">Copilote</SheetTitle>
              <SheetDescription className="mt-1 text-primary-foreground/70">
                Consultation sécurisée en lecture seule
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 bg-muted/20">
          <div
            className="space-y-4 px-4 py-5"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setMenuOpen((menuIsOpen) => !menuIsOpen);
              }
            }}
          >
            <Link
              to="/assistant"
              onClick={() => onOpenChange(false)}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border/50 bg-card px-3 py-3 text-sm font-semibold hover:bg-muted"
            >
              Ouvrir le relevé du jour
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            {entries.map((entry, index) => {
              const last = index === entries.length - 1;
              const expanded = isExpanded(entry.id, last);

              if (!expanded) {
                return (
                  <Card
                    key={entry.id}
                    className="overflow-hidden p-0 hover:shadow-soft hover:translate-y-0"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(entry.id)}
                      aria-expanded={false}
                      className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {entry.question}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {entry.time}
                      </span>
                    </button>
                  </Card>
                );
              }

              const reply = entry.reply;
              const suites: CopiloteSuite[] = (reply?.links ?? []).slice(0, 3).map((link) => ({
                label: link.label,
                nature: "navigation",
                href: link.href,
              }));

              return (
                <CopiloteFiche
                  key={entry.id}
                  compact
                  title={entry.question}
                  time={entry.time}
                  loading={entry.status === "loading"}
                  sources={entry.status === "loading" ? undefined : reply?.sources}
                  suites={entry.status === "loading" ? undefined : suites}
                  showPied={entry.status !== "loading"}
                >
                  {entry.status === "loading" ? (
                    <p className="text-xs text-muted-foreground">Consultation…</p>
                  ) : (
                    <CopiloteCorpsRender corps={reply?.body} fallbackText={reply?.answer ?? ""} />
                  )}
                </CopiloteFiche>
              );
            })}

            {entries.length === 0 && <CopilotePistes onSelect={submit} />}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        <div className="border-t bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <CopiloteSaisie
            onSubmit={submit}
            disabled={loading}
            menuOpen={menuOpen}
            onMenuOpenChange={setMenuOpen}
            autoFocusKey={open}
            className="mt-0"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
