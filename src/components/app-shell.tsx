/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Plus, Search, X, MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/db";
import { formatEUR, formatDateFR, TYPES_INTERVENTION } from "@/lib/schemas";
import {
  useClients,
  useSettings,
  useMyAccess,
  useCurrentRole,
  useMyPoste,
  useMyTodoCount,
} from "@/lib/queries";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import {
  APP_PRIMARY_NAV_ITEMS,
  APP_SECONDARY_NAV_ITEMS,
  APP_TEAM_NAV_ITEM,
} from "@/lib/navigation";

type SearchResult = {
  type: "client" | "facture" | "intervention";
  id: string;
  label: string;
  sub: string;
  href: string;
};

function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { can, loading: accessLoading } = useMyAccess();
  const { data: role } = useCurrentRole();
  const { data: myPoste } = useMyPoste();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const accessResolved = !accessLoading && role !== undefined && myPoste !== undefined;
  const isTechnician = role !== undefined && role !== "owner" && myPoste === "technicien";
  const canClients = accessResolved && can("clients");
  const canFactures = accessResolved && can("factures");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    // Tant que le rôle/poste n'est pas résolu (ou, pour un technicien, tant que
    // son id n'est pas connu), on n'interroge rien pour éviter de fuiter des
    // résultats non autorisés le temps que l'accès se résolve.
    if (!accessResolved || (isTechnician && !currentUserId)) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const term = q.trim().toLowerCase();

        let interventionsQ = db
          .from("interventions")
          .select("id, date, adresse_site, technicien_id, client:clients(raison_sociale)")
          .or(`adresse_site.ilike.%${term}%`)
          .limit(5);
        if (isTechnician) interventionsQ = interventionsQ.eq("technicien_id", currentUserId!);

        const [clients, factures, interventions, facturesClient] = await Promise.all([
          canClients
            ? db
                .from("clients")
                .select("id, raison_sociale, adresse_site, telephone")
                .ilike("raison_sociale", `%${term}%`)
                .limit(5)
            : Promise.resolve({ data: [] as any[] }),
          canFactures
            ? db
                .from("invoices")
                .select("id, numero, total_ttc, statut, client:clients(raison_sociale)")
                .or(`numero.eq.${Number(term) || 0}`)
                .limit(5)
            : Promise.resolve({ data: [] as any[] }),
          interventionsQ,
          // Also search factures by client name
          canFactures
            ? db
                .from("invoices")
                .select("id, numero, total_ttc, statut, client:clients(raison_sociale)")
                .limit(5)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const out: SearchResult[] = [];

        for (const c of clients.data ?? []) {
          out.push({
            type: "client",
            id: c.id,
            label: c.raison_sociale,
            sub: c.adresse_site ?? c.telephone ?? "",
            href: `/clients/${c.id}`,
          });
        }

        const seenFac = new Set<string>();
        for (const f of [...(factures.data ?? []), ...(facturesClient.data ?? [])]) {
          if (seenFac.has(f.id)) continue;
          const clientName = (f.client as any)?.raison_sociale ?? "";
          if (!clientName.toLowerCase().includes(term) && !String(f.numero).includes(term))
            continue;
          seenFac.add(f.id);
          out.push({
            type: "facture",
            id: f.id,
            label: `Facture N°${f.numero} — ${formatEUR(f.total_ttc)}`,
            sub: clientName,
            href: `/factures/${f.id}`,
          });
        }

        for (const i of interventions.data ?? []) {
          out.push({
            type: "intervention",
            id: i.id,
            label: (i.client as any)?.raison_sociale ?? "—",
            sub: `${formatDateFR(i.date)}${i.adresse_site ? ` · ${i.adresse_site}` : ""}`,
            href: `/interventions/${i.id}`,
          });
        }

        setResults(out.slice(0, 15));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, accessResolved, isTechnician, currentUserId, canClients, canFactures]);

  function go(href: string) {
    navigate({ to: href as any });
    onClose();
  }

  const TYPE_ICON: Record<string, string> = {
    client: "👤",
    facture: "🧾",
    intervention: "🔧",
  };

  const TYPE_LABEL: Record<string, string> = {
    client: "Clients",
    facture: "Factures",
    intervention: "Interventions",
  };

  const groups = ["client", "facture", "intervention"] as const;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center pt-16 px-4"
      onClick={onClose}
    >
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un client, une facture, une intervention…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => e.key === "Escape" && onClose()}
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">Recherche…</div>
            )}
            {!loading && q.trim() && results.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Aucun résultat pour « {q} »
              </div>
            )}
            {!loading && !q.trim() && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Tapez pour chercher…
              </div>
            )}
            {!loading && results.length > 0 && (
              <div className="py-2">
                {groups.map((type) => {
                  const items = results.filter((r) => r.type === type);
                  if (!items.length) return null;
                  return (
                    <div key={type}>
                      <div className="px-4 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                        {TYPE_LABEL[type]}
                      </div>
                      {items.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => go(r.href)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                        >
                          <span className="text-base">{TYPE_ICON[r.type]}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{r.label}</div>
                            {r.sub && (
                              <div className="text-xs text-muted-foreground truncate">{r.sub}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 text-center text-xs text-white/60">Échap pour fermer</div>
      </div>
    </div>
  );
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function QuickInterventionModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const { can, loading: accessLoading } = useMyAccess();
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<string>(TYPES_INTERVENTION[0]);
  const [date, setDate] = useState(localDateStr(new Date()));
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // "Intervention complète" reste toujours proposée (Terrain toujours autorisé) ;
  // les 3 autres raccourcis dépendent des permissions du compte.
  const hasExtraPermissions = !accessLoading && (can("clients") || can("factures") || can("devis"));
  const extraActions = [
    {
      label: "Intervention complète",
      to: "/interventions/new",
      color: "bg-primary/10 text-primary",
    },
    ...(!accessLoading && can("clients")
      ? [{ label: "Nouveau client", to: "/clients/new", color: "bg-primary/10 text-primary" }]
      : []),
    ...(!accessLoading && can("factures")
      ? [{ label: "Nouvelle facture", to: "/factures/new", color: "bg-accent/10 text-accent" }]
      : []),
    ...(!accessLoading && can("devis")
      ? [{ label: "Nouveau devis", to: "/devis/new", color: "bg-accent/10 text-accent" }]
      : []),
  ];

  async function handleCreate() {
    if (!clientId) {
      toast.error("Sélectionnez un client");
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await db
        .from("interventions")
        .insert({
          user_id: user.id,
          client_id: clientId,
          date,
          type_intervention: type,
          statut: "planifiee",
          adresse_site: "",
          type_nuisible: "",
          produits: "",
          quantite: "",
          observations: "",
        })
        .select()
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Intervention créée");
      onClose();
      navigate({ to: "/interventions/$id", params: { id: data.id } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100dvh-2rem-env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto rounded-2xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-base">Intervention rapide</h2>
          <button
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="quick-client"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Client *
            </label>
            <select
              id="quick-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Sélectionner un client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.raison_sociale}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <span
              id="quick-type-label"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Type
            </span>
            <div className="flex gap-2" role="group" aria-labelledby="quick-type-label">
              {TYPES_INTERVENTION.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`min-h-11 flex-1 rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${type === t ? "bg-accent border-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-accent/50"}`}
                >
                  {t === "Les deux" ? "Les 2" : t}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="quick-date"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Date
            </label>
            <input
              id="quick-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !clientId}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Création…" : "Créer en 1 clic"}
          </button>
          {hasExtraPermissions && (
            <div className="border-t pt-3 space-y-2">
              <button
                onClick={() => setShowMore((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
              >
                Plus d'options {showMore ? "▲" : "▼"}
              </button>
              {showMore && (
                <div className="space-y-2">
                  {extraActions.map((a) => (
                    <Link
                      key={a.to}
                      to={a.to as any}
                      onClick={onClose}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${a.color} hover:opacity-80`}
                    >
                      <Plus className="h-4 w-4" /> {a.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [fabOpen, setFabOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: settings } = useSettings();
  const { can, loading: accessLoading } = useMyAccess();
  const { data: role } = useCurrentRole();
  const { data: myPoste } = useMyPoste();
  const isTechnician = role !== undefined && role !== "owner" && myPoste === "technicien";
  const { data: myTodoCount = 0 } = useMyTodoCount();

  // Tant que l'accès n'est pas résolu, on masque les onglets à permission
  // (Terrain reste toujours visible) pour éviter un flash "tout est affiché".
  const mainItems = APP_PRIMARY_NAV_ITEMS.filter(
    (item) => !item.perm || (!accessLoading && can(item.perm)),
  );
  const filteredMore = APP_SECONDARY_NAV_ITEMS.filter(
    (item) => !item.perm || (!accessLoading && can(item.perm)),
  );
  const moreItems =
    !accessLoading && can("equipe") ? [...filteredMore, APP_TEAM_NAV_ITEM] : filteredMore;
  // Sur mobile, quatre accès directs + "Plus" gardent une barre lisible à une
  // main. Factures reste directement visible dans la sidebar desktop.
  const mobileMainItems = mainItems.filter((item) => item.to !== "/factures");
  const mobileMoreItems = [...mainItems.filter((item) => item.to === "/factures"), ...moreItems];
  const hasMore = mobileMoreItems.length > 0;

  // La recherche reste utile tant qu'au moins une catégorie est consultable ;
  // le Terrain (interventions) est toujours autorisé, donc en pratique elle
  // ne disparaît que si "terrain" venait un jour à ne plus l'être.
  const searchAllowed = !accessLoading && (can("clients") || can("factures") || can("terrain"));

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut({ scope: "local" });
    toast.success("Déconnecté");
    navigate({ to: "/connexion", replace: true });
  }

  const mobileMoreActive = mobileMoreItems.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/"),
  );
  const bottomNavItems = mobileMainItems.map((item) => ({
    ...item,
    badgeCount: item.to === "/interventions" && isTechnician ? myTodoCount : undefined,
  }));

  return (
    <div className="flex min-h-screen bg-background">
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
      {fabOpen && <QuickInterventionModal onClose={() => setFabOpen(false)} />}

      {/* Sidebar — desktop uniquement (≥ lg). Toutes les entrées sont visibles
          directement : contrairement à la bottom nav mobile, l'espace vertical
          ne nécessite pas de menu "Plus". */}
      <Sidebar
        primaryItems={mainItems}
        secondaryItems={moreItems}
        brandName={settings?.nom}
        logoUrl={settings?.logo_url}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          settings={settings}
          tagline="Dératisation · Désinsectisation"
          brandHref="/app"
          onSearchClick={searchAllowed ? () => setSearchOpen(true) : undefined}
          showSettingsLink
          onSignOut={handleSignOut}
          actions={
            <Button size="sm" onClick={() => setFabOpen(true)} className="hidden lg:inline-flex">
              <Plus className="h-4 w-4" /> Nouveau
            </Button>
          }
        />

        {/* Contenu de la page */}
        <main className="flex-1 bg-muted/20 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-12">
          <div className="mx-auto max-w-3xl px-4 py-5 animate-in-up lg:max-w-7xl lg:px-8 lg:py-6">
            {children}
          </div>
        </main>

        {/* FAB — intervention rapide (mobile uniquement ; équivalent desktop : bouton "Nouveau" du Header) */}
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 lg:hidden">
          <button
            onClick={() => setFabOpen(true)}
            className="fab"
            aria-label="Intervention rapide"
            style={{ position: "relative", bottom: "auto", right: "auto" }}
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {/* Menu "Plus" — drawer depuis le bas, mobile uniquement (rendu seulement s'il reste des onglets en trop) */}
        {hasMore && moreOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMoreOpen(false)}
          >
            <div
              className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-2xl bg-card shadow-elevated"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b px-6 py-4">
                <span className="text-sm font-semibold">Plus</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="grid h-11 w-11 place-items-center rounded-xl transition-all duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Fermer le menu Plus"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-0 p-2">
                {mobileMoreItems.map((item) => {
                  const Icon = item.icon;
                  const active =
                    location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                  return (
                    <Link
                      key={item.to}
                      to={item.to as any}
                      onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-2 rounded-xl px-3 py-4 transition-all duration-200 ${
                        active
                          ? "bg-accent/10 text-accent"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <div
                        className={`grid h-10 w-10 place-items-center rounded-xl ${active ? "bg-accent/15" : "bg-muted"}`}
                      >
                        <Icon className={`h-5 w-5 ${active ? "stroke-[2.2]" : "stroke-[1.8]"}`} />
                      </div>
                      <span className={`text-xs font-medium ${active ? "font-bold" : ""}`}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Bottom navigation — mobile uniquement ; onglets principaux + Plus (si des onglets débordent) */}
        <div className="lg:hidden">
          <BottomNav
            items={bottomNavItems}
            trailing={
              hasMore ? (
                <button
                  onClick={() => setMoreOpen((v) => !v)}
                  className={`relative flex flex-col items-center justify-center gap-2 py-3 text-[9px] font-medium transition-all duration-200 ${
                    mobileMoreActive || moreOpen
                      ? "text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-xl transition-all duration-200 ${mobileMoreActive || moreOpen ? "scale-105 bg-accent/12" : ""}`}
                  >
                    <MoreHorizontal
                      className={`h-[18px] w-[18px] transition-all duration-200 ${mobileMoreActive || moreOpen ? "stroke-[2.5]" : "stroke-[1.8]"}`}
                    />
                  </div>
                  <span className={mobileMoreActive || moreOpen ? "font-bold" : ""}>Plus</span>
                </button>
              ) : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
