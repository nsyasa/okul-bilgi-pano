# Smoke Test: Unified Announcement Flow Order

## Pre-requisites
1.  Admin account logged in.
2.  At least 3-4 announcements (mixed types: big, small, image) created.
3.  At least 1-2 YouTube videos added in the system.
4.  Player page open in a separate tab/window (`/player`) or simulator.

## Test Steps

### 1. Database & Migration
- [ ] Check `youtube_videos` table in Supabase.
- [ ] Verify `flow_order` column exists.

### 2. Admin UI (`/admin/flow`) initial check
- [ ] Navigate to `/admin/flow` via the "Akış Sırası" link.
- [ ] Verify the page loads without errors.
- [ ] Verify you see a list under "Yayındaki İçerikler".
- [ ] Verify the list contains **BOTH** Announcements (📢/📝/🖼️) and Videos (🎥).

### 3. Unified Sorting
- [ ] Identify a Video and an Announcement in the active list.
- [ ] Use the "Up" / "Down" arrows to swap their positions.
- [ ] Verify the order updates immediately on UI.
- [ ] Refresh the page. Verify the new order persists.

### 4. Active/Passive Toggle
- [ ] Find an active item (in "Yayındaki İçerikler").
- [ ] Click the "Pasife Al" button.
- [ ] Verify the item moves down to the "Pasif / Bekleyenler" section.
- [ ] Verify the item styling changes (becomes dimmer).
- [ ] Find a passive item.
- [ ] Click "Yayına Al".
- [ ] Verify it moves back to the active list.

### 5. Loop Settings (Döngü Süreleri)
- [ ] Change the duration for "Video", "Resim", or "Duyuru".
- [ ] Click "Kaydet".
- [ ] Verify "Ayarlar kaydedildi" toast appears.
- [ ] Refresh page to confirm persistence.

### 6. Player Integration
- [ ] Open `/player` page.
- [ ] Observe the sequence of items.
- [ ] **Verify Order**: The player must show items in the EXACT order defined in Admin > "Yayındaki İçerikler".
- [ ] **Verify Video**:
    - When a video card appears, it should auto-play (muted).
    - When video ends, it should automatically move to the next item.
- [ ] **Verify Duration**:
    - Image/Text cards should stay on screen for the duration configured in Admin.

### 7. Legacy Cleanup
- [ ] Verify "Matematik Duyurusu" (legacy item) is NO LONGER in the list (if you deleted it).
- [ ] If it exists, click the Trash icon to delete it and verify it disappears.
