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

## Open Bugs — High
- [ ] Mobile watchlist reorder only updates local state — no server model for swipe ordering (cosmetic only)
- [ ] Firestore composite indexes needed for `results` subcollection `orderBy('computedAt')` queries

## Fixed
- [x] Mobile push notifications — removed stubbed registration calls ✅
- [x] Mobile delete account button — removed non-functional button ✅
- [x] Mobile `SoloSwipeScreen` module-level `seenMovieIds` — moved to useRef ✅
- [x] Mobile `FriendProfileScreen` shared commentText — clears on item switch ✅
- [x] Mobile `AIScreen` SSE parsing — uses ReadableStream now ✅
- [x] Web friends page displayName null crash — added optional chaining ✅
- [x] Web group swipe polling — reduced to 8s with cleanup ✅
- [x] API `ai/chat` N+1 query — batched user fetches ✅
- [x] Web stats page error state — added with retry button ✅
- [x] Web discover swipedIds failure — handled gracefully ✅
- [x] Mobile ProfileScreen tab race conditions — request ID tracking ✅
- [x] Mobile SearchScreen debounce unmount — mounted ref check ✅
- [x] Mobile useRoom mounted state — mountedRef in Ably callbacks ✅
- [x] Mobile app version — reads from expo-constants ✅
- [x] Web profile page useMemo — wrapped sorted lists ✅
- [x] `/terms` page — created ✅
- [x] GitHub Actions Node.js — upgraded to 22 ✅
- [x] AI chat model — using claude-sonnet-4 with retry on overload ✅
- [x] AI chat timeout — reduced TMDB fetches, set maxDuration=10 ✅
- [x] CORS — locked down with origin whitelist ✅
- [x] User search — stripped email from responses ✅
- [x] AI chat payload — size limits added ✅
- [x] Mobile discover persistence — waits for swiped IDs, auto-skips pages ✅
- [x] Mobile discover removes movies on return — useFocusEffect ✅
- [x] Mobile group mode UX — solo labels, hide bonus round, better scores ✅
- [x] Mobile home alignment — consistent spacing ✅

## Improvements to Consider
- [ ] Add web test coverage (currently 0 tests — only API + mobile have tests)
- [ ] Add E2E tests for critical flows (auth, swipe, group room lifecycle)
- [ ] Rate limiting feedback in UI (show "slow down" not generic error)
- [ ] Offline support / optimistic updates for swipes

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
