-- 프로필 고도화: SNS 링크 저장칸 + 프로필 사진 저장소
-- avatar_url 칼럼은 00001에서 이미 존재한다.

-- 1) SNS 링크 (instagram / facebook / threads / tiktok 핸들 또는 URL)
alter table profiles add column if not exists sns jsonb not null default '{}';

-- 2) 프로필 사진 저장소 (post-images와 같은 패턴)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars owner upload" on storage.objects;
create policy "avatars owner upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');
