# Media Centre — Phase 4 Scope: Further Media Types (Books, Manga, Music)

**Date:** 2026-08-17
**Status:** Scope captured only — **not yet brainstormed into a full design spec.** Per [`docs/ROADMAP.md`](../../ROADMAP.md), this phase is not designed in detail until Phase 3 is fully implemented and verified.

---

## Purpose of this document

This is a placeholder of intent, not a design. It exists so the eventual shape of Phase 4 isn't lost between now and when Phase 3 is done — at which point this document is the starting point for a real brainstorming pass, not something to implement as-is.

## Scope (high-level, subject to revision when brainstormed)

- **Books, manga, and music** — and potentially further media types beyond that — each added as its own pluggable module: its own catalog/metadata source, its own screens, and its own progression model where relevant (e.g. chapters read for manga, tracks/albums for music), built on the same underlying log/rate/review/diary pattern Phase 1 establishes for movies.
- Each new type participates in the **media-type selection** mechanism introduced in Phase 2 — a user who doesn't read manga never sees a Manga tab or an empty Manga list.
- **Cross-media "based on / features / adapted from" connections** — relationships between different media *types*: a movie based on a novel (e.g. a film adaptation of *The Odyssey*), the featured soundtrack tracks that played during a movie, an anime's source manga. This is deliberately distinct from **same-type franchise/collection ordering**, which Phase 1 already handles for movies (the MCU/Transformers-style watch-order row — see the Phase 1 spec's "Franchise & Collection Ordering"). Cross-media connections only become meaningful once those *other* media types (books, music, manga) exist here as trackable entities, so a "based on" or "featured in" link is more than a bare text label pointing at nothing.

## Explicitly not decided yet

- Metadata sources per type (e.g. a books API such as Google Books/Open Library, a manga source such as MangaDex/AniList, a music source such as MusicBrainz/Spotify) — none are chosen yet.
- Whether music fits the same "log an individual watch" model at all, or needs a different core interaction (e.g. logging an album vs. a single listen) — this is the most structurally different media type from movies and deserves real scrutiny before assuming the existing pattern fits.
- Whether all three types ship together as one phase or get split further once this phase is actually scoped.
- The **metadata source for cross-media connections** is genuinely undecided. TMDB does **not** reliably provide clean "based on this novel" or soundtrack/needle-drop data, so a different source (e.g. Wikidata) or manual curation would have to be evaluated when this phase is brainstormed. Also open: whether a connection is purely informational text or a real navigable link between two separately-tracked items (e.g. tapping *The Odyssey* under a film jumps to the tracked book).

## Depends on

- Phase 3 fully implemented — accounts/public profiles are assumed to exist by this point, and this phase extends the pluggable-media-type pattern that Phase 2 (series/anime) is what actually proves out, not Phase 1 alone.
