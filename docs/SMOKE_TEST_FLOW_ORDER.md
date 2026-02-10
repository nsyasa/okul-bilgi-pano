# Smoke Test: Announcement Flow Order

## Pre-requisites
1.  Admin account logged in.
2.  At least 3-4 announcements created (mix of active/passive if possible, but testing active ones is priority).
3.  Player page open in a separate tab/window.

## Test Steps

### 1. Database & Initial State
- [ ] Check `announcements` table in Supabase.
- [ ] Verify `flow_order` column exists.
- [ ] Verify existing announcements have populated `flow_order` values (backfill check).

### 2. Admin UI (`/admin/flow`)
- [ ] Navigate to `/admin/flow` via the "Akış Sırası" link in the sidebar.
- [ ] Verify list of active announcements is displayed.
- [ ] **Swap Test:**
    - Click "Down" arrow on the first item.
    - Verify it visually swaps with the second item.
    - Verify a toast message "Sıralama güncellendi" appears.
    - Refresh the page. Verify the new order persists.
- [ ] **Boundary Test:**
    - Verify the "Up" arrow is disabled for the first item.
    - Verify the "Down" arrow is disabled for the last item.

### 3. Player Integration
- [ ] Open `/player` page.
- [ ] Observe the rotation of announcements.
- [ ] Verify the order matches the order set in `/admin/flow`.
- [ ] **Real-time Check:**
    - Keep Player open.
    - In Admin, swap two items.
    - Wait for the next Player refresh (default 60s) or manually refresh the Player page.
    - Verify the new order is reflected.

## Notes
- The player uses `flow_order ASC` as the primary sort key.
- If `flow_order` is equal (e.g. race condition or manual DB edit), it falls back to `created_at DESC`.
