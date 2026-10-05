<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/38532d25-9483-40f7-bf8b-48014b1b85db

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploying to Vercel

The app deploys as a static Vite build plus a single serverless function.

| Piece | Where |
| --- | --- |
| Front end | `vite build` → `dist/`, served as a static SPA |
| AI proxy | [api/deepseek.ts](api/deepseek.ts) — holds the API key server-side |
| Project config | [vercel.json](vercel.json) — framework, install command, 60s function timeout |

### Environment variables

Set these in Vercel under **Settings > Environment Variables** for both Preview and Production:

| Variable | Purpose |
| --- | --- |
| `DEEPSEEK_API_KEY` | **Secret.** Read only by `api/deepseek.ts`. Never bundled into client code. |
| `VITE_APPS_SCRIPT_URL` | Optional. Default Google Apps Script Web App URL for the claims database. Public by design. |

`DEEPSEEK_MODEL` (default `deepseek-flash`) and `DEEPSEEK_BASE_URL` are optional overrides.

Anything named `VITE_*` is inlined into the client bundle at build time, so it is public —
never put a secret behind that prefix.

### Local development

`npm run dev` starts Vite only, so `/api/deepseek` does not exist there and the AI panel
reports that it is unconfigured. To exercise the function locally, put the same variables in
`.env.local` (git-ignored) and run `vercel dev` instead.

`npm run lint` is the typecheck. Run it and `npm run build` before deploying.

The AI Studio `GEMINI_API_KEY` note above is vestigial — no code under `src/` reads it.

## Production Checklist PDF

The **ESX to PDF** screen generates four documents. Three of them are narrative
reports built by [pdfReportGenerator.ts](src/services/pdfReportGenerator.ts); the
fourth, **Production Checklist**, reproduces the printed Hays+Sons production
form and is built by its own pair of modules:

| File | Role |
| --- | --- |
| [productionChecklistTemplate.ts](src/services/productionChecklistTemplate.ts) | Every measured coordinate of the printed form: page constants, colours, the five section banners, the four checkbox columns (36 abutting boxes), every ruled fill line, and each caption. |
| [productionChecklistPdf.ts](src/services/productionChecklistPdf.ts) | Renders that geometry with jsPDF and types the loaded claim data onto the form's fill lines. |

The printed form is left intact: job values are merged onto its lines, and any
detail the estimate import does not hold is printed blank rather than invented.
The on-screen preview lists exactly which fields were captured and which stay
blank.

### Verifying against the reference form

The layout is checked numerically rather than by eye. `.verify/compare.py`
renders the generated PDF and the reference form, then reports text-span
positions, ink overlap and the best-fit alignment shift:

```bash
node --import tsx .verify/harness/render_blank.mts   # form geometry only
node --import tsx .verify/harness/render.mts         # with claim data merged
python .verify/compare.py .verify/harness/blank.pdf <reference.pdf> --tag blank
```

Current result for the blank form: **65 of 65 printed text spans in place within
1.5pt**, zero misplaced, zero missing, zero extra, zero drift in either axis, ink
overlap `0.848` for dark geometry and `0.959` for the yellow highlights. With
claim data merged the form matches the same way, plus the 12 values typed onto
its lines.

Two measurement notes: spans are matched on their **baseline origin**, not the
glyph bounding box, because Arial and Helvetica report different bbox tops for
text sitting on the same baseline; and the reference's invisible placeholder
glyph `U+F034` (a bitmap the producer inlined under the "signed off by the GM."
checkbox) is skipped, since the generator redraws that mark as vector art.

The residual pixel differences are glyph outlines (jsPDF's Helvetica versus the
reference's Arial) and PDF-rasteriser anti-aliasing, not layout errors.

`productiontemplate.pdf` is an external input and is not committed here; pass its
path to `compare.py`. [extract_logo4.py](.verify/extract_logo4.py) and
[emit_logo.py](.verify/emit_logo.py) regenerate the inlined brand mark in
[src/assets/haysSonsLogo.ts](src/assets/haysSonsLogo.ts) from that reference.

