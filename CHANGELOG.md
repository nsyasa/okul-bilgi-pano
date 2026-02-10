# Changelog

## [Unreleased]

### Added
- **Flow Order:** Added "Akış Sırası" feature for announcements.
    - Database: Added `flow_order` column to `announcements` table.
    - Admin: Created `/admin/flow` page to reorder announcements using Up/Down controls.
    - Admin: Added "Akış Sırası" link to the sidebar.
    - Player: Updated player logic to sort announcements by `flow_order` ascending.
- **UI Improvements:**
    - Moved "Loop Settings" (Döngü Ayarları) from Announcements page to Flow page.
    - Added type icons (📢, 🖼️, 📝) to the Flow list.
    - Added duration indicators (e.g. "10sn") to Flow list items based on their type.
- **Docs:** Added smoke test inventory in `docs/SMOKE_TEST_FLOW_ORDER.md`.

### Fixed
- Fixed TypeScript definitions for `Announcement` type to include `flow_order` and `created_at`.
