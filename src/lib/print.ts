// src/lib/print.ts
// Aperçu éditable + impression A4 homogène pour TOUS les PDF de l'application.
// L'utilisateur peut corriger n'importe quelle ligne à la main avant de générer
// le PDF (retouche ponctuelle, NON enregistrée).

export interface PrintOptions {
  /** Titre du document (onglet + nom de fichier proposé). */
  title: string;
  /** Contenu HTML du corps (SANS <html>/<head>/<body>). */
  bodyHtml: string;
  /** CSS spécifique au document. */
  css?: string;
  /** Libellé du bouton de la barre d'édition (défaut : "Générer le PDF"). */
  printButtonLabel?: string;
  /** Texte d'aide affiché dans la barre d'édition. */
  hint?: string;
  /** Appelé après que l'utilisateur a validé/fermé la boîte d'impression. */
  onPrinted?: () => void;
}

export type PrintAccent = "brand" | "quote";

// Actif décoratif généré avec OpenAI ImageGen le 08/08/2026, sans texte ni
// identité de locataire. Le logo et toutes les données restent dynamiques.
const PDF_HERO_ASSET = "/assets/pdf/document-hero.webp";

/**
 * Socle visuel des documents imprimés. La fenêtre d'impression étant isolée
 * du bundle de l'application, les valeurs de src/styles.css sont recopiées ici.
 */
export function createPrintStyles(accent: PrintAccent = "brand"): string {
  const accentToken = accent === "quote" ? "var(--pdf-accent)" : "var(--pdf-primary)";

  return `
  :root {
    --pdf-primary: oklch(0.28 0.07 155);
    --pdf-accent: oklch(0.7 0.19 48);
    --pdf-success: oklch(0.6 0.15 155);
    --pdf-warning: oklch(0.78 0.16 75);
    --pdf-destructive: oklch(0.58 0.22 25);
    --pdf-foreground: oklch(0.18 0.04 155);
    --pdf-muted: oklch(0.94 0.012 150);
    --pdf-border: oklch(0.91 0.015 150);
    --pdf-card: oklch(1 0 0);
    --pdf-document-accent: ${accentToken};
    --pdf-gold: oklch(0.74 0.12 83);
  }
  body { color:var(--pdf-foreground); background:var(--pdf-card); }
  .pdf-page { position:relative; }
  .pdf-page::before {
    content:""; position:absolute; top:0; left:0; width:34mm; height:2px;
    background:var(--pdf-document-accent);
  }
  .header {
    position:relative; isolation:isolate; overflow:hidden;
    display:flex; justify-content:space-between; align-items:center; gap:24px;
    min-height:38mm; margin-bottom:20px; padding:16px 18px;
    border:1px solid color-mix(in oklch,var(--pdf-gold) 42%,transparent);
    border-radius:12px;
    background:
      linear-gradient(90deg,oklch(0.18 0.065 157 / .98) 0%,oklch(0.18 0.065 157 / .92) 42%,oklch(0.18 0.065 157 / .38) 100%),
      url("${PDF_HERO_ASSET}") right center / cover no-repeat,
      var(--pdf-primary);
    box-shadow:0 8px 24px oklch(0.16 0.05 155 / .12);
  }
  .header::after {
    content:""; position:absolute; inset:auto 18px 0; height:1px;
    background:linear-gradient(90deg,var(--pdf-gold),transparent 78%);
  }
  .logo-block { display:flex; align-items:center; gap:12px; }
  .logo-icon {
    display:flex; width:42px; height:42px; flex-shrink:0; align-items:center;
    justify-content:center; border:1px solid var(--pdf-gold); border-radius:10px;
    background:oklch(1 0 0 / .1); font-size:22px;
  }
  .logo-text .name, .prestataire strong, .client-block strong {
    display:block; margin-bottom:3px; color:oklch(1 0 0);
    font-size:17px; font-weight:800; letter-spacing:-0.2px;
  }
  .logo-text .sub {
    margin-top:2px; color:var(--pdf-gold);
    font-size:9px; text-transform:uppercase; letter-spacing:1px;
  }
  .prestataire, .client-block, .header-coords { font-size:10px; line-height:1.65; }
  .client-block, .header-coords {
    max-width:78mm; text-align:right;
    color:oklch(1 0 0 / .82);
  }
  .prestataire { color:oklch(1 0 0 / .82); }
  .header img {
    max-height:48px !important; padding:5px; border-radius:9px;
    background:oklch(1 0 0 / .94); object-fit:contain;
  }
  table { width:100%; border-collapse:collapse; }
  thead { display:table-header-group; }
  thead th {
    padding:9px 10px; background:var(--pdf-primary); color:var(--pdf-card);
    font-size:9px; font-weight:700; text-align:left; text-transform:uppercase;
    letter-spacing:.45px;
  }
  thead th:first-child { border-radius:7px 0 0 0; }
  thead th:last-child { border-radius:0 7px 0 0; }
  tbody tr { break-inside:avoid; page-break-inside:avoid; }
  tbody td { padding:9px 10px; border-bottom:1px solid var(--pdf-border); }
  tbody tr:nth-child(even) { background:color-mix(in oklch, var(--pdf-muted) 55%, transparent); }
  .totals, .totaux { display:flex; justify-content:flex-end; margin-top:16px; }
  .totals-box, .totaux {
    width:68mm; margin-left:auto; padding:12px 14px;
    border:1px solid color-mix(in oklch,var(--pdf-gold) 36%,var(--pdf-border));
    border-radius:10px;
    background:linear-gradient(145deg,var(--pdf-card),color-mix(in oklch,var(--pdf-muted) 76%,var(--pdf-card)));
    box-shadow:0 5px 16px oklch(0.16 0.05 155 / .07);
  }
  .total-row, .t-row { display:flex; justify-content:space-between; gap:16px; padding:4px 0; font-size:11px; }
  .total-row.big, .t-row.ttc {
    margin-top:5px; padding-top:7px; border-top:2px solid var(--pdf-document-accent);
    color:var(--pdf-document-accent); font-size:14px; font-weight:800;
  }
  .badge {
    display:inline-block; padding:3px 9px; border-radius:999px;
    background:var(--pdf-muted); color:var(--pdf-primary); font-size:9px; font-weight:700;
  }
  .section { margin-bottom:14px; break-inside:avoid; page-break-inside:avoid; }
  .section-title {
    margin-bottom:8px; padding:7px 10px;
    border:1px solid var(--pdf-border); border-left:3px solid var(--pdf-document-accent);
    border-radius:0 7px 7px 0;
    background:linear-gradient(90deg,color-mix(in oklch,var(--pdf-muted) 82%,var(--pdf-card)),var(--pdf-card));
    color:var(--pdf-primary); font-size:9px; font-weight:700;
    text-transform:uppercase; letter-spacing:.7px;
  }
  .identity-card {
    position:relative; padding:13px 15px;
    border:1px solid var(--pdf-border); border-radius:10px;
    background:linear-gradient(145deg,var(--pdf-card),color-mix(in oklch,var(--pdf-muted) 48%,var(--pdf-card)));
    box-shadow:0 5px 16px oklch(0.16 0.05 155 / .055);
  }
  .identity-label {
    margin-bottom:4px; color:color-mix(in oklch,var(--pdf-gold) 80%,var(--pdf-primary));
    font-size:9px; font-weight:800; letter-spacing:.75px; text-transform:uppercase;
  }
  .document-title-panel { text-align:right; }
  .document-title-panel .document-title {
    color:var(--pdf-primary); font-size:23px; font-weight:800; line-height:1.05;
  }
  .document-title-panel .document-subtitle {
    margin-top:6px; color:color-mix(in oklch,var(--pdf-foreground) 60%,transparent);
    font-size:9px; line-height:1.65;
  }
  .branded-note {
    position:relative; padding:12px 14px 12px 50px;
    border:1px solid var(--pdf-border); border-radius:9px;
    background:linear-gradient(135deg,var(--pdf-card),color-mix(in oklch,var(--pdf-muted) 60%,var(--pdf-card)));
  }
  .branded-note::before {
    content:"✓"; position:absolute; left:14px; top:11px;
    display:flex; width:25px; height:25px; align-items:center; justify-content:center;
    border-radius:7px; background:var(--pdf-primary); color:var(--pdf-gold);
    font-size:13px; font-weight:800;
  }
  .document-signoff {
    display:flex; justify-content:space-between; align-items:flex-end; gap:18px;
    margin-top:22px; padding-top:11px;
    border-top:1px solid color-mix(in oklch,var(--pdf-gold) 72%,var(--pdf-border));
  }
  .document-origin {
    color:color-mix(in oklch,var(--pdf-foreground) 50%,transparent);
    font-size:8px; line-height:1.55;
  }
  .document-thanks {
    color:var(--pdf-primary); font-family:Georgia,serif;
    font-size:15px; font-style:italic; text-align:right;
  }
  .document-thanks small {
    display:block; margin-top:2px;
    color:color-mix(in oklch,var(--pdf-gold) 80%,var(--pdf-primary));
    font-family:Arial,sans-serif; font-size:7px; font-style:normal;
    font-weight:700; letter-spacing:1.1px; text-transform:uppercase;
  }
  .signature-zone, .sig-row { display:flex; justify-content:space-between; gap:20px; margin-top:28px; break-inside:avoid; page-break-inside:avoid; }
  .sig-box, .sig-col { flex:1; text-align:center; }
  .sig-label { margin-bottom:8px; color:color-mix(in oklch, var(--pdf-foreground) 55%, transparent); font-size:9px; font-weight:700; text-transform:uppercase; }
  .sig-line { margin-top:46px; padding-top:5px; border-top:1px solid var(--pdf-border); color:color-mix(in oklch, var(--pdf-foreground) 58%, transparent); font-size:9px; }
  .sig-img-block { padding-top:6px; }
  .footer {
    position:relative; margin-top:24px; padding-top:11px;
    border-top:1px solid color-mix(in oklch,var(--pdf-gold) 72%,var(--pdf-border));
    color:color-mix(in oklch, var(--pdf-foreground) 48%, transparent);
    font-size:8px; line-height:1.6; text-align:center;
  }
`;
}

const PAGE_SHELL_CSS = `
  @page { size: A4; margin: 14mm 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { min-height:100%; background:oklch(0.94 0.006 150); }
  body {
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    font-size: 11px;
    color: oklch(0.18 0.04 155);
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  img { max-width: 100%; }

  .pdf-page {
    width:210mm; min-height:297mm; margin:24px auto 48px; padding:14mm 15mm;
    overflow:hidden; background:oklch(1 0 0);
    box-shadow:0 18px 55px oklch(0.18 0.04 155 / 0.14);
  }

  /* Barre d'édition : visible à l'écran, masquée à l'impression */
  .pdf-edit-toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    display: flex; align-items: center; gap: 12px;
    padding: 10px 16px; background: oklch(0.28 0.07 155); color: oklch(1 0 0);
    font-family: Arial, sans-serif; font-size: 13px;
  }
  .pdf-edit-toolbar button {
    margin-left: auto; cursor: pointer; border: 0; border-radius: 6px;
    padding: 8px 16px; background: oklch(0.7 0.19 48); color: oklch(1 0 0);
    font-size: 13px; font-weight: 600;
  }
  .pdf-editable { outline: none; }

  @media screen { body { padding-top: 52px; } }
  @media print {
    .pdf-edit-toolbar { display: none !important; }
    body { padding-top: 0 !important; }
    html, body { background:oklch(1 0 0); }
    .pdf-page {
      width:auto; min-height:0; margin:0; padding:0; overflow:visible;
      box-shadow:none;
    }
  }

  @media screen and (max-width: 900px) {
    .pdf-page { margin:12px; }
  }
`;

/**
 * Ouvre un aperçu éditable du document. Retourne false si la popup est bloquée.
 */
export function printDocument({
  title,
  bodyHtml,
  css = "",
  printButtonLabel = "Générer le PDF",
  hint = "Mode édition — cliquez dans le texte pour corriger. Les modifications ne sont pas enregistrées.",
  onPrinted,
}: PrintOptions): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;

  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<base href="${window.location.origin}/">
<title>${title}</title>
<style>${PAGE_SHELL_CSS}${css}</style>
</head>
<body>
<div class="pdf-edit-toolbar">
  <span>${hint}</span>
  <button type="button" onclick="window.print()">${printButtonLabel}</button>
</div>
<div class="pdf-editable" contenteditable="true" spellcheck="false"><main class="pdf-page">${bodyHtml}</main></div>
</body>
</html>`);
  win.document.close();
  win.focus();
  if (onPrinted) win.addEventListener("afterprint", () => onPrinted(), { once: true });
  return true;
}
