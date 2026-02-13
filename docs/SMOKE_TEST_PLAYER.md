# SMOKE TEST PLAYER - New Loop Logic

## 1. Image Slideshow
- **Setup**: Create an Announcement with `Display Mode: Image` and add 5+ images.
- **Expected**:
  - In Player, it should appear as a SINGLE playlist item (check debug overlay if enabled).
  - Images should cycle every `imageSeconds` (default 3s).
  - Slide counter `(1/5)` should appear at bottom right (if enabled).
  - After last image, it should transition to the next playlist item only after waiting for the last image's duration.
  - Total duration should be `count * imageSeconds`.

## 2. Video Playback (Robustness)
- **a. Short Video**:
  - Setup: Add a 12s video, set `Video Max Duration` to 30s.
  - Expected: Player should skip to next item IMMEDIATELY after video ends (at ~12s), not wait for 30s.
- **b. Long Video**:
  - Setup: Add a 5m video, set `Video Max Duration` to 30s.
  - Expected: Player should skip at exactly 30s.
- **c. Broken Video**:
  - Setup: Add a video ID that doesn't exist (e.g. `QqQwWeErRrT`).
  - Expected: Player should try to load, fail/timeout, and skip within `maxSeconds + 8s` (watchdog).

## 3. Settings
- **Slide Counter**:
  - Toggle "Sayaç" checkbox in Admin > Akış.
  - Verify player shows/hides the `(x/y)` overlay on image slides.

## 4. General Flow
- Verify "Deterministik Sıralama" is maintained (Order by Flow Order).
- Verify standard text announcements still work with `textSeconds`.
