# Pièces — Production document format

Reusable template for all customer-facing and internal Pièces docs (manuels, brochures, SOP). Ensures every PDF leads with the Pièces logo and uses the same fonts/colors as `pieces.ci`.

## What's in here

- `style.css` — print stylesheet. Uses Google Fonts: **Gloock** (display), **Instrument Sans** (body), **DM Mono** (mono). Colors: navy `#00113a`, orange `#FF6B00`.
- `header.html.tpl` — HTML fragment injected at the top of every PDF. Contains the Pièces SVG logo (left) and a meta block (right) populated from `{{CATEGORY}}` and `{{SUBTITLE}}` placeholders.
- `build.sh` — generates `.docx` + `.pdf` for every registered markdown file in `docs/`.

## How to regenerate everything

```bash
bash docs/_template/build.sh
```

Run from anywhere in the repo. Rebuilds every document registered in the `DOCS` array (manuels + brochures + offres + bibles internes).

## How to rebuild just one document

```bash
bash docs/_template/build.sh deep-dive-manuel-liaison
bash docs/_template/build.sh brochure-commerciale-entreprises
```

Pass one or several slugs. Slug = the markdown filename without `.md`.

## How to add a new document

1. Write the markdown in `docs/your-new-doc.md`.
2. Add an entry to the `DOCS` array in `build.sh`:
   ```bash
   "your-new-doc|Category label|Subtitle · v1.0 · Mai 2026"
   ```
3. Run `bash docs/_template/build.sh your-new-doc`.

## Requirements

- **Pandoc ≥ 3** — install with `brew install pandoc`, or download the macOS binary from <https://github.com/jgm/pandoc/releases> and extract to `/tmp/pandoc-3.5-x86_64/`.
- **Google Chrome** — used in headless mode for PDF rendering (loads Google Fonts at print time).
- macOS — Chrome path is `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Override with `CHROME=/path/to/chrome` env var.

## DOCX caveat

The DOCX exports use Pandoc's default styling — no logo, no Google Fonts (Word ships its own). The DOCX is meant for sharing with people who need to edit content; the PDF is the production deliverable.

If we need branded DOCX later, generate a Pièces reference docx (`pandoc --print-default-data-file reference.docx > pieces-ref.docx`, edit styles in Word, then pass `--reference-doc pieces-ref.docx` in `build.sh`).
