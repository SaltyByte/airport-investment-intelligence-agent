---

name: Airport Investment Intelligence
description: Each answer is issued like an Airport Layout Plan drawing sheet, with the verdict in a title block that names its own source.
colors:
ink: "#1b2230"
drafting-blue: "#2b5fae"
sign-yellow: "#f2c230"
sign-black: "#14171c"
sheet-ground: "#f4f6f7"
sheet-white: "#ffffff"
ground-fill: "#e6eaee"
muted-ink: "#4f5a6b"
grid-grey: "#b4bcc8"
destructive: "oklch(0.577 0.245 27.325)"
typography:
display:
fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
fontSize: "2.5rem"
fontWeight: 600
lineHeight: "2.75rem"
fontFeature: "tnum"
headline:
fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
fontSize: "1.5rem"
fontWeight: 600
lineHeight: "2rem"
title:
fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
fontSize: "1.125rem"
fontWeight: 600
lineHeight: "1.5rem"
body:
fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
fontSize: "1rem"
fontWeight: 400
lineHeight: 1.625
body-small:
fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
fontSize: "0.875rem"
fontWeight: 400
lineHeight: "1.25rem"
fontFeature: "tnum"
label:
fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
fontSize: "0.75rem"
fontWeight: 500
lineHeight: "1rem"
rounded:
none: "0px"
sm: "2px"
md: "4px"
lg: "6px"
spacing:
hairline: "1px"
xs: "4px"
sm: "8px"
md: "12px"
lg: "16px"
xl: "24px"
2xl: "40px"
components:
answer-sheet:
backgroundColor: "{colors.sheet-white}"
textColor: "{colors.ink}"
rounded: "{rounded.lg}"
width: "1040px"
title-block-cell:
backgroundColor: "{colors.sheet-white}"
textColor: "{colors.ink}"
rounded: "{rounded.none}"
padding: "12px 16px"
code-sign:
backgroundColor: "{colors.sign-black}"
textColor: "{colors.sign-yellow}"
typography: "{typography.body-small}"
rounded: "{rounded.md}"
height: "28px"
padding: "0 8px"
code-sign-large:
backgroundColor: "{colors.sign-black}"
textColor: "{colors.sign-yellow}"
rounded: "{rounded.md}"
height: "48px"
padding: "0 12px"
caveat-badge:
backgroundColor: "{colors.sheet-white}"
textColor: "{colors.ink}"
typography: "{typography.label}"
rounded: "{rounded.none}"
padding: "4px 8px"
header-band:
backgroundColor: "{colors.ink}"
textColor: "{colors.sheet-white}"
height: "56px"
button-primary:
backgroundColor: "{colors.ink}"
textColor: "{colors.sheet-white}"
rounded: "{rounded.md}"
size: "44px"
button-outline:
backgroundColor: "{colors.sheet-white}"
textColor: "{colors.ink}"
rounded: "{rounded.md}"
height: "44px"
padding: "10px 16px"
button-outline-hover:
backgroundColor: "{colors.ground-fill}"
button-on-ink:
textColor: "{colors.sheet-white}"
rounded: "{rounded.md}"
height: "44px"
padding: "0 12px"
tab:
textColor: "{colors.muted-ink}"
typography: "{typography.body-small}"
height: "44px"
padding: "0 12px"
tab-selected:
textColor: "{colors.ink}"
input-composer:
backgroundColor: "{colors.sheet-white}"
textColor: "{colors.ink}"
rounded: "{rounded.md}"
padding: "8px 12px"
height: "44px"
scale-bar:
backgroundColor: "{colors.ground-fill}"
height: "6px"
scale-bar-thick:
backgroundColor: "{colors.ground-fill}"
height: "10px"
---

# Design System: Airport Investment Intelligence

## Overview

**Creative North Star: "The Airport Layout Plan Sheet"**

Every answer is issued like a sheet from an airport drawing set. The page is a cool drawing-sheet ground. Answers sit on it as white sheets, and an ink header band runs across the top. Each tool result opens with a title block, the ruled cell grid found in the corner of an engineering drawing. It holds the airport's location sign, the deciding number on a true 0–100 scale, the caveat, and the provenance (source, period, generated date, "Computed by deterministic scoring"). The prose explanation follows the title block, never the other way round. The world is precise rather than decorative: ink does the structural work, drafting blue marks anything estimated or selected, and sign yellow appears only where an airfield sign would.

Density is that of a working document: 1px rules, compact 12px labels and tabular figures, with one large number per block. Depth comes from rules and tone, never from lift. Motion is short and only arrives (ease-out fades and 6px rises on transform and opacity). Loops run only while something is loading, and reduced motion gets static content.

Rejected on purpose: chat bubbles followed by a generic card with a wide table, monospaced or "code" display faces for data, and broadsheet hairlines scattered across the page (rules stay inside the title block and tables).

**Key Characteristics:**
- Cool drawing-sheet ground, white sheets, ink header band.
- A title block per result, built from cells separated by 1px grid-grey rules inside an ink frame.
- Solid ink means observed, dashed drafting blue means estimate.
- IATA codes render as airfield location signs: yellow on black.
- One face (Public Sans) with tabular figures for every number.
- Square corners inside the title block, soft 6px corners only on the outer sheet.

## Colors

A near-monochrome ink-on-cool-paper palette with one functional blue and one sign-only yellow.

### Primary

- **Drawing Ink** (#1b2230): text, the header band, primary buttons, input borders, the title-block frame, observed bar fills, and the table header rule. Ink carries both structure and action.

### Secondary

- **Drafting Blue** (#2b5fae): estimates (dashed bar outline, dashed value underline, the "est." tag), the selected-tab underline, links, and every focus ring. It is used opaque only: at 50% alpha it drops under 3:1 on white.

### Tertiary

- **Sign Yellow** (#f2c230) on **Sign Black** (#14171c): the airfield location sign. It appears on IATA code signs, on the header's plane mark (the same sign pairing), and as the text-selection colour (yellow ground, sign-black text).

### Neutral

- **Sheet Ground** (#f4f6f7): the page behind the sheets. It is also the ground of the sticky question line.
- **Sheet White** (#ffffff): answer sheets, title-block cells, the composer bar, menus, and outline buttons placed on sheets.
- **Ground Fill** (#e6eaee): a derived tint, the sheet ground one step darker. It fills empty bar tracks and skeletons and is the hover fill for list rows, menu items and outline buttons. Reviewers accepted it as a tint of the brief palette, not a new hue.
- **Muted Ink** (#4f5a6b): a derived tint, ink at reduced strength. It colours cell labels, secondary lines, placeholder text, unselected tabs, and the question text on the Q line. It reaches at least 4.5:1 on the ground, on white and on Ground Fill. Reviewers accepted it as a tint of the brief palette.
- **Grid Grey** (#b4bcc8): the 1px rules between title-block cells, table row rules, sheet borders, scale-bar ticks, and the scrollbar thumb. It is too light for an input boundary (under 3:1), so inputs take ink.
- **Destructive Red** (oklch(0.577 0.245 27.325)): the failed-reply alert, the "Data unavailable" icon and the live-dictation dot only.

### Named Rules

**The Observed/Estimate Rule.** Solid ink means observed and dashed drafting blue means estimate, on bars, values and column labels alike. An estimated value is blue with a dashed underline plus an "est." tag, or the column header carries "est." instead. Never present an estimate in solid ink.

**The Sign-Only Yellow Rule.** Sign yellow appears only as an airfield sign: yellow on sign black, with a 1px yellow inset border on code signs. It is never a generic highlight, badge or button colour.

**The Blue-Is-Meaning Rule.** Drafting blue never decorates. It always means estimate, selection, link or focus.

## Typography

**Display Font:** Public Sans (with ui-sans-serif, system-ui, sans-serif), loaded at weights 400, 500 and 600.
**Body Font:** Public Sans.
**Label/Mono Font:** none. Labels are Public Sans 500, and numbers use tabular figures.

**Character:** a single civic, signage-adjacent grotesque (Public Sans is the US government's own face). Weight and size create the hierarchy; a second family is never used.

### Hierarchy

- **Display** (600, 2.5rem, 2.75rem line, tabular): the deciding number in the title block. There is one per block.
- **Headline** (600, 1.5rem, 2rem line): the empty-state heading only.
- **Title** (600, 1.125rem, 1.5rem line): the airport name or result title in a title block, and metric values.
- **Body** (400, 1rem, 1.625 line): answer prose, capped at 34rem (about 68–70 characters a line).
- **Body Small** (400–600, 0.875rem, 1.25rem line, tabular in tables): tabs, tables, buttons, context lines and code signs.
- **Label** (500, 0.75rem, 1rem line, sentence case, Muted Ink): cell labels such as Source, Period and Expansion score, plus column headers and driver labels. Labels are never uppercase and never tracked out.

### Named Rules

**The Tabular Figures Rule.** Every number that can line up with another (scores, percentiles, table cells, dates) uses tabular figures.

**The One Big Number Rule.** Display size is reserved for the deciding number of a title block. Nothing else on the page approaches it.

## Layout

A single centred column, at most 1040px wide with 16px gutters (24px from 768px up), shared by the header, the answer sheets and the composer so their edges line up. All three reserve a stable scrollbar gutter on both edges. The page never scrolls sideways: only `<main>` scrolls, the header is a fixed 56px ink band, and the composer is pinned to the bottom with safe-area padding.

Each turn is a question line plus its answers, with 40px between turns and 12px within one. The question line ("Q" in ink, then the question in Muted Ink) sticks to the top on the sheet ground while its answer is in view, and the latest turn is at least one viewport tall so the question can anchor to the top.

Inside a sheet, title blocks stack with 12–16px padding around them. Every row of a title block shares one two-track template (`minmax(0,1fr)` beside `minmax(15rem,20rem)` from 640px up), so its vertical rules line up from top to bottom. On a phone the cells stack, and only the "Computed" provenance line stays (the rest moves to the Method tab). In the Why tab from 1024px up, the prose (≤34rem) sits beside a 12–16rem driver column. Below 1024px the drivers form a 3-up row above the prose.

Tables appear from 640px up and scroll inside their own box with the airport column sticky. Below 640px each row becomes a stacked list item. Breakpoints are 640px, 768px and 1024px. The spacing rhythm is 4px-based: 4, 8, 12, 16, 24 and 40.

## Elevation & Depth

The system is flat. Depth comes from tone (ground, then white sheet, then Ground Fill) and from rules (1px grid grey, with an ink frame on title blocks), never from shadow. The only lifted surface is the Examples dropdown menu, a floating popover that takes a large soft shadow so it reads above the ink band.

### Shadow Vocabulary

- **Popover lift** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): floating menus only.

### Named Rules

**The Ruled-Not-Lifted Rule.** Sheets and title blocks separate from the ground with rules and tone. Cards never float.

## Shapes

The corner language comes from drawing practice. The outer answer sheet has gently rounded 6px corners, and the title block inside it is square (0px), because it is a ruled grid. The code sign is 4px, like a stamped placard, and buttons, inputs, menu items and code blocks share that 4px. The header's plane mark is 2px, and only status dots are circles.

Title-block rules are drawn as 1px gaps over a grid-grey ground rather than per-cell borders, so they survive any wrap. The frame around the block is a 1px ink line. The caveat badge is also square, with a 1px ink border. Scale bars are square-ended, with 1px × 4px grid-grey ticks hanging below the track at 25, 50 and 75.

### Named Rules

**The Corner Language Rule.** Use 6px on the sheet, 0 inside the title block, and 4px on the code sign and controls. Never round a ruled cell.

## Components

### Title Block (signature component)

The verdict as a drawing-sheet title block. A 1px ink frame encloses square cells laid out on the shared two-track grid, separated by 1px grid-grey rules.
- **Row 1, left:** the large code sign, then the airport name (Title) and its context line (Body Small, Muted Ink). A result with no deciding airport shows its title here instead.
- **Row 1, right:** a label (such as "Expansion score"), the deciding number at Display size, the thick scale bar, then the caveat badge.
- **Provenance rows:** Source | Period, then Generated | "Computed by deterministic scoring". Each cell has a Label above Body-Small text.
- **Loading:** the same cell geometry with skeleton blocks (a Ground Fill sweep that stays static under reduced motion), so the swap barely moves. "Gathering data" stays readable as text.
- **Unavailable:** a single cell with a destructive icon, "Data unavailable" and a plain-language reason.

### Code Sign

An airfield location sign: sign-yellow letters (600) on sign black with a 1px yellow inset ring and 4px corners. The small size (28px tall, at least 56px wide) is used in tables and stacked rows; the large size (48px tall, at least 80px wide, 1.5rem text) is used in the title block. An airport always appears as the sign followed by its short name.

### Scale Bar

A true 0–100 scale on a Ground Fill track: 6px thin or 10px thick, with grid-grey ticks at 25, 50 and 75. Observed values fill solid ink; estimates draw a dashed drafting-blue outline. The bar's length always equals the value on the scale and is never normalised to the maximum.

### Caveat Badge

A square badge with a 1px ink border, a warning-triangle icon and Label text. It sits beside the number it qualifies, inside the title block.

### Buttons

- **Shape:** gently squared (4px). Every control on the page is at least 44px tall or 44px square.
- **Primary:** ink fill, white icon. These are the Send and Stop icon buttons.
- **Outline:** a white fill with a grid-grey border, used for follow-up chips (full-width on a phone, wrapping from 768px), Retry and dictation. "All metrics" takes a 1px ink border. Hover fills with Ground Fill.
- **On ink:** ghost buttons in the header with white text and a 10% white fill on hover or when open.
- **Press:** under `motion-safe`, a 0.95–0.97 scale on active. Disabled controls drop to 50% opacity.

### Tabs (Why / Ranking or Data / Method)

Text tabs on a rule under the title blocks, each 44px tall. The selected tab has ink text and a 2px drafting-blue underline; unselected tabs are Muted Ink and turn ink on hover. They follow the ARIA tabs pattern with a roving tabindex, ←/→ wrapping, and Home/End.

### Inputs / Fields

- **Style:** the composer textarea is white with a 1px ink border (3:1 boundary) and 4px corners. It is 44px tall at minimum, grows to 160px, and uses Muted Ink placeholder text.
- **Focus:** the border turns drafting blue and gains a 1px blue ring. The autofocus on load stays quiet (no ring) until the field is first left.

### Navigation

The 56px ink header band holds the plane mark and the product name (the name is screen-reader-only on a phone), with Examples (a dropdown of the four brief questions) and New chat on the right. The menu is a white popover with 4px items, Ground Fill when highlighted, and a 44px minimum row height.

### Focus Rings

- Focus rings are always visible, 2px, and opaque drafting blue.
- Standalone buttons take a 2px offset.
- Cells, tabs, menu items, the tab panel and scrollable regions take an inset ring, so their containers never clip it.
- Controls on the ink band use a white ring with an ink offset, because blue reaches only 2.6:1 on ink.
- Scrollable tables, code blocks and markdown tables take a tab stop with a ring. Tables do so only while they actually scroll.

## Do's and Don'ts

### Do:

- **Do** put each tool result's verdict in a title block (code sign, deciding number on a true 0–100 bar, caveat, provenance) before any prose.
- **Do** draw observed values in solid ink and estimates in dashed drafting blue, with "est." in text or in the column header.
- **Do** render every IATA code as a code sign (sign yellow on sign black, 1px yellow inset ring, 4px corners).
- **Do** keep corners at 6px on the sheet, 0 inside the title block, and 4px on code signs and controls.
- **Do** use Ground Fill (#e6eaee) for tracks, skeletons and hover, and Muted Ink (#4f5a6b) for labels and secondary text, rather than inventing further greys.
- **Do** use tabular figures for every number, and keep prose at 34rem or less.
- **Do** give every interactive element a 2px opaque drafting-blue focus ring: inset inside containers, white on the ink band.

### Don't:

- **Don't** use sign yellow anywhere except the location-sign pairing (code signs, the header mark and text selection).
- **Don't** use drafting blue decoratively, or translucent: below full opacity it fails 3:1 on white.
- **Don't** put a grid-grey border on an input. Inputs take ink.
- **Don't** lift sheets or title blocks with shadows. Shadow is for floating menus only.
- **Don't** introduce a monospaced or "code" face for data labels.
- **Don't** add rules outside the title block and tables.
- **Don't** normalise a scale bar to the largest value. Its length is the value on 0–100.
