-- Heure de créneau planifiée (module Planning & distribution horaire).
-- Distincte de heure_debut/heure_fin (timestamptz) qui sont des horodatages
-- RÉELS posés automatiquement par le workflow Démarrer/Terminer et servent au
-- calcul de "Durée sur site" — les réutiliser pour une heure planifiée à
-- l'avance casserait ce calcul. `time` (pas timestamptz) : c'est un horaire
-- de créneau ("prévu à 14h30"), pas un instant absolu.

ALTER TABLE public.interventions ADD COLUMN IF NOT EXISTS heure_prevue time;
