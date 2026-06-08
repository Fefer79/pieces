#!/usr/bin/env bash
# Build Pièces documentation: regenerate .docx + .pdf for every markdown in docs/
# matching deep-dive-manuel-*.md or brochure-commerciale-*.md
#
# Requirements:
#   - pandoc (>= 3) — installed via Homebrew, or extracted to /tmp/pandoc-3.5-x86_64
#   - PDF engine (one of):
#       * WeasyPrint (preferred) — `pip install weasyprint`. Renders the @page
#         footer (brand left / page counter right) that defines the v2 standard.
#       * Google Chrome (fallback) — headless; ignores margin boxes (no footer).
#
# Env overrides:
#   PANDOC=/path/to/pandoc
#   WEASYPRINT=/path/to/weasyprint
#   CHROME=/path/to/Chrome
#
# Usage: bash docs/_template/build.sh [slug ...]
#   With no args, rebuilds every known document.
#   With slugs, rebuilds only those (e.g. "deep-dive-manuel-liaison").

set -euo pipefail

TEMPLATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_DIR="$(cd "$TEMPLATE_DIR/.." && pwd)"
CSS="$TEMPLATE_DIR/style.css"
HEADER_TPL="$TEMPLATE_DIR/header.html.tpl"

PANDOC="${PANDOC:-$(command -v pandoc 2>/dev/null || true)}"
# Fallback to a prebuilt pandoc extracted under /tmp (this machine's Xcode is too
# old for `brew install pandoc`; download the macOS zip from the pandoc releases).
if [[ -z "${PANDOC:-}" ]]; then
  for p in /tmp/pandoc-*/bin/pandoc; do
    [[ -x "$p" ]] && PANDOC="$p" && break
  done
fi
if [[ -z "${PANDOC:-}" ]] || [[ ! -x "$PANDOC" ]]; then
  echo "ERROR: pandoc not found. Install via Homebrew or set PANDOC=..." >&2
  exit 1
fi

# Preferred PDF engine: WeasyPrint renders the @page footer margin boxes
# (brand left / page counter right) that define the v2 standard.
WEASYPRINT="${WEASYPRINT:-$(command -v weasyprint 2>/dev/null || true)}"

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [[ -z "${WEASYPRINT:-}" ]] && [[ ! -x "$CHROME" ]]; then
  echo "ERROR: no PDF engine found. Install WeasyPrint (pip install weasyprint) or Google Chrome." >&2
  exit 1
fi

# Document registry: "slug|category|subtitle"
DOCS=(
  "deep-dive-manuel-administrateur|Manuel utilisateur|Administrateur · v2.1 · 27 mai 2026"
  "deep-dive-manuel-bot-whatsapp|Manuel technique|Bot WhatsApp · v1.0 · Mai 2026"
  "deep-dive-manuel-client|Manuel utilisateur|Client · v1.0 · Mai 2026"
  "deep-dive-manuel-entreprise|Manuel utilisateur|Entreprise · v1.0 · Mai 2026"
  "deep-dive-manuel-liaison|Document interne|SOP Liaison · v1.0 · Mai 2026"
  "deep-dive-manuel-livreur|Manuel utilisateur|Livreur · v1.0 · Mai 2026"
  "deep-dive-manuel-mecanicien|Manuel utilisateur|Mécanicien · v1.0 · Mai 2026"
  "deep-dive-manuel-paiement-escrow|Manuel technique|Paiement & Escrow · v1.0 · Mai 2026"
  "deep-dive-manuel-proprietaire|Manuel utilisateur|Propriétaire · v1.0 · Mai 2026"
  "deep-dive-manuel-vendeur|Manuel utilisateur|Vendeur · v1.0 · Mai 2026"
  "deep-dive-manuel-vision-ia|Manuel technique|Vision IA · v1.0 · Mai 2026"
  "deep-dive-manuel-visiteur|Manuel utilisateur|Visiteur · v1.0 · Mai 2026"
  "brochure-commerciale-pieces|Brochure commerciale|Édition générale · Mai 2026"
  "brochure-vtc-grand-compte-2026-05|Brochure commerciale|Édition VTC grand compte (confidentielle) · Mai 2026"
  "offre-vtc-6000-vehicules-2026-05|Offre commerciale|VTC 6 000 véhicules · Mai 2026 · PCS-VTC-2026-05-001"
  "brochure-commerciale-entreprises-2026-06-03|Brochure commerciale|Édition Entreprises — Pro Flotte 3 niveaux + chauffeurs · 3 juin 2026"
  "pitch-partenariat-yango-2026-06|Note de partenariat|Réseau partenaires Yango · Abidjan · Juin 2026"
  "etude-couts-exploitation-vtc-ci-2026|Étude de marché|Coûts d'exploitation VTC — pièces & consommables · Mai 2026"
  "plan-affaires-pieces-2026-06|Plan d'affaires|Pièces — Levée Pre-seed (confidentiel) · Juin 2026"
  "pitch-deck-pieces-2026-06|Pitch deck|Pièces — Pre-seed (confidentiel) · Juin 2026"
  "pitch-deck-yango-2026-06|Note de partenariat|Réseau Yango · Abidjan · Juin 2026"
  "brochure-vtc-grand-compte-2026-06-03|Brochure commerciale|Édition VTC grand compte (confidentielle) · 3 juin 2026"
  "offre-vtc-6000-vehicules-2026-06-03|Offre commerciale|VTC 6 000 véhicules · Juin 2026 · PCS-VTC-2026-06-001"
  "brochure-btp-grand-compte-2026-05|Brochure commerciale|Édition BTP grand compte (confidentielle) · Mai 2026"
  "offre-btp-800-vehicules-2026-05|Offre commerciale|BTP 800 véhicules · Mai 2026 · PCS-BTP-2026-05-001"
  "CTO_BIBLE|Document interne|Handover CTO · v1.1 · 29 mai 2026"
  "CEO_BIBLE|Document interne|Handover CEO · v1.1 · 29 mai 2026"
  "CRO_BIBLE|Document interne|Handover CRO · v1.1 · 29 mai 2026"
)

# Filter to the slugs given on the command line, if any
FILTER=("$@")

TMP_DIR="$(mktemp -d -t pieces-docs-build)"
trap 'rm -rf "$TMP_DIR"' EXIT

build_one() {
  local slug="$1" cat="$2" sub="$3"
  local md="$DOCS_DIR/$slug.md"

  if [[ ! -f "$md" ]]; then
    echo "  skip $slug (no .md)" >&2
    return
  fi

  # Render header from template
  local header="$TMP_DIR/header-$slug.html"
  sed "s|{{CATEGORY}}|$cat|g; s|{{SUBTITLE}}|$sub|g" "$HEADER_TPL" > "$header"

  # DOCX (plain — no logo header, Word renders system fonts)
  "$PANDOC" "$md" -o "$DOCS_DIR/$slug.docx" --from gfm

  # PPTX for decks (slug starting with "pitch-deck"): strip the print-only HTML
  # (page-break separators, eyebrow/deck/callout wrappers) into clean slide
  # markdown, then let pandoc build one slide per "##". Branding (navy/orange
  # palette + Gloock/Instrument Sans fonts) comes from the Pièces reference-doc.
  if [[ "$slug" == pitch-deck* ]]; then
    local deckmd="$TMP_DIR/$slug.deck.md"
    perl -0pe '
      s{<style[^>]*>.*?</style>}{}gs;
      s{<div[^>]*page-break[^>]*></div>}{}g;
      s{<div class="callout">}{}g;
      s{</div>}{}g;
      s{<strong>}{**}g; s{</strong>}{**}g;
      s{<p class="eyebrow">.*?</p>}{}g;
      s{<p class="deck">(.*?)</p>}{$1}g;
      s{<p class="lead">(.*?)</p>}{> $1}g;
      s{<p>(.*?)</p>}{> $1}g;
    ' "$md" > "$deckmd"
    if [[ -f "$TEMPLATE_DIR/reference-pieces.pptx" ]]; then
      "$PANDOC" "$deckmd" -o "$DOCS_DIR/$slug.pptx" --from gfm --slide-level=2 \
        --reference-doc="$TEMPLATE_DIR/reference-pieces.pptx"
    else
      "$PANDOC" "$deckmd" -o "$DOCS_DIR/$slug.pptx" --from gfm --slide-level=2
    fi
  fi

  # HTML for PDF rendering — logo header + CSS + embedded resources
  local html="$TMP_DIR/$slug.html"
  "$PANDOC" "$md" -o "$html" \
    --from gfm --standalone \
    --metadata pagetitle="$slug" \
    --css="$CSS" \
    --embed-resources \
    --include-before-body="$header"

  # PDF — WeasyPrint preferred (renders footer), Chrome headless as fallback.
  if [[ -n "${WEASYPRINT:-}" ]]; then
    "$WEASYPRINT" "$html" "$DOCS_DIR/$slug.pdf"
  else
    "$CHROME" --headless --disable-gpu --no-pdf-header-footer \
      --print-to-pdf="$DOCS_DIR/$slug.pdf" \
      --print-to-pdf-no-header \
      "file://$html" 2>/dev/null
  fi

  echo "  ok $slug"
}

echo "Pandoc: $PANDOC"
echo "PDF engine: ${WEASYPRINT:-$CHROME (Chrome — no footer)}"
echo "Output: $DOCS_DIR"
echo "---"

for entry in "${DOCS[@]}"; do
  IFS='|' read -r slug cat sub <<< "$entry"

  if [[ ${#FILTER[@]} -gt 0 ]]; then
    local_match=0
    for want in "${FILTER[@]}"; do
      [[ "$slug" == "$want" ]] && local_match=1 && break
    done
    [[ $local_match -eq 1 ]] || continue
  fi

  build_one "$slug" "$cat" "$sub"
done

echo "---"
echo "Done."
