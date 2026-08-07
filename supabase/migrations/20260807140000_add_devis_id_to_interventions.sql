-- Lien devis -> intervention pour la conversion "Créer l'intervention" depuis
-- une fiche devis (cahier des charges Devis → Intervention pré-remplie, partie A).
-- Même modèle que interventions.contract_id (schema.sql:274,541,707) : colonne
-- nullable, FK ON DELETE SET NULL (un devis supprimé ne doit jamais entraîner
-- la suppression en cascade d'une intervention déjà réalisée), index dédié.

ALTER TABLE public.interventions ADD COLUMN IF NOT EXISTS devis_id uuid;

ALTER TABLE public.interventions
  ADD CONSTRAINT interventions_devis_id_fkey
  FOREIGN KEY (devis_id) REFERENCES public.devis(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS interventions_devis_id_idx ON public.interventions (devis_id);
