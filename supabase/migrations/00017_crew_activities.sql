-- 크루 활동 연결: 포스트를 크루에 귀속 + 크루원 알림 + 크루 활동 피드

alter table posts add column if not exists crew_id uuid references crews (id) on delete set null;
create index if not exists posts_crew_idx on posts (crew_id, created_at desc);

-- 크루 활동(포스트) 등록 시 크루원(작성자 제외)에게 푸시
create or replace function on_crew_post_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare m uuid; crewname text; authorname text;
begin
  if new.crew_id is null then return new; end if;
  select name into crewname from crews where id = new.crew_id;
  select nickname into authorname from profiles where id = new.author_id;
  for m in
    select user_id from crew_members
     where crew_id = new.crew_id and status = 'accepted' and user_id <> new.author_id
  loop
    perform send_expo_push(
      m,
      coalesce(crewname, '크루') || ' 새 활동 ⛰️',
      coalesce(authorname, '크루원') || ': ' || left(new.body, 80)
    );
  end loop;
  return new;
end $$;

drop trigger if exists trg_crew_post_push on posts;
create trigger trg_crew_post_push after insert on posts
  for each row execute function on_crew_post_push();

-- 크루 활동 피드 (크루원만, 만료 무관하게 최근 50건 — 크루 활동 기록 보존)
create or replace function crew_posts(cid uuid)
returns table (
  id uuid, author_id uuid, nickname text, avatar_url text,
  body text, image_url text, tags text[], activity activity_type,
  place_name text, created_at timestamptz, check_in_id uuid
) language sql security definer set search_path = public stable as $$
  select p.id, p.author_id, pr.nickname, pr.avatar_url,
         p.body, p.image_url, p.tags, p.activity,
         p.place_name, p.created_at, p.check_in_id
    from posts p
    join profiles pr on pr.id = p.author_id
   where p.crew_id = cid
     and is_crew_member(cid, auth.uid())
   order by p.created_at desc
   limit 50;
$$;
