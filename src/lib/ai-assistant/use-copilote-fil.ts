// Gère le fil de fiches (question → réponse) partagé par la page /assistant
// et le Sheet d'accès rapide — chacun instancie son propre fil (comportement
// actuel inchangé, pas d'historique partagé entre les deux surfaces). Reprend
// la logique d'envoi/historique déjà présente dans l'ancien
// ai-assistant-panel.tsx (askAiAssistant, bornes AI_MAX_HISTORY_*).
import { useCallback, useRef, useState } from "react";

import { askAiAssistant } from "@/lib/api/ai-assistant.functions";
import {
  AI_MAX_HISTORY_MESSAGE_LENGTH,
  AI_MAX_HISTORY_MESSAGES,
  type AssistantReply,
} from "@/lib/ai-assistant/contracts";

export type CopiloteFicheEntry = {
  id: string;
  question: string;
  time: string;
  status: "loading" | "done" | "error";
  reply?: AssistantReply;
};

const NETWORK_ERROR_ANSWER =
  "La consultation est indisponible pour le moment. Vérifiez votre connexion puis réessayez.";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function entryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useCopiloteFil() {
  const [entries, setEntries] = useState<CopiloteFicheEntry[]>([]);
  // Lu par submit() pour construire l'historique sans dépendre de `entries`
  // dans les deps de useCallback (évite une identité de fonction instable) ni
  // provoquer d'effet de bord dans un updater de setState (double-appel en
  // StrictMode dev).
  const entriesRef = useRef<CopiloteFicheEntry[]>([]);
  entriesRef.current = entries;
  const [expandedOverrides, setExpandedOverrides] = useState<Record<string, boolean>>({});

  const submit = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || trimmed.length > AI_MAX_HISTORY_MESSAGE_LENGTH * 4) return;

    const id = entryId();
    // L'historique transmis au serveur reprend les échanges déjà résolus de
    // ce fil, bornés comme le faisait l'ancien panneau.
    const history = entriesRef.current
      .filter((entry) => entry.status === "done" && entry.reply)
      .slice(-Math.floor(AI_MAX_HISTORY_MESSAGES / 2))
      .flatMap((entry) => [
        { role: "user" as const, content: entry.question.slice(0, AI_MAX_HISTORY_MESSAGE_LENGTH) },
        {
          role: "assistant" as const,
          content: (entry.reply!.answer || "—").slice(0, AI_MAX_HISTORY_MESSAGE_LENGTH),
        },
      ]);

    setEntries((current) => [
      ...current,
      { id, question: trimmed, time: formatTime(new Date()), status: "loading" as const },
    ]);

    try {
      const reply = await askAiAssistant({ data: { message: trimmed, history } });
      setEntries((current) =>
        current.map((entry) => (entry.id === id ? { ...entry, status: "done", reply } : entry)),
      );
    } catch {
      setEntries((current) =>
        current.map((entry) =>
          entry.id === id
            ? { ...entry, status: "error", reply: { answer: NETWORK_ERROR_ANSWER, links: [] } }
            : entry,
        ),
      );
    }
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedOverrides((current) => ({ ...current, [id]: !(current[id] ?? false) }));
  }, []);

  // Par défaut : seule la dernière fiche du fil est dépliée (brief §6.2,
  // "Fiche repliée"). Un basculement manuel prime sur ce défaut.
  const isExpanded = useCallback(
    (id: string, isLast: boolean) => expandedOverrides[id] ?? isLast,
    [expandedOverrides],
  );

  return { entries, submit, toggleExpanded, isExpanded };
}
