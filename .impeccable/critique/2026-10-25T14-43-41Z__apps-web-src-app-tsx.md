---
target: the main page
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/alexb/orca/workspaces/airport-investment-intelligence-agent/agent-brain-and-tools/apps/web/src/App.tsx"
target_fingerprint: "sha256:7afffcf5dc811f79ddb993203d524df39b3004df4e4a99d83159d6f73679ff3b"
target_path: /Users/alexb/orca/workspaces/airport-investment-intelligence-agent/agent-brain-and-tools/apps/web/src/App.tsx
timestamp: 2026-10-25T14-43-41Z
slug: apps-web-src-app-tsx
---
## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | The skeleton matches the title block and the question is pinned; the selected tab resets to Why when the layout crosses a breakpoint |
| 2 | Match system / real world | 3 | Engineer wording leaks: "Computed by deterministic scoring", "(PREZIP)", "percentile" repeated in driver labels |
| 3 | User control and freedom | 2 | New chat wipes the session with no undo; a sent question can't be edited; Esc doesn't stop a reply |
| 4 | Consistency and standards | 3 | Follow-up chips appear on some answers and not others; provenance repeated in Method |
| 5 | Error prevention | 3 | Empty send blocked, caveat badges set expectations; New chat unguarded |
| 6 | Recognition rather than recall | 3 | The comparator (SNA) appears only as "(54.2)"; the unranked list is bare codes at the bottom of Method |
| 7 | Flexibility and efficiency | 2 | Tab keys and dictation only; no copy, no shortcuts, no jump between turns |
| 8 | Aesthetic and minimalist design | 3 | Clear hierarchy; dead space in the airport cell and beside the prose; double frame (sheet plus ruled block) |
| 9 | Error recovery | 3 | Plain message plus Retry; failed lookups name the reason |
| 10 | Help and documentation | 3 | Method tab documents formula, peer set and caveats; Growth and Scale are not defined at the bars |
| **Total** | | **28/40** | **Good** |

## Design Specificity Verdict
The answer is authored for this product: the title block with the IATA sign, provenance cells, the deciding number on a true 0–100 bar and a ruled caveat badge. Everything around it (empty state, header, composer, tabs) is the category default. The dashed-blue estimate rule never shows on the two core questions.

Deterministic scan:
- **CLI `detect apps/web/src`:** 0 findings.
- **Browser overlay, empty state:** clean.
- **Browser overlay, answer state:** 1 finding, `flat-type-hierarchy` (h1 16, h2 16, h3 18). It is likely a false positive: emphasis sits on the 40px number, which is a `<p>`.
- **Earlier finding:** `line-length` is gone.

## Priority Issues
1. **[P1] The title block answers a narrower question than the one asked.** "Which airports…" gets one airport, and "Compare LA and Santa Ana" gets LAX alone, with SNA only as a parenthetical. About 600×160px of the airport cell is empty on desktop.
   - **Fix:** a shortlist (top 3–5) in the block for rankings, and paired rows plus a comparator tick for comparisons. ($impeccable layout)
2. **[P2] A near-tie is presented as a firm result.** LAX 57.6 vs SNA 54.2 on one month of data, and ranks 3–5 differ by tenths.
   - **Fix:** a code-computed margin label ("Close: 3.4 pts"). ($impeccable clarify)
3. **[P2] The evidence for "why" sits in the wrong tab.** Why shows only the leader's drivers; the runner-up values, the deciding delta and the unranked names are in Ranking, Data or Method → Notes.
   - **Fix:** paired driver bars plus the delta caption in Why; unranked names under the Ranking table; remove the duplicated provenance from Method. ($impeccable clarify)
4. **[P2] The empty state is a generic chat starter.** None of the drawing-sheet world shows, and "Figures are estimates" misdescribes observed data.
   - **Fix:** examples with code signs and output type, the data period stated once, and a rewritten footnote. ($impeccable onboard)
5. **[P2] Follow-up chips are unreliable.** The same question gave 3 chips at 390 and none at 1280.
   - **Fix:** code-generated fallback chips when the model skips the tool. ($impeccable harden)

## Persona Red Flags
- **Alex:**
  - no copy of the verdict or table, and no shortcuts;
  - plural questions need a click on Ranking;
  - New chat wipes the session in one click.
- **Sam:**
  - few red flags; the heading chain is h1 → h2 → h3 → h4 and the announcement is the verdict only;
  - the selected tab is lost on a breakpoint change.
- **Casey:**
  - one answer is 2.2 screens at 390;
  - the Ranking panel is 2,323px for 14 airports;
  - source and period are hidden on a phone.
- **Dana:**
  - no threshold for "strong";
  - one-decimal precision on percentile composites;
  - the decisive delta is buried in Notes;
  - the comparison looks settled when it is a near-tie.

## Minor Observations
- "Computed" cell vertically centred at 768/1280.
- Double frame around the title block.
- 12px header/composer edge mismatch at 1280.
- Driver labels long, with "percentile" repeated.
- Empty-state stagger caught mid-fade.
- 500px of empty space under the drivers column on desktop.

## Questions to Consider
- Should a "which airports" answer lead with a shortlist?
- Should code print "close call" under a set margin?
- Does Method need to repeat the provenance the block already shows?
- Could the empty state preview a title block?
