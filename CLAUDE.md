# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is **pre-implementation**. There is currently no source code, `package.json`, or build tooling — only product specs in [specs/](specs/) and a stub [README.md](README.md). When scaffolding the project, update this file with the real build/lint/test commands.

The authoritative product definition is [specs/high-level-product-requirements.md](specs/high-level-product-requirements.md). [specs/prd-phase-1.md](specs/prd-phase-1.md) is a placeholder to be filled in.

## What this is

**Design Token Manager** is a **VS Code extension** that lets designers manage design tokens directly in a repo, replacing the Figma + Token Studio workflow. It reads/writes standard token files and presents them through a visual GUI panel, keeping the underlying files human-readable and git-friendly.

It is an **internal tool for CoupleFi** (the pilot design system), not a public VS Code Marketplace product.

## Architecture constraints (these shape every decision)

- **Storage format is W3C DTCG JSON.** Tokens are stored as standard Design Tokens Community Group files in the user's repo. Build on the open standard rather than a proprietary format; this gives interop with Style Dictionary et al. Abstract storage behind an internal model so DTCG spec churn doesn't ripple through the codebase.
- **Git is the collaboration layer.** No hosted backend, no sync server. All edits are plain file changes — diffable, reviewable, revertable in PRs. Designers are guided through commit/branch/PR flows inside the extension with git jargon hidden.
- **Files stay human-readable and git-friendly.** The GUI is a view over the files; round-tripping must produce clean, minimal diffs.
- **Editor-agnostic core.** VS Code is the host, but keep core token logic (parsing, model, references, color, a11y) decoupled from the VS Code extension API so it could move hosts later.

## Domain concepts to know before coding

- **Token types in scope (v1):** color, typography, spacing, sizing, radius, shadow, and reference/alias tokens.
- **References & aliasing:** semantic → primitive token linking is first-class and **requires cycle detection**.
- **Modern color:** the color picker authors in **OKLCH / Display-P3** (Huetone-style perceptual editing) with **auto-generated, override-able hex/sRGB fallbacks**. Sensible auto-defaults that the designer can override are the design principle.
- **Accessibility scoring:** inline **WCAG 2.x / APCA** contrast checks and color-vision-deficiency checks happen *at author time*, as colors are picked — not as a separate late step.
- **Live impact visualization:** editing a token shows the blast radius (which components/previews use it) in real time.
- **Theming & modes:** light/dark and brand/mode variants are managed side-by-side without duplication.

## Explicitly out of scope (v1)

Do not build toward: a Figma replacement for layout/vector design, a public Marketplace launch, a hosted collaboration backend, auto-generating production component code from tokens, or non-VS Code IDE support. Optional Figma sync is a possible Phase 4 fast-follow, not v1.
