# Media Centre — Phase 2 Scope: Series, Anime & Media-Type Selection

**Date:** 2026-08-17
**Status:** Scope captured only — **not yet brainstormed into a full design spec.** Per [`docs/ROADMAP.md`](../../ROADMAP.md), this phase is not designed in detail until Phase 1 is fully implemented and verified.

---

## Purpose of this document

This is a placeholder of intent, not a design. It exists so the eventual shape of Phase 2 isn't lost between now and when Phase 1 is done — at which point this document is the starting point for a real brainstorming pass (following the `superpowers:brainstorming` process, the same way Phase 1's spec was produced), not something to implement as-is.

## Scope (high-level, subject to revision when brainstormed)

- **TV series support**, via TMDB — mirrors the movie cataloging pattern from Phase 1 (search, browse, detail page, log/rate/review, watchlist, likes), extended to handle a series' multi-season/multi-episode structure.
- **Anime support**, via AniList/Jikan (MyAnimeList) — a separate catalog/metadata source from TMDB, since anime data (especially for series not licensed for Western TV databases) is better served by AniList/Jikan.
- **Episode/season progression tracking** — for both series and anime: tracking which season/episode the user has reached, distinct from the movie-style "watched or not" model. This is a genuinely new data-modeling problem Phase 1 doesn't touch (movies have no progression concept).
- **Media-type selection** — once series and anime exist alongside movies, the user picks which media types they actively engage with, during first-run onboarding and editable afterward in Profile → Settings. Unselected types get no tab, no empty list, no dead-end screen. This is the first phase where selection is a real feature (Phase 1 has exactly one type, so there's nothing to select).

## Explicitly not decided yet

Everything below is a real open question for the brainstorming pass when this phase starts — nothing here should be treated as decided:

- Whether series/anime share one unified data model (e.g. both modeled as "Show" with seasons/episodes) or two separate models given their different metadata sources.
- Exact progression UI (mark-episode-watched vs. mark-up-to-episode-N, whether rewatches of a single episode are tracked like Phase 1's `LogEntry` rewatches).
- Whether rating/review stays one-per-title (as movies do) or needs to also support per-season rating.
- The exact onboarding flow for media-type selection (first-run wizard vs. defaulting to "Movies only" and prompting to add more).
- Whether the Home tab's row structure (Trending/Top 10/Suggested/Discover) is per-media-type or blended.

## Depends on

- Phase 1 fully implemented — the log/rate/review/diary/watchlist/likes pattern and the local SQLite + TMDB caching model this phase extends.
