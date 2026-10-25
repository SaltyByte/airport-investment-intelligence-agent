# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Analysts at a US airport-modernization investment firm. They work at a desk, screening US airports to shortlist where added terminal or capacity should pay off, and they need evidence they can defend in an investment memo. Phones must stay fully usable, but the desk is the primary scene.

## Product Purpose

A chat agent that ranks and compares US airports for capacity investment and explains why. Success: an analyst asks a question and sees the verdict and the deciding score in the first screen of the answer, with the evidence, assumptions and caveats one step away.

## Positioning

Every number, ranking and driver comes from deterministic code over a committed public-data snapshot (BTS T-100, BTS On-Time, FAA enplanements, OurAirports). The LLM only interprets the question and explains the result. The interface makes that split visible: figures come from the result card, the prose is the reasoning.

## Operating Context

- One page: a conversation with the agent. Each data answer carries one result card per tool call (metrics with national percentiles, an optional table, notes, source, period, assumptions, caveats).
- Follow-up questions build on earlier answers; the agent suggests 2–3 follow-ups as clickable chips.
- Questions can be dictated through the browser's speech recognition; nothing is sent until the user sends it.
- Methodology, scoring and data periods: `docs/design.md`, `docs/adr/`, `GLOSSARY.md`.

## Capabilities and Constraints

- US airports only; four question types from the brief: expansion ranking, congestion comparison, long-haul share, unmet demand.
- Scores are national percentiles (0–100); expansion score = 40% Growth + 40% Pressure + 20% Scale. Airports missing an input are listed as not ranked, never scored.
- Must keep: voice dictation, follow-up chips, Stop, Retry, screen-reader announcements, source/period/assumptions/caveats on every result, and the four brief questions as starting prompts.
- Out of scope for now: shortlist/pinning across turns, column sorting, CSV export, history beyond the current browser session.

## Brand Commitments

- Name: Airport Investment Intelligence.
- IATA codes render as airfield location signs (yellow letters on a black field).

## Evidence on Hand

Real data only: the committed snapshot (`apps/server/data/snapshot.json.gz`, 516 airports). No customers, testimonials or ROI figures exist; never invent them. The expansion score is a profitability proxy, not a return estimate.

## Product Principles

1. Verdict first, evidence next, caveats always within reach.
2. Code computes, the model explains; never let prose carry a number the card does not show.
3. State uncertainty plainly: estimates are called estimates, periods are dated, missing data is named.
4. Precision over decoration: the score and its drivers are the most visible thing on screen.

## Accessibility & Inclusion

WCAG 2.2 AA: 4.5:1 text contrast, visible keyboard focus, 44px touch targets, reduced motion respected, answers announced to screen readers.
