#!/usr/bin/env bash
# Build Pièces documentation: regenerate .docx + .pdf for every markdown in docs/
# matching deep-dive-manuel-*.md or brochure-commerciale-*.md
#
# Requirements:
#   - pandoc (>= 3) — installed via Homebrew, or extracted to /tmp/pandoc-3.5-x86_64
#   - Google Chrome (macOS) for headless PDF rendering
#
# Env overrides:
#   PANDOC=/path/to/pandoc
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
if [[ -z "${PANDOC:-}" ]] && [[ -x /tmp/pandoc-3.5-x86_64/bin/pandoc ]]; then
  PANDOC=/tmp/pandoc-3.5-x86_64/bin/pandoc
fi
if [[ -z "${PANDOC:-}" ]] || [[ ! -x "$PANDOC" ]]; then
  echo "ERROR: pandoc not found. Install via Homebrew or set PANDOC=..." >&2
  exit 1
fi

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [[ ! -x "$CHROME" ]]; then
  echo "ERROR: Google Chrome not found at $CHROME. Set CHROME=..." >&2
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
  "brochure-commerciale-entreprises|Brochure commerciale|Édition Entreprises · Mai 2026"
  "brochure-commerciale-entreprises-2026-05|Brochure commerciale|Édition Entreprises — Fleet Suite · Mai 2026"
  "pricing-flotte-2026-05|Étude interne|Pricing Pro Flotte & Express Abidjan · Mai 2026"
  "brochure-commerciale-entreprises-2026-05-27|Brochure commerciale|Édition Entreprises — Pro Flotte 3 niveaux · 27 mai 2026"
  "pricing-flotte-2026-05-27|Étude interne|Packaging Pro Flotte 3 niveaux · 27 mai 2026"
  "brochure-vtc-grand-compte-2026-05|Brochure commerciale|Édition VTC grand compte (confidentielle) · Mai 2026"
  "offre-vtc-6000-vehicules-2026-05|Offre commerciale|VTC 6 000 véhicules · Mai 2026 · PCS-VTC-2026-05-001"
  "brochure-btp-grand-compte-2026-05|Brochure commerciale|Édition BTP grand compte (confidentielle) · Mai 2026"
  "offre-btp-800-vehicules-2026-05|Offre commerciale|BTP 800 véhicules · Mai 2026 · PCS-BTP-2026-05-001"
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

  # HTML for PDF rendering — logo header + CSS + embedded resources
  local html="$TMP_DIR/$slug.html"
  "$PANDOC" "$md" -o "$html" \
    --from gfm --standalone \
    --metadata title="$slug" \
    --css="$CSS" \
    --embed-resources \
    --include-before-body="$header"

  # PDF via Chrome headless
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$DOCS_DIR/$slug.pdf" \
    --print-to-pdf-no-header \
    "file://$html" 2>/dev/null

  echo "  ok $slug"
}

echo "Pandoc: $PANDOC"
echo "Chrome: $CHROME"
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
