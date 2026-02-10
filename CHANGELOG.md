# Changelog

## [Unreleased]

### Added
- **Flow Order:** Added "Akış Sırası" feature for Announcements.
    - Database: Added `flow_order` column to `announcements` table.
    - Admin: Created `/admin/flow` page to reorder announcements using Up/Down controls.
    - Admin: Added "Akış Sırası" link to the sidebar.
    - Player: Updated player logic to sort announcements by `flow_order` ascending.
- **Docs:** Added smoke test inventory in `docs/SMOKE_TEST_FLOW_ORDER.md`.

### Fixed
- Fixed TypeScript definitions for `Announcement` type to include `flow_order` and `created_at`.
