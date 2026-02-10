-- Add flow_order column to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS flow_order INTEGER;

-- Backfill flow_order for existing records
-- We'll just use a simple sequential number based on created_at for now
WITH ordered_announcements AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
  FROM announcements
)
UPDATE announcements
SET flow_order = ordered_announcements.rn
FROM ordered_announcements
WHERE announcements.id = ordered_announcements.id;

-- Ensure RLS policies are in place (assuming valid policies exist for 'announcements' table generally)
-- Verify existing policies if needed:
-- SELECT * FROM pg_policies WHERE tablename = 'announcements';
