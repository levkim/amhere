-- 포스트 사진 저장 공간 (post-images 버킷)
-- 규칙: 로그인 사용자는 자기 폴더({자기 uid}/...)에만 업로드, 읽기는 공개(피드에 표시)

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "post images owner upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post images owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post images public read" on storage.objects
  for select to public
  using (bucket_id = 'post-images');
