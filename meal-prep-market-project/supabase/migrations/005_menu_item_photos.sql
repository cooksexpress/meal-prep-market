-- supabase/migrations/005_menu_item_photos.sql
-- Each menu item (dish or pack) can have its own optional photo.
alter table cm_packages add column if not exists image_url text;
