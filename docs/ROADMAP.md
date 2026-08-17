# Media Centre — Phased Roadmap

Media Centre is built one phase at a time. **A phase is only designed (brainstormed into a spec) once the phase before it has been fully implemented and verified — never in parallel, never ahead of schedule.** This keeps each phase's spec grounded in what actually exists, instead of guessing at a moving foundation.

Each phase gets its own document under `docs/superpowers/specs/`. This file is the index: what each phase covers, and where it currently stands.

| Phase | Focus | Status | Spec |
| --- | --- | --- | --- |
| 1 | Movies MVP — search/browse/log/rate/review/diary/watchlist/likes, fully local, no accounts, one media type | Spec approved, not yet implemented | [`2026-08-17-movies-mvp-design.md`](superpowers/specs/2026-08-17-movies-mvp-design.md) |
| 2 | TV series & anime (2nd and 3rd media types), episode/season progression tracking, and media-type selection (choose which types you engage with) | Scope captured; not yet brainstormed into a full spec | [`2026-08-17-phase2-series-anime-media-selection.md`](superpowers/specs/2026-08-17-phase2-series-anime-media-selection.md) |
| 3 | Accounts + backend, authentication, public profile pages, username/profile picture, public/private visibility | Scope captured; not yet brainstormed into a full spec | [`2026-08-17-phase3-accounts-public-profiles.md`](superpowers/specs/2026-08-17-phase3-accounts-public-profiles.md) |
| 4 | Further media types — books, manga, music, and beyond — as pluggable modules on the pattern Phase 1 establishes | Scope captured; not yet brainstormed into a full spec | [`2026-08-17-phase4-additional-media-types.md`](superpowers/specs/2026-08-17-phase4-additional-media-types.md) |
| 5 | Platform integration — iOS Home Screen widget, Spotlight search, and Siri Shortcuts/App Intents ("log [movie] as watched") | Scope captured; not yet brainstormed into a full spec | [`2026-08-17-phase5-platform-integration.md`](superpowers/specs/2026-08-17-phase5-platform-integration.md) |

## Why this ordering

- **Phase 2 before Phase 3:** series and anime are additional *media types*, which is what makes media-type selection a real feature rather than a UI control with nothing to select. Selection ships alongside the first additional type instead of waiting for accounts.
- **Phase 3 before Phase 4:** accounts and public profiles are social/backend infrastructure, independent of which media types exist. It's more valuable once there's more than one type worth showing off on a profile, but doesn't itself depend on books/manga/music existing.
- **Phase 4 before Phase 5:** each further media type (books, manga, music) needs its own catalog/metadata source and its own progression model (chapters, tracks/albums). Phase 2 is what proves out the "pluggable media type" pattern on TV/anime first; Phase 4 extends that proven pattern rather than inventing it from scratch under a new domain at the same time.
- **Phase 5 last:** the iOS widget, Spotlight, and Siri/App Intents integration have **no hard technical dependency** on earlier phases and could technically be pulled forward, but they are **polish and platform integration** rather than a core product capability. They are sequenced last so they layer on top of a settled media-type and account model, exposing a richer, more stable data set to the OS rather than a moving one.

This ordering can be revisited between phases — it is not itself locked in the way the phase-gating rule is.

## The gating rule, precisely

- Phase *N*'s spec is written, reviewed, and approved (via the brainstorming process) only after Phase *N − 1* is fully implemented and working.
- A phase's "Scope captured; not yet brainstormed" entry above is intentionally shallow — a placeholder of intent, not a design. It exists so Phase 1's own spec doesn't have to carry that context, and so nothing about the eventual shape of the app is forgotten between now and when that phase actually starts.
- When a phase's turn comes, its scope document is the starting point for a full brainstorming pass — expect it to be revised, expanded, and possibly re-shaped once real questions get asked against the app as it exists at that point.
