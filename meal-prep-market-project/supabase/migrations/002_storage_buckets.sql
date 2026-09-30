-- supabase/migrations/xxxxxxxx_storage_buckets.sql
--
-- Storage buckets for cook-uploaded images. Both are public-read
-- (profile photos and gallery images are meant to be seen by anyone
-- browsing the directory), but writes are restricted to the owning
-- cook via a path-based check: files must be uploaded under a folder
-- named after the cook's own auth.uid().
--
-- Expected upload path convention (enforced by these policies, not
-- just a frontend convention):
--   cook-profile-photos/{cook_id}/avatar.jpg
--   cook-gallery/{cook_id}/{uuid}.jpg

insert into storage.buckets (id, name, public)
values ('cook-profile-photos', 'cook-profile-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('cook-gallery', 'cook-gallery', true)
on conflict (id) do nothing;

-- --- cook-profile-photos ------------------------------------------
create policy cm_storage_profile_photos_public_read
  on storage.objects for select
  using (bucket_id = 'cook-profile-photos');

create policy cm_storage_profile_photos_owner_insert
  on storage.objects for insert
  with check (
    bucket_id = 'cook-profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy cm_storage_profile_photos_owner_update
  on storage.objects for update
  using (
    bucket_id = 'cook-profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy cm_storage_profile_photos_owner_delete
  on storage.objects for delete
  using (
    bucket_id = 'cook-profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- --- cook-gallery ---------------------------------------------------
create policy cm_storage_gallery_public_read
  on storage.objects for select
  using (bucket_id = 'cook-gallery');

create policy cm_storage_gallery_owner_insert
  on storage.objects for insert
  with check (
    bucket_id = 'cook-gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy cm_storage_gallery_owner_delete
  on storage.objects for delete
  using (
    bucket_id = 'cook-gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
