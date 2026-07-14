


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."account_owner"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.team_members
       WHERE user_id = auth.uid() AND active = true
       LIMIT 1),
    auth.uid()
  );
$$;


ALTER FUNCTION "public"."account_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT CASE WHEN active THEN role ELSE 'disabled' END
       FROM public.team_members
       WHERE user_id = auth.uid()
       ORDER BY active DESC
       LIMIT 1),
    'owner'
  );
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.company_settings (user_id, nom)
    VALUES (NEW.id, '')
    ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.service_presets (user_id, label, description, prix_unitaire_ht, ordre) VALUES
    (NEW.id, 'Dératisation standard', 'Traitement rats/souris, pose d''appâts', 150.00, 1),
    (NEW.id, 'Désinsectisation', 'Traitement cafards/blattes', 120.00, 2),
    (NEW.id, 'Traitement punaises de lit', 'Traitement complet punaises', 250.00, 3)
    ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_invoice_number"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT next_invoice_number INTO v_next
    FROM public.company_settings
    WHERE user_id = auth.uid();

  IF v_next IS NULL THEN
    RETURN 1;
  END IF;

  UPDATE public.company_settings
    SET next_invoice_number = next_invoice_number + 1
    WHERE user_id = auth.uid();

  RETURN v_next;
END;
$$;


ALTER FUNCTION "public"."next_invoice_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_account_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  owner UUID;
BEGIN
  owner := public.account_owner();
  IF owner IS NOT NULL THEN
    NEW.user_id := owner;   -- contexte normal : on rattache au compte
  END IF;                   -- sinon (création de compte) : on ne touche à rien
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."set_account_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "raison_sociale" "text" NOT NULL,
    "adresse_site" "text",
    "telephone" "text",
    "email" "text",
    "siret" "text",
    "type_nuisible" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "siren" "text",
    "rcs" "text",
    "forme_juridique" "text"
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "user_id" "uuid" NOT NULL,
    "nom" "text" DEFAULT ''::"text" NOT NULL,
    "adresse" "text",
    "siret" "text",
    "tva_number" "text",
    "telephone" "text",
    "email" "text",
    "iban" "text",
    "bic" "text",
    "next_invoice_number" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "objectif_ca_mensuel" numeric DEFAULT 3000,
    "logo_url" "text",
    "nom_technicien" "text",
    "numero_certibiocide" "text",
    "relance_delai_n1" integer DEFAULT 7,
    "relance_delai_n2" integer DEFAULT 1,
    "relance_delai_n3" integer DEFAULT 31,
    "relance_signature" "text" DEFAULT ''::"text"
);


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "date_debut" "date" NOT NULL,
    "date_fin" "date" NOT NULL,
    "nb_passages_inclus" integer DEFAULT 1 NOT NULL,
    "passages_realises" integer DEFAULT 0 NOT NULL,
    "statut" "text" DEFAULT 'actif'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "numero" "text",
    "nom_etablissement" "text",
    "adresse_etablissement" "text",
    "type_prestation" "text" DEFAULT 'désinsectisation et dératisation'::"text" NOT NULL,
    "frequence" "text",
    "type_passage" "text" DEFAULT 'préventif'::"text" NOT NULL,
    "duree_mois" integer DEFAULT 12 NOT NULL,
    "ville_signature" "text",
    "signature_url" "text",
    "signature_at" timestamp with time zone
);


ALTER TABLE "public"."contracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."devis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "numero" "text" NOT NULL,
    "date_devis" "date" NOT NULL,
    "date_validite" "date" NOT NULL,
    "statut" "text" DEFAULT 'brouillon'::"text" NOT NULL,
    "total_ht" numeric DEFAULT 0 NOT NULL,
    "tva" numeric DEFAULT 0 NOT NULL,
    "tva_taux" numeric DEFAULT 20 NOT NULL,
    "total_ttc" numeric DEFAULT 0 NOT NULL,
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."devis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."devis_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "devis_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "quantite" numeric DEFAULT 1 NOT NULL,
    "prix_unitaire_ht" numeric DEFAULT 0 NOT NULL,
    "total_ht" numeric DEFAULT 0 NOT NULL,
    "ordre" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."devis_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interventions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "adresse_site" "text",
    "type_nuisible" "text",
    "type_intervention" "text" DEFAULT 'Dératisation'::"text" NOT NULL,
    "produits" "text",
    "quantite" "text",
    "observations" "text",
    "statut" "text" DEFAULT 'planifiee'::"text" NOT NULL,
    "date_prochain_passage" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "photos" "text"[],
    "signature_url" "text",
    "signature_at" timestamp with time zone,
    "produits_utilises" "jsonb" DEFAULT '[]'::"jsonb",
    "contract_id" "uuid",
    "technicien_id" "uuid",
    "heure_debut" timestamp with time zone,
    "heure_fin" timestamp with time zone,
    "consignes" "text",
    "retour_admin" "text"
);


ALTER TABLE "public"."interventions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "quantite" numeric DEFAULT 1 NOT NULL,
    "prix_unitaire_ht" numeric DEFAULT 0 NOT NULL,
    "total_ht" numeric DEFAULT 0 NOT NULL,
    "ordre" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invoice_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "intervention_id" "uuid",
    "numero" integer NOT NULL,
    "date_facture" "date" DEFAULT CURRENT_DATE NOT NULL,
    "echeance" "date",
    "adresse_site" "text",
    "statut" "text" DEFAULT 'brouillon'::"text" NOT NULL,
    "total_ht" numeric DEFAULT 0 NOT NULL,
    "tva" numeric DEFAULT 0 NOT NULL,
    "tva_taux" numeric DEFAULT 20 NOT NULL,
    "total_ttc" numeric DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produits_biocides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nom" "text" NOT NULL,
    "numero_homologation" "text" DEFAULT ''::"text" NOT NULL,
    "type" "text" DEFAULT 'Rodenticide'::"text" NOT NULL,
    "dose_habituelle" "text" DEFAULT ''::"text" NOT NULL,
    "ordre" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."produits_biocides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."relances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "facture_id" "uuid" NOT NULL,
    "niveau" integer NOT NULL,
    "date_envoi" "date" NOT NULL,
    "notes" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "relances_niveau_check" CHECK (("niveau" = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE "public"."relances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_presets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "prix_unitaire_ht" numeric DEFAULT 0 NOT NULL,
    "ordre" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_presets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "technicien_id" "uuid",
    "quantite" numeric DEFAULT 0 NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stock_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "quantite" numeric NOT NULL,
    "technicien_id" "uuid",
    "intervention_id" "uuid",
    "note" "text",
    "created_by" "uuid",
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stock_movements_type_check" CHECK (("type" = ANY (ARRAY['entree'::"text", 'transfert'::"text", 'consommation'::"text", 'ajustement'::"text"])))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nom" "text" NOT NULL,
    "unite" "text" DEFAULT 'unité'::"text" NOT NULL,
    "quantite" numeric DEFAULT 0 NOT NULL,
    "seuil_alerte" numeric DEFAULT 0 NOT NULL,
    "prix_achat_ht" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type_gestion" "text" DEFAULT 'unite'::"text" NOT NULL,
    CONSTRAINT "stock_products_type_gestion_check" CHECK (("type_gestion" = ANY (ARRAY['unite'::"text", 'volume'::"text"])))
);


ALTER TABLE "public"."stock_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "technicien_id" "uuid" NOT NULL,
    "quantite" numeric NOT NULL,
    "note" "text",
    "statut" "text" DEFAULT 'en_attente'::"text" NOT NULL,
    "traite_par" "uuid",
    "traite_at" timestamp with time zone,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stock_requests_statut_check" CHECK (("statut" = ANY (ARRAY['en_attente'::"text", 'servie'::"text", 'refusee'::"text"])))
);


ALTER TABLE "public"."stock_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'employe'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "username" "text",
    "display_name" "text",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "poste" "text" DEFAULT 'technicien'::"text" NOT NULL,
    CONSTRAINT "team_members_poste_check" CHECK (("poste" = ANY (ARRAY['bureau'::"text", 'technicien'::"text"]))),
    CONSTRAINT "team_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'employe'::"text"])))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devis_lines"
    ADD CONSTRAINT "devis_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devis"
    ADD CONSTRAINT "devis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interventions"
    ADD CONSTRAINT "interventions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_lines"
    ADD CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."produits_biocides"
    ADD CONSTRAINT "produits_biocides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."relances"
    ADD CONSTRAINT "relances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_presets"
    ADD CONSTRAINT "service_presets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_products"
    ADD CONSTRAINT "stock_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_requests"
    ADD CONSTRAINT "stock_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "contracts_numero_user_idx" ON "public"."contracts" USING "btree" ("user_id", "numero") WHERE ("numero" IS NOT NULL);



CREATE INDEX "interventions_contract_id_idx" ON "public"."interventions" USING "btree" ("contract_id");



CREATE INDEX "interventions_technicien_idx" ON "public"."interventions" USING "btree" ("technicien_id");



CREATE UNIQUE INDEX "stock_levels_garage_uniq" ON "public"."stock_levels" USING "btree" ("product_id") WHERE ("technicien_id" IS NULL);



CREATE INDEX "stock_levels_tech_idx" ON "public"."stock_levels" USING "btree" ("technicien_id");



CREATE UNIQUE INDEX "stock_levels_van_uniq" ON "public"."stock_levels" USING "btree" ("product_id", "technicien_id") WHERE ("technicien_id" IS NOT NULL);



CREATE INDEX "stock_movements_date_idx" ON "public"."stock_movements" USING "btree" ("created_at" DESC);



CREATE INDEX "stock_movements_product_idx" ON "public"."stock_movements" USING "btree" ("product_id");



CREATE INDEX "stock_movements_tech_idx" ON "public"."stock_movements" USING "btree" ("technicien_id");



CREATE INDEX "stock_requests_statut_idx" ON "public"."stock_requests" USING "btree" ("statut");



CREATE INDEX "stock_requests_tech_idx" ON "public"."stock_requests" USING "btree" ("technicien_id");



CREATE INDEX "team_members_owner_idx" ON "public"."team_members" USING "btree" ("owner_id");



CREATE INDEX "team_members_user_idx" ON "public"."team_members" USING "btree" ("user_id");



CREATE UNIQUE INDEX "team_members_username_unique" ON "public"."team_members" USING "btree" ("lower"("username")) WHERE ("username" IS NOT NULL);



CREATE OR REPLACE TRIGGER "set_account_owner_trg" BEFORE INSERT ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_owner"();



CREATE OR REPLACE TRIGGER "set_account_owner_trg" BEFORE INSERT ON "public"."company_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_owner"();



CREATE OR REPLACE TRIGGER "set_account_owner_trg" BEFORE INSERT ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_owner"();



CREATE OR REPLACE TRIGGER "set_account_owner_trg" BEFORE INSERT ON "public"."interventions" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_owner"();



CREATE OR REPLACE TRIGGER "set_account_owner_trg" BEFORE INSERT ON "public"."invoice_lines" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_owner"();



CREATE OR REPLACE TRIGGER "set_account_owner_trg" BEFORE INSERT ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_owner"();



CREATE OR REPLACE TRIGGER "set_account_owner_trg" BEFORE INSERT ON "public"."service_presets" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_owner"();



CREATE OR REPLACE TRIGGER "set_account_owner_trg" BEFORE INSERT ON "public"."stock_levels" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_owner"();



CREATE OR REPLACE TRIGGER "set_account_owner_trg" BEFORE INSERT ON "public"."stock_movements" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_owner"();



CREATE OR REPLACE TRIGGER "set_account_owner_trg" BEFORE INSERT ON "public"."stock_products" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_owner"();



CREATE OR REPLACE TRIGGER "set_account_owner_trg" BEFORE INSERT ON "public"."stock_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_account_owner"();



CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_company_settings_updated_at" BEFORE UPDATE ON "public"."company_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contracts_updated_at" BEFORE UPDATE ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_interventions_updated_at" BEFORE UPDATE ON "public"."interventions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_stock_products_updated_at" BEFORE UPDATE ON "public"."stock_products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devis"
    ADD CONSTRAINT "devis_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."devis_lines"
    ADD CONSTRAINT "devis_lines_devis_id_fkey" FOREIGN KEY ("devis_id") REFERENCES "public"."devis"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devis_lines"
    ADD CONSTRAINT "devis_lines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devis"
    ADD CONSTRAINT "devis_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interventions"
    ADD CONSTRAINT "interventions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interventions"
    ADD CONSTRAINT "interventions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."interventions"
    ADD CONSTRAINT "interventions_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."interventions"
    ADD CONSTRAINT "interventions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_lines"
    ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_lines"
    ADD CONSTRAINT "invoice_lines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."produits_biocides"
    ADD CONSTRAINT "produits_biocides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."relances"
    ADD CONSTRAINT "relances_facture_id_fkey" FOREIGN KEY ("facture_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."relances"
    ADD CONSTRAINT "relances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_presets"
    ADD CONSTRAINT "service_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."stock_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."stock_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_products"
    ADD CONSTRAINT "stock_products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_requests"
    ADD CONSTRAINT "stock_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."stock_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_requests"
    ADD CONSTRAINT "stock_requests_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users manage own devis" ON "public"."devis" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own devis_lines" ON "public"."devis_lines" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own produits_biocides" ON "public"."produits_biocides" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own relances" ON "public"."relances" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "account members full access" ON "public"."clients" USING (("user_id" = "public"."account_owner"())) WITH CHECK (("user_id" = "public"."account_owner"()));



CREATE POLICY "account members full access" ON "public"."contracts" USING (("user_id" = "public"."account_owner"())) WITH CHECK (("user_id" = "public"."account_owner"()));



CREATE POLICY "account members full access" ON "public"."interventions" USING (("user_id" = "public"."account_owner"())) WITH CHECK (("user_id" = "public"."account_owner"()));



CREATE POLICY "account members full access" ON "public"."invoice_lines" USING (("user_id" = "public"."account_owner"())) WITH CHECK (("user_id" = "public"."account_owner"()));



CREATE POLICY "account members full access" ON "public"."invoices" USING (("user_id" = "public"."account_owner"())) WITH CHECK (("user_id" = "public"."account_owner"()));



CREATE POLICY "account members full access" ON "public"."service_presets" USING (("user_id" = "public"."account_owner"())) WITH CHECK (("user_id" = "public"."account_owner"()));



CREATE POLICY "account members full access" ON "public"."stock_levels" USING (("user_id" = "public"."account_owner"())) WITH CHECK (("user_id" = "public"."account_owner"()));



CREATE POLICY "account members full access" ON "public"."stock_movements" USING (("user_id" = "public"."account_owner"())) WITH CHECK (("user_id" = "public"."account_owner"()));



CREATE POLICY "account members full access" ON "public"."stock_products" USING (("user_id" = "public"."account_owner"())) WITH CHECK (("user_id" = "public"."account_owner"()));



CREATE POLICY "account members full access" ON "public"."stock_requests" USING (("user_id" = "public"."account_owner"())) WITH CHECK (("user_id" = "public"."account_owner"()));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devis_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interventions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."produits_biocides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."relances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_presets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "settings delete owner" ON "public"."company_settings" FOR DELETE USING ((("user_id" = "public"."account_owner"()) AND ("public"."current_user_role"() = 'owner'::"text")));



CREATE POLICY "settings insert owner" ON "public"."company_settings" FOR INSERT WITH CHECK ((("user_id" = "public"."account_owner"()) AND ("public"."current_user_role"() = 'owner'::"text")));



CREATE POLICY "settings read account" ON "public"."company_settings" FOR SELECT USING (("user_id" = "public"."account_owner"()));



CREATE POLICY "settings update owner" ON "public"."company_settings" FOR UPDATE USING ((("user_id" = "public"."account_owner"()) AND ("public"."current_user_role"() = 'owner'::"text"))) WITH CHECK ((("user_id" = "public"."account_owner"()) AND ("public"."current_user_role"() = 'owner'::"text")));



ALTER TABLE "public"."stock_levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team members owner manage" ON "public"."team_members" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "team members read own" ON "public"."team_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."account_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."account_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."account_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."next_invoice_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."next_invoice_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_invoice_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_account_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_account_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_account_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."company_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



GRANT ALL ON TABLE "public"."contracts" TO "anon";
GRANT ALL ON TABLE "public"."contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."contracts" TO "service_role";



GRANT ALL ON TABLE "public"."devis" TO "anon";
GRANT ALL ON TABLE "public"."devis" TO "authenticated";
GRANT ALL ON TABLE "public"."devis" TO "service_role";



GRANT ALL ON TABLE "public"."devis_lines" TO "anon";
GRANT ALL ON TABLE "public"."devis_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."devis_lines" TO "service_role";



GRANT ALL ON TABLE "public"."interventions" TO "anon";
GRANT ALL ON TABLE "public"."interventions" TO "authenticated";
GRANT ALL ON TABLE "public"."interventions" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_lines" TO "anon";
GRANT ALL ON TABLE "public"."invoice_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_lines" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."produits_biocides" TO "anon";
GRANT ALL ON TABLE "public"."produits_biocides" TO "authenticated";
GRANT ALL ON TABLE "public"."produits_biocides" TO "service_role";



GRANT ALL ON TABLE "public"."relances" TO "anon";
GRANT ALL ON TABLE "public"."relances" TO "authenticated";
GRANT ALL ON TABLE "public"."relances" TO "service_role";



GRANT ALL ON TABLE "public"."service_presets" TO "anon";
GRANT ALL ON TABLE "public"."service_presets" TO "authenticated";
GRANT ALL ON TABLE "public"."service_presets" TO "service_role";



GRANT ALL ON TABLE "public"."stock_levels" TO "anon";
GRANT ALL ON TABLE "public"."stock_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_levels" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."stock_products" TO "anon";
GRANT ALL ON TABLE "public"."stock_products" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_products" TO "service_role";



GRANT ALL ON TABLE "public"."stock_requests" TO "anon";
GRANT ALL ON TABLE "public"."stock_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_requests" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







