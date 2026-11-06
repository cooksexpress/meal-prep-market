-- supabase/migrations/018_review_replies.sql
--
-- Cooks can reply publicly to reviews on their page. The reply shows
-- under the review. Cooks change only their own reviews' reply, through
-- cm_reply_to_review (they can't edit the review itself). An empty
-- reply removes it. Up to 500 characters.

alter table cm_reviews add column if not exists cook_reply text;
alter table cm_reviews add column if not exists cook_replied_at timestamptz;

alter table cm_reviews drop constraint if exists cm_reviews_cook_reply_length;
alter table cm_reviews add constraint cm_reviews_cook_reply_length
  check (cook_reply is null or char_length(cook_reply) <= 500);

create or replace function cm_reply_to_review(p_review_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean text := nullif(btrim(coalesce(p_reply, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if clean is not null and char_length(clean) > 500 then
    raise exception 'Reply is too long';
  end if;
  update cm_reviews
     set cook_reply = clean,
         cook_replied_at = case when clean is null then null else now() end
   where id = p_review_id
     and cook_id = auth.uid();
  if not found then
    raise exception 'Review not found';
  end if;
end;
$$;

revoke all on function cm_reply_to_review(uuid, text) from public, anon;
grant execute on function cm_reply_to_review(uuid, text) to authenticated;
