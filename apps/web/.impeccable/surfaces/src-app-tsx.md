---

version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

Scope: main chat page (`src/App.tsx` and components). Mode: Operate. Audience and job: see PRODUCT.md. Full brief: `.scratch/redesign/main-page/brief.md`.

## Direction contract

THESIS: Every answer is issued like an airport drawing sheet. The verdict sits in a title block that carries its own provenance. This replaces the category default, a chat bubble followed by a generic card with a wide table.

OWN-WORLD:
- **Palette:** cool drawing-sheet ground `#F4F6F7`, white sheets, ink `#1B2230` for the header band, rules and action, drafting blue `#2B5FAE` only for estimates and selection, grid grey `#B4BCC8` rules, and sign yellow on black only on IATA codes.
- **Type:** Public Sans, tabular figures.
- **Rules:** solid ink means observed, dashed blue means estimate.

STORY: The analyst reads the verdict and the deciding number first. They believe it because the block names its source, period and deterministic computation. They then open Why, Ranking or Method, or ask a follow-up.

FIRST VIEWPORT: ink header band (Examples, New chat). Below it, a sticky Q line, then the title block with these cells:
- code sign, airport name and context;
- the deciding number at 40px on a true 0–100 bar;
- the caveat badge;
- provenance.

Then the tabs, with Why open, holding the 68ch prose plus Growth, Pressure and Scale bars. The composer is pinned at the bottom.

FORM: Airport Layout Plan sheet, candidate 5 of 7 on the ordered list. seed:4086ef3820b49c32

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
