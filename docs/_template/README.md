# Pièces — Production document format (v2 "Yango standard")

Reusable template for all customer-facing and internal Pièces docs (notes de partenariat, brochures, offres, manuels, SOP). Every PDF leads with the Pièces logo and uses the same fonts/colors as `pieces.ci`.

The canonical reference document for this standard is **`docs/pitch-partenariat-yango-2026-06.md`** — copy its structure when authoring a new doc.

> For agent-driven authoring, use the `pieces-doc` skill (`.claude/skills/pieces-doc/`), which wraps this template and these conventions.

## What's in here

- `style.css` — print stylesheet. Google Fonts: **Gloock** (display), **Instrument Sans** (body), **DM Mono** (mono). Colors: navy `#00113a`, orange `#FF6B00`.
- `header.html.tpl` — HTML fragment injected at the top of every PDF. Pièces SVG logo (left) + meta block (right) from `{{CATEGORY}}` (orange) and `{{SUBTITLE}}`.
- `build.sh` — generates `.docx` + `.pdf` for every registered markdown file in `docs/`.

## Authoring conventions (v2)

Write plain GitHub-flavoured markdown, plus these Pièces idioms:

| Element | How to write it |
|---|---|
| **Eyebrow / kicker** (mono orange, above the title) | `<p class="eyebrow">Proposition de collaboration</p>` as the first line, before the `#` title |
| **Title** | `# Mon titre` (one H1 per doc — Gloock navy) |
| **Deck / subtitle** | `<p class="deck">…</p>` right after the H1 (larger grey). Opt-in, so a metadata block as the first line isn't blown up. |
| **Navy hero callout** | a raw-HTML block (see below) |
| **Section heading** | `## Section` (Gloock navy, thin underline) |
| **Arrow bullets** | normal `- item` lists render with orange ▸ markers |
| **Table** | normal `\| … \|` markdown; navy header row, zebra body. Make a label column orange by bolding its first cell: `\| **Référencement** \| … \|` |
| **Closing note** | a final paragraph that is *only* italic text (`_…_`) renders as a centred grey footnote |

### Navy hero callout

Author it as **raw HTML** (markdown inside is not reparsed — write `<strong>` literally):

```html
<div class="callout">
<p class="lead">Phrase d'accroche avec <strong>mots en orange</strong>.</p>
<p>Ligne de support, en blanc atténué.</p>
</div>
```

The first paragraph (`.lead`, or just the first `<p>`) is large Gloock white; `<strong>` inside the callout is orange.

## How to add a new document

1. Write the markdown in `docs/your-new-doc.md` following the conventions above (copy the Yango doc as a starting point).
2. Add an entry to the `DOCS` array in `build.sh`:
   ```bash
   "your-new-doc|Category label|Subtitle · v1.0 · Mois 2026"
   ```
   `Category label` becomes the orange kicker in the header meta; `Subtitle` the grey line under it.
3. Build it: `bash docs/_template/build.sh your-new-doc`
4. Register it in `docs/index.md` (section « Opérationnel » for commercial docs).

## How to regenerate

```bash
bash docs/_template/build.sh                 # everything
bash docs/_template/build.sh deep-dive-manuel-liaison pitch-partenariat-yango-2026-06   # specific slugs
```

Run from anywhere in the repo.

## Requirements

- **Pandoc ≥ 3** — `brew install pandoc`, or extract the macOS binary to `/tmp/pandoc-3.5-x86_64/`.
- **PDF engine** (one of):
  - **WeasyPrint** *(preferred)* — `pip install weasyprint`. Renders the `@page` footer (brand left / `Page N / M` right) that defines the v2 standard.
  - **Google Chrome** *(fallback)* — headless rendering. Loads Google Fonts at print time but **ignores `@page` margin boxes**, so the PDF has no footer. macOS path `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; override with `CHROME=…`.

Env overrides: `PANDOC=…`, `WEASYPRINT=…`, `CHROME=…`.

## DOCX caveat

DOCX exports use Pandoc's default styling — no logo, no Google Fonts, no callouts. They are for people who need to edit content; **the PDF is the production deliverable**. For branded DOCX later: `pandoc --print-default-data-file reference.docx > pieces-ref.docx`, edit styles in Word, then pass `--reference-doc pieces-ref.docx` in `build.sh`.
