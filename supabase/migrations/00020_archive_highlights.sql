-- 보관함/하이라이트: 포스트를 프로필에 고정(하이라이트)하고, 만료 후에도 공개 열람 가능하게

-- 1) 하이라이트 플래그
alter table posts add column if not exists highlighted boolean not null default false;

-- 2) 본인 포스트 수정 허용 (하이라이트 지정/해제용 — 지금까지 update 정책이 없었음)
drop policy if exists "posts self update" on posts;
create policy "posts self update" on posts
  for update to authenticated using (author_id = auth.uid());

-- 3) 하이라이트된 포스트는 만료돼도 열람 가능 (공개범위·차단은 그대로 존중)
drop policy if exists "posts highlighted readable" on posts;
create policy "posts highlighted readable" on posts
  for select to authenticated using (
    highlighted
    and not exists (
      select 1 from blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = author_id)
         or (b.blocker_id = author_id and b.blocked_id = auth.uid())
    )
    and (
      visibility = 'public'
      or author_id = auth.uid()
      or (visibility = 'friends' and are_buddies(auth.uid(), author_id))
    )
  );
