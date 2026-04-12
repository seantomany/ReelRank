# ReelRank TODO

## Bug Fixes
- [x] Stats page shows "beli" — remove it ✅
- [x] This-or-that (pairwise) shows the same movie combos repeatedly — should be different combos every time ✅
- [x] The discover view on mobile does not look good. the bar is in the middle of the screen and all that. I want it optimized a lot more ✅

## Feature Improvements
- [x] Make the date optional when logging a watched movie ✅
- [x] Pairwise comparisons: reduce from 10 to 5 at a time ✅
- [x] Add a way to rank your watchlist (casual up/down reordering on mobile) ✅
- [x] Where can I stream it — show streaming providers via TMDB on movie detail page ✅
- [x] Social: add friends, see their ratings, comment on their takes ✅
- [x] Add a way in group mode to remove a movie selection you made accidentally ✅
- [x] Daily recommendation with personalized reasoning on home screen ✅
- [x] Push notifications: daily rec reminders, weekend group session reminders ✅
- [x] Group stats and persistent groups — room history with status badges, room names ✅
- [x] Dedicated settings page from profile (account info, notification toggles, privacy, sign out) ✅
- [x] Name groups when creating rooms ✅

## Documentation
- [x] Create a tech stack / tools breakdown markdown file for interview prep (TECH_STACK.md) ✅

## Open Bugs — Critical
- [ ] Firebase API keys in `eas.json` are plaintext — move to EAS secrets before public release
- [ ] Mobile push notifications are stubbed (no-ops) — implement with `expo-notifications` or remove registration calls

## Open Bugs — High
- [ ] Mobile watchlist reorder only updates local state — needs API call to persist
- [ ] Mobile delete account button just shows "contact support" — implement or remove
- [ ] Mobile `SoloSwipeScreen` uses module-level `seenMovieIds` — persists across navigations, should be component state
- [ ] Mobile `FriendProfileScreen` shares single `commentText` across all items — can submit to wrong item
- [ ] Mobile `AIScreen` SSE parsing is brittle (manual line splitting) — consider streaming library
- [ ] Web friends page `u.displayName.charAt(0)` crashes if displayName is null
- [ ] Web group swipe runs Ably + 3s polling simultaneously — memory leak risk
- [ ] API `ai/chat` N+1 query: fetches user docs inside loop (lines 143-157) — batch instead

## Open Bugs — Medium
- [ ] Firestore composite indexes needed for `results` subcollection `orderBy('computedAt')` queries
- [ ] Web stats page silently ignores API errors — needs error state
- [ ] Web discover: if `swipedIds` API fails, duplicates may appear
- [ ] Mobile `ProfileScreen` tab switching race conditions with stale responses
- [ ] Mobile `SearchScreen` debounce doesn't cancel in-flight fetch on unmount
- [ ] Mobile `useRoom` hook doesn't check mounted state in Ably callback
- [ ] Mobile app version hardcoded in `app.config.js` AND `SettingsScreen` — single source
- [ ] Web profile page sorts lists on every render — needs `useMemo`

## Improvements to Consider
- [ ] Add web test coverage (currently 0 tests — only API + mobile have tests)
- [ ] Add E2E tests for critical flows (auth, swipe, group room lifecycle)
- [ ] Rate limiting feedback in UI (show "slow down" not generic error)
- [ ] Offline support / optimistic updates for swipes
- [ ] Add `/terms` page on web (mobile links to it)
- [ ] Upgrade GitHub Actions from Node.js 20 to 24

## Ideas / Backlog
- *(Add future ideas here)*

---
*Add new problems below — we'll triage and fix them:*


## Issues on Mobile (Fixed)
- [x] Discover does not have any memory - it keeps showing the same movies over and over ✅
- [x] Just a black screen when I am on profile ✅
- [x] Add an onboarding screen ✅
- [x] The host button on mobile in group mode only shows half of the word host ✅
- [x] I want to be able to tap the room code to be able to copy it to make it easy to send to friends ✅
- [x] Group mode only reloads if I leave the screen and come back ✅
- [x] The back button saying "Maintab" - I want it to say like home or something ✅
- [x] I want it to look more optimized ✅
