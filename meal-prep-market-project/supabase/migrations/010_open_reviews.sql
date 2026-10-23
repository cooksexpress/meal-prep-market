-- supabase/migrations/010_open_reviews.sql
--
-- Open reviews, like Google: anyone can leave stars, a short comment
-- and their first name on a cook's listing. No email or proof needed.
-- Only the first name is shown. Light spam protection: at most 10
-- reviews per cook per hour, and one per name per cook per day.
-- A signed-in cook can't review themselves. Admins can still hide
-- reviews (existing cm_reviews_admin_update policy).

alter table cm_reviews alter column client_id drop not null;
alter table cm_reviews add column if not exists reviewer_name text;

alter table cm_reviews drop constraint if exists cm_reviews_reviewer_name_check;
alter table cm_reviews add constraint cm_reviews_reviewer_name_check
  check (reviewer_name is null or char_length(btrim(reviewer_name)) between 1 and 40);

alter table cm_reviews drop constraint if exists cm_reviews_review_text_length;
alter table cm_reviews add constraint cm_reviews_review_text_length
  check (review_text is null or char_length(review_text) <= 1000);

drop policy if exists cm_reviews_insert on cm_reviews;
drop policy if exists cm_reviews_public_insert on cm_reviews;
create policy cm_reviews_public_insert
  on cm_reviews for insert
  to anon, authenticated
  with check (
    client_id is null
    and inquiry_id is null
    and is_hidden = false
    and hidden_reason is null
    and reviewer_name is not null
    and (auth.uid() is null or auth.uid() <> cook_id)
    and exists (select 1 from cm_cooks c where c.id = cook_id and c.is_active)
  );

grant insert on cm_reviews to anon, authenticated;

create or replace function cm_review_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.reviewer_name := btrim(new.reviewer_name);
  new.review_text := nullif(btrim(coalesce(new.review_text, '')), '');

  if (select count(*) from cm_reviews r
       where r.cook_id = new.cook_id and r.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Lots of reviews are coming in right now. Please try again a bit later.'
      using errcode = 'P0001';
  end if;

  if new.reviewer_name is not null and exists (
       select 1 from cm_reviews r
        where r.cook_id = new.cook_id
          and lower(r.reviewer_name) = lower(new.reviewer_name)
          and r.created_at > now() - interval '1 day') then
    raise exception 'It looks like you''ve already reviewed this cook today. Thank you!'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists cm_review_guard on cm_reviews;
create trigger cm_review_guard
  before insert on cm_reviews
  for each row execute function cm_review_guard();
