# Proposal to Final Report Alignment

This document is a defence aid. It distinguishes what the proposal planned from what the final RICA implementation actually delivers.

## Original Project Title

RICA - A Real-Time Intelligent Coding Assistant for Detecting Architectural Violations, Design-Pattern Misuse, and Business-Logic Issues During Development

## Core Proposal Claim

The proposal positioned RICA as a real-time IDE assistant that maintains project context, detects architectural and pattern violations, identifies selected business-logic issues, and optionally uses AI reasoning for ambiguous cases.

## Final Defence Position

RICA should be defended as a deterministic static analysis and developer-assistance tool with optional AI advisory support.

Use this wording:

> RICA's core contribution is deterministic AST and dependency-graph based architecture analysis inside VS Code. The intelligent aspect comes from project-wide structural modelling, rule classification, evidence generation, incremental revalidation, documentation, and optional AI-assisted advisory workflows. Full IFDS data-flow analysis and large-scale precision/recall benchmarking are future work.

## Coverage Matrix

| Proposal area | Final status | Defence note |
|---|---|---|
| VS Code integration | Complete | Extension commands, diagnostics, documentation command, and violation panel are implemented. |
| Real-time feedback | Complete | File-save and change-triggered analysis are supported with debouncing and incremental revalidation. |
| Java parsing / AST extraction | Complete for project scope | Parser extracts classes, imports, annotations, fields, methods, calls, object creation, relationships, and ranges. |
| Project-wide model | Complete for structural analysis | AST cache, dependency graph, graph maps, and class lookup support project-level rules. |
| Architecture rules | Complete | Layer, cross-file, API boundary, and package boundary rules are implemented. |
| Design-pattern rules | Complete for deterministic rule set | RICA-V301 to RICA-V323 are covered by implementation/docs/test fixtures. |
| Business-logic violations | Partial | Business-logic placement, validation, raw access, and mutating endpoint probes exist; full business-policy reasoning remains future work. |
| IFDS data-flow | Future work | Mention as proposed advanced extension, not completed implementation. |
| AI reasoning | Partial/Advisory | Optional AI advisory and AI-ready diagnostics exist; AI is not the primary detector. |
| Quick fixes | Scoped | Safe/simple suggestions exist; risky architecture fixes are documented instead of auto-applied. |
| Documentation | Complete | Generated rule docs, concept docs, rule matrix, and concept map exist. |
| Evaluation | Partial but defensible | Unit tests and three deterministic test projects pass; external benchmark precision/recall remains future work. |

## Viva Answer for "Where is the AI?"

> The AI part is intentionally advisory. RICA does not rely on an LLM to decide whether a deterministic architecture rule is violated, because that would make evaluation unstable. Instead, RICA produces structured diagnostics with rule code, evidence, reason, confidence, severity, and documentation. These diagnostics can be used by optional AI providers or external tools such as GitHub Copilot and Codex to explain the issue or suggest a refactor. This keeps detection reproducible while still supporting intelligent remediation.

## Viva Answer for "Where is IFDS?"

> IFDS-style data-flow analysis was included in the proposal as an advanced direction for business-logic verification. During implementation, the project prioritised the real-time editor extension, AST extraction, dependency graph, deterministic architecture rules, documentation, and incremental revalidation. Full IFDS analysis requires a deeper type resolver, call graph, source-sink model, and labelled evaluation dataset, so it is documented as future work. The current system still provides the project-wide structural foundation needed to add IFDS later.

## Viva Answer for "Is RICA Perfect?"

> No static analysis tool is perfect across all Java projects. RICA is designed to be explainable and configurable. It detects a defined rule set, reports evidence, supports false-positive tuning, and includes tests for both violating and compliant examples. The goal is early architecture feedback and developer guidance, not mathematical proof for every Java program.

