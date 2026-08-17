# Media Centre — Phase 5 Scope: Platform Integration (Widget, Spotlight, Siri)

**Date:** 2026-08-17
**Status:** Scope captured only — **not yet brainstormed into a full design spec.** Per [`docs/ROADMAP.md`](../../ROADMAP.md), this phase is not designed in detail until Phase 4 is fully implemented and verified.

---

## Progress Checklist

- [x] High-level scope captured (this document)
- [ ] Brainstormed into a full design spec — **blocked until Phase 4 is fully implemented and verified**
- [ ] Spec approved
- [ ] Implementation plan written
- [ ] Implemented
- [ ] Verified (manual testing + relevant unit tests)
- [ ] Phase 5 complete (no further phase currently planned beyond this one)

---

## Purpose of this document

This is a placeholder of intent, not a design. It exists so the eventual shape of Phase 5 isn't lost between now and when Phase 4 is done — at which point this document is the starting point for a real brainstorming pass, not something to implement as-is.

## Scope (high-level, subject to revision when brainstormed)

- **iOS Home Screen widget** — a glanceable widget surfacing recent diary activity, stats, or watchlist highlights on the Home Screen.
- **Spotlight search integration** — making the user's logged movies (and, by this phase, other media) findable from the system-wide Spotlight search, deep-linking into the relevant detail screen.
- **Siri Shortcuts / App Intents** — voice- and shortcut-driven logging, e.g. "Hey Siri, log [movie] as watched," plus donatable intents so the system can suggest common actions.

These are grouped together because they are all **native iOS platform-integration surfaces** — the OS reaching into the app and the app reaching out to the OS — rather than new product capabilities inside the app. They do not fit any earlier phase's theme: they are not about adding media types (Phases 2/4) and not about accounts or social visibility (Phase 3), and they are meaningfully more native/platform engineering (WidgetKit, App Intents, Core Spotlight) than an MVP should carry.

## Explicitly not decided yet

- Exactly which data each widget size surfaces (recent diary vs. stats vs. watchlist), and how many widget variants ship.
- Whether Siri logging reuses the quick-log data path directly or needs a separate intent-handling layer, and how it disambiguates spoken titles (leaning on the same TMDB disambiguation the app already uses).
- Whether Spotlight indexing covers only locally-cached items or attempts anything broader.
- Whether any of this extends to a platform beyond iOS, which is out of scope for every phase up to this point.

## Depends on

- No hard technical dependency on earlier phases — the widget, Spotlight, and Siri surfaces could technically be pulled forward and built against the Phase 1 movies-only data on their own. It is sequenced **last** deliberately: it is polish and platform integration layered on top of the product, not a core product capability, so it waits until the actual media types and account model (Phases 1–4) are settled and there is a richer, more stable data set worth exposing to the OS.
