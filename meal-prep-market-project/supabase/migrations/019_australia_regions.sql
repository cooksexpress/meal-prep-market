-- supabase/migrations/019_australia_regions.sql
--
-- Cooks can join from anywhere in Australia: the allowed areas now cover
-- every state and territory (the list matches lib/cooks/regions.ts).
-- Existing values (Gold Coast, Brisbane, Other Queensland) stay valid.

alter table cm_cooks drop constraint if exists cm_cooks_region_check;
alter table cm_cooks add constraint cm_cooks_region_check check (
  region is null or region in (
    'Gold Coast', 'Brisbane', 'Sunshine Coast', 'Other Queensland',
    'Sydney', 'Central Coast', 'Newcastle', 'Wollongong', 'Other NSW',
    'Melbourne', 'Geelong', 'Other Victoria',
    'Perth', 'Other WA',
    'Adelaide', 'Other SA',
    'Hobart', 'Other Tasmania',
    'Canberra',
    'Darwin', 'Other NT'
  )
);
