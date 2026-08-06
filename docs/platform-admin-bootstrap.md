# Création sécurisée du premier platform admin

Cette procédure ne doit être exécutée qu'après validation et application
séparée de la migration de fondation SaaS sur le bon projet Supabase.

## Prérequis

1. Vérifier que le projet cible porte exactement la référence
   `ysmkhdwjvlgmduipuaqs`.
2. Créer ou inviter le véritable administrateur dans Supabase Auth.
3. Vérifier son adresse email via le flux Supabase.
4. Ne jamais enregistrer son mot de passe, son UUID ou son email personnel dans
   le dépôt.

## Promotion ponctuelle

Dans le SQL Editor du projet validé, utiliser une transaction ponctuelle qui
recherche l'utilisateur Auth par son adresse réelle et exige une correspondance
unique avant l'insertion :

```sql
do $$
declare
  v_user_id uuid;
begin
  select id
    into strict v_user_id
    from auth.users
    where lower(email) = lower('REMPLACER_PAR_EMAIL_REEL');

  insert into public.platform_admins (user_id, active)
  values (v_user_id, true)
  on conflict (user_id) do update set active = true;
end;
$$;
```

La valeur de remplacement ne doit être ajoutée ni à une migration ni à un
commit. Supabase Auth reste l'unique gestionnaire du mot de passe.

## Vérifications

- la ligne existe dans `platform_admins` et porte `active = true` ;
- la connexion redirige ce compte vers `/platform` ;
- ce compte n'obtient pas l'interface d'une entreprise cliente ;
- un propriétaire client ne peut ni lire ni modifier `platform_admins` ;
- aucune information personnelle utilisée pendant l'opération n'est conservée
  dans le dépôt.
