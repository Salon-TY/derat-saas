// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import netlify from "@netlify/vite-plugin-tanstack-start";

// Le plugin Netlify est cantonné au BUILD (`apply: "build"`).
//
// Pourquoi : son middleware de dev fait pendre INDÉFINIMENT toute requête SSR
// sur cette machine — `curl http://localhost:4321/` reste sans réponse au-delà
// de 45 s, et la requête n'apparaît jamais dans les logs Vite (elle n'atteint
// donc jamais le code de l'app). Diagnostic : un serveur HTTP minimal sur le
// même port répond instantanément, et le build de production servi par
// `vite preview` répond en 1,5 s — le blocage est bien propre au middleware de
// dev du plugin. Les features `aiGateway` et `geolocation` restent actives même
// avec `{ enabled: false }` dans les options `dev` (@netlify/dev 2.12.8), donc
// il n'est pas possible de les désactiver finement.
//
// Pourquoi PAS une simple suppression du plugin : il génère aussi, au build,
// `.netlify/v1/functions/server.mjs` — le handler SSR sans lequel le
// déploiement Netlify sert un site sans rendu serveur. Vérifié : sans le
// plugin, `bun run build` réussit (exit 0) mais `.netlify/v1/functions/` reste
// VIDE. Le retirer entièrement casserait donc la production.
//
// `apply: "build"` donne les deux : plus de middleware en dev, sortie Netlify
// intacte au build. À revoir si le blocage est corrigé en amont, ou pour tester
// localement les features dev de Netlify (redirects/headers émulés).
const netlifyBuildOnly = netlify().map((plugin) => ({
  ...plugin,
  apply: "build" as const,
}));

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [netlifyBuildOnly],
    server: { port: 4321 },
  },
});
