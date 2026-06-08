#!/usr/bin/env bash
# Régénère le DOCX + PDF d'un document Markdown de docs/.
# Usage : docs/build-doc.sh <basename-sans-extension> [<basename2> ...]
#   ex : docs/build-doc.sh brochure-commerciale-entreprises-2026-06-03
#
# DOCX : pandoc (style par défaut). PDF : pandoc → HTML autonome (CSS de marque
# brand-print.css) → Chrome headless --print-to-pdf.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
# pandoc : binaire local (~/.local/bin) ou sur le PATH. macOS 12.6 ne peut pas
# compiler pandoc via brew — utiliser le binaire pré-compilé pandoc 3.x.
PANDOC="${PANDOC:-$HOME/.local/bin/pandoc}"
[ -x "$PANDOC" ] || PANDOC="$(command -v pandoc || true)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
CSS="$DIR/brand-print.css"

[ -x "$PANDOC" ] || { echo "pandoc introuvable (installez le binaire dans ~/.local/bin)"; exit 1; }

for base in "$@"; do
  md="$DIR/$base.md"
  [ -f "$md" ] || { echo "Absent: $md"; exit 1; }
  echo "▶ $base"

  # DOCX
  "$PANDOC" "$md" -o "$DIR/$base.docx"
  echo "  ✓ $base.docx"

  # PDF via HTML autonome + Chrome headless
  html="$(mktemp -t "$base").html"
  "$PANDOC" "$md" --standalone --embed-resources -c "$CSS" --metadata title="" -o "$html"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$DIR/$base.pdf" "file://$html" >/dev/null 2>&1
  rm -f "$html"
  echo "  ✓ $base.pdf"
done

echo "Terminé."
