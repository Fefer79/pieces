---
name: pieces-doc
description: >-
  Create a branded Pièces document (note de partenariat, brochure commerciale,
  offre, manuel, SOP, étude interne) in the official v2 "Yango standard" — Gloock/
  Instrument Sans/DM Mono, navy #00113a + orange #FF6B00, logo header, eyebrow,
  deck, navy hero callouts, arrow bullets, footer — and export it to PDF. Use when
  the user asks to "create a Pièces document/brochure/pitch/offre/note", "make a
  branded PDF", "new commercial doc", or to format a doc "comme le pitch Yango" /
  "au standard Pièces".
---

# Pièces document standard (v2)

This skill produces documents in Pièces' official format. The visual standard is
defined by the reference doc **`docs/pitch-partenariat-yango-2026-06.md`** (the
Yango partnership note) and rendered by the shared template in
**`docs/_template/`**. Always match that look — do not invent new styling.

## Design tokens (from DESIGN.md / pieces.ci)

- **Display font**: Gloock (titles, callout leads)
- **Body font**: Instrument Sans
- **Mono font**: DM Mono (eyebrow, header meta, footer)
- **Navy**: `#00113a` · **Orange**: `#FF6B00` · ink `#1a1a1a` · muted `#888`
- Currency is **FCFA**, all copy in **French**.

Styling lives in `docs/_template/style.css` and `header.html.tpl`. **Never** put
inline styles in the markdown — only use the documented conventions below.

## Workflow

1. **Gather the brief.** Confirm with the user (ask only what's missing):
   - Document **type/category** (e.g. "Note de partenariat", "Brochure commerciale",
     "Offre commerciale", "Document interne") → becomes the orange header kicker.
   - **Subtitle/meta** line (audience, version, date, ref code) → grey header line.
     Convert relative dates to absolute (today is known from context).
   - **Slug**: kebab-case, date-suffixed, e.g. `pitch-partenariat-yango-2026-06`,
     `offre-vtc-6000-vehicules-2026-06`.
   - Target audience and the 1–2 key messages.

2. **Write `docs/<slug>.md`** using GitHub-flavoured markdown + the Pièces idioms:

   - Eyebrow (first line, before the title):
     `<p class="eyebrow">Proposition de collaboration</p>`
   - One `# Title` (Gloock navy).
   - **Deck**: subtitle right after the H1 — `<p class="deck">…</p>` (opt-in, so a
     metadata first line isn't styled as a giant subtitle).
   - **Navy hero callout** — raw HTML; markdown inside is NOT reparsed, so write
     `<strong>` literally. `<strong>` renders orange, the `.lead`/first `<p>` is
     large Gloock white:
     ```html
     <div class="callout">
     <p class="lead">Accroche avec <strong>mots en orange</strong>.</p>
     <p>Ligne de support.</p>
     </div>
     ```
   - `## Sections` (Gloock navy, thin underline).
   - `- bullets` → orange ▸ markers automatically.
   - Tables: plain markdown; bold the first cell of a label column to make it
     orange (`| **Référencement** | … |`).
   - Closing source/disclaimer note: a final paragraph that is *only* italic
     (`_… _`) renders as a centred grey footnote.

   Copy `docs/pitch-partenariat-yango-2026-06.md` as the structural template.

3. **Register it** in `docs/_template/build.sh` — add to the `DOCS` array:
   ```
   "<slug>|<Category label>|<Subtitle · vX · Mois 2026>"
   ```

4. **Add it to the index** `docs/index.md` under « Documentation existante →
   Opérationnel » (for commercial/partnership docs), with a one-line description
   and a `([PDF](./<slug>.pdf))` link.

5. **Build the PDF**:
   ```bash
   bash docs/_template/build.sh <slug>
   ```
   Requires **pandoc ≥ 3** and a PDF engine — **WeasyPrint** (`pip install
   weasyprint`, preferred: renders the footer) or **Google Chrome** (fallback, no
   footer). If neither/pandoc is missing, say so and stop at the committed `.md`
   (+ `.pdf` if the user supplies one) — do not fake a build.

6. **Verify & report.** Confirm `docs/<slug>.pdf` was produced. Commit the `.md`,
   the `.pdf` (and `.docx` if generated), the `build.sh`/`index.md` edits.

## Notes

- The `.pdf` is the production deliverable; `.docx` (if built) is plain, for editors.
- Keep claims consistent with Pièces' real figures (e.g. ROI hypotheses use
  ~1,3 M F parts spend per vehicle/year). No SLA/penalty/refund language —
  fast delivery is framed as a service benefit.
- If editing an existing doc, edit its `.md` then rebuild that one slug; never
  hand-edit the generated `.pdf`/`.docx`.
