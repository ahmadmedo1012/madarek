# Data Model — Heron Fidelity

**Feature**: `013-heron-fidelity` | **Date**: 2026-11-18

## Verdict: NO data-model changes

This program is visual/interaction/motion fidelity work on existing surfaces. It explicitly excludes changes to business logic, roles, permissions, API contracts, database schema or data (spec §Excluded; FR-008). No Prisma model, migration, seed or enum is touched by any task 0–10.

## What the evidence layer stores instead (already committed, not schema)

The fidelity instrument's outputs under `docs/audit/evidence/` are JSON + PNG artifacts (capture.json, scorecard.json, manifest.json, repeatability.json, stress.json, ref-onsets.json, paired crops), versioned as evidence — not runtime data. Their shapes are governed by `scripts/conformance/fidelity.mjs` + `pairs.mjs` (see [`contracts/measurement-law.md`](../contracts/measurement-law.md)).

## Guard

Any PR that touches `backend/prisma/schema.prisma` or `backend/prisma/migrations/` in the name of "fidelity" is out of scope by definition and must be routed to a separate feature with its own spec.
