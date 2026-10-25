---

target: the main page
total_score: 23
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/Users/alexb/orca/workspaces/airport-investment-intelligence-agent/agent-brain-and-tools/apps/web/src/App.tsx"
target_fingerprint: "sha256:6dadb25c47d3a0024d9287139367db15e64e50678fb2e85fd52bcca1d6d71679"
target_path: /Users/alexb/orca/workspaces/airport-investment-intelligence-agent/agent-brain-and-tools/apps/web/src/App.tsx
timestamp: 2026-10-25T12-52-20Z
slug: apps-web-src-app-tsx
---

## Design Health Score

| #         | Heuristic                       | Score     | Key issue                                                                                        |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------ |
| 1         | Visibility of system status     | 3         | Stick-to-bottom lands on the answer's tail; verdict and card arrive off-screen above             |
| 2         | Match system / real world       | 3         | Card leaks internal terms: Pressure, Scale, "83rd pct", PREZIP, CY2025 vs CY2024                 |
| 3         | User control and freedom        | 2         | No New chat, no edit/resend; reload wipes the conversation                                       |
| 4         | Consistency and standards       | 3         | Column labels differ per tool (Airport code/Airport vs Airport/Name); "≥15 min" vs "15+ minutes" |
| 5         | Error prevention                | 2         | Nothing persisted; refresh or tab eviction loses the analysis                                    |
| 6         | Recognition rather than recall  | 2         | Examples vanish after turn 1; column terms defined 900px below headers                           |
| 7         | Flexibility and efficiency      | 1         | No sort, column choice, copy/export, ↑ recall                                                    |
| 8         | Aesthetic and minimalist design | 2         | 1850px card + prose repeating its numbers; 14–16 columns; 10-bullet unranked list                |
| 9         | Error recovery                  | 3         | Plain alert + Retry; copy is developer-facing                                                    |
| 10        | Help and documentation          | 2         | One empty-state footnote; no method view after turn 1                                            |
| **Total** |                                 | **23/40** | **Acceptable**                                                                                   |

## Design Specificity Verdict

Mostly the generic shadcn chat template (centred 800px strip, outline example buttons, white card with a plain table, system font). Authored for this product: the yellow-on-black IATA code sign, the navy + sign-yellow palette, the provenance footer. Missing: the product's core idea, a deterministic score, is never visualised (no score bars, no 40/40/20 pillars, no LAX–SNA delta). Character lives in decoration, not in the data.
Deterministic scan: CLI `detect apps/web/src` 0 findings. Browser overlay: empty state clean; answer state 1 finding, `line-length` ~106 chars/line on the prose paragraph (markdown.tsx `p` has no max-width inside the 800px column). Agrees with the design review's layout finding.

## Priority Issues

1. [P1] Answer is upside down: tool card (1850px at 1280, 2146px at 390) renders before the verdict prose, which then repeats the card's numbers; auto-scroll shows the tail. UX rule: visual-hierarchy. Fix: verdict first, compact evidence after, scroll new answer's top into view, prose explains why instead of reciting. layout, distill.
2. [P1] Result tables fit no viewport; the expansion score is off-screen at 390 (29% of the 1108px table visible), 66%/56% at 1280; no scroll cue; names wrap to 3–5 lines. UX rule: horizontal-scroll (High), Table Handling (scroll or card layout). Fix: merged sticky airport cell, score + pillars as default columns, raw KPIs on demand, stacked rows on phone. adapt.
3. [P2] 800px strip wastes 480px at 1280 while tables scroll sideways; prose lines still run ~106 chars. UX rule: Container Width (65–75ch for text only). Fix: prose at ~70ch, data breaks out wider. layout.
4. [P2] Assumptions and caveats are the weakest text (12px muted) while 10 "no delay data" bullets get full ink. UX rule: progressive-disclosure, visual-hierarchy. Fix: one-line unranked summary, the decision-critical caveat promoted, rest in a Method & caveats disclosure. typeset, clarify.
5. [P2] Analysis is fragile: reload wipes turns; no New chat; examples unreachable after turn 1; no copy. UX rule: state-preservation. Fix: persist session, New chat, examples reachable. harden.

## Persona Red Flags

- Alex (power user): no sort, no column hiding, no copy, no ↑ recall; compares BGR vs BOS by scrolling a 1022px table sideways.
- Sam (screen reader): one heading for the whole conversation (card titles are divs); live region reads the full 1,042-char answer; two role=status regions.
- Casey (mobile): one answer is 5 screens at 390; score column off-screen; tab eviction loses everything. Good: thumb-zone composer, 44px targets.
- Dana (investment analyst): metric slots show counts, not the winner; score has no scale cue; pillars not labelled as percentiles; no delta in comparisons; no shortlist across turns.

## Minor Observations

768: content inset 15px from header/composer edges (scrollbar-gutter both-edges). Empty state leaves a void at 1280. Composer autofocus shows the strong ring on load. Follow-up chips wrap raggedly at md+. "83rd pct" jargon. Model copy "I used your New England reading". Error copy developer-facing. Header has no scope or method entry. System font only; tabular-nums correct.

## Questions to Consider

What if every answer opened with a verdict strip (#1, score, one caveat) and the table were a disclosure? Does a 14-column table belong in a chat bubble, or in a wide canvas that persists as a shortlist? If the score is the product, why is it column 4?
