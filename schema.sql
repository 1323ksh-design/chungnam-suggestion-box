-- 충남반도체마이스터고 건의함 데이터베이스 초기 설정
-- Supabase Dashboard > SQL Editor 에서 전체 실행하세요.
-- 실제 운영 전 학교 담당자와 개인정보/게시 범위를 검토하세요.

create extension if not exists pgcrypto;

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('급식','기숙사','학교 시설','수업·학습','학교생활','학생 편의','기타')),
  title text not null check (char_length(title) between 2 and 100),
  content text not null check (char_length(content) between 5 and 3000),
  author_label text not null default '익명' check (char_length(author_label) between 1 and 30),
  status text not null default '접수 완료' check (status in ('접수 완료','검토 중','답변 완료','반영 완료')),
  reply text not null default '',
  likes integer not null default 0 check (likes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('admin','staff'))
);

create table if not exists public.suggestion_votes (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  voter_id uuid not null,
  created_at timestamptz not null default now(),
  unique (suggestion_id, voter_id)
);

alter table public.suggestions enable row level security;
alter table public.user_roles enable row level security;
alter table public.suggestion_votes enable row level security;

create or replace function public.is_suggestion_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

-- 누구나 건의 목록과 답변을 읽을 수 있는 공개 게시판
drop policy if exists "suggestions public read" on public.suggestions;
create policy "suggestions public read"
on public.suggestions for select to anon, authenticated
using (true);

-- 익명 학생은 건의를 새로 등록할 수 있지만 수정/삭제는 불가
drop policy if exists "anyone can submit suggestions" on public.suggestions;
create policy "anyone can submit suggestions"
on public.suggestions for insert to anon, authenticated
with check (
  status = '접수 완료' and reply = '' and likes = 0
);

drop policy if exists "admins can update suggestions" on public.suggestions;
create policy "admins can update suggestions"
on public.suggestions for update to authenticated
using (public.is_suggestion_admin())
with check (public.is_suggestion_admin());

drop policy if exists "admins can delete suggestions" on public.suggestions;
create policy "admins can delete suggestions"
on public.suggestions for delete to authenticated
using (public.is_suggestion_admin());

-- 사용자는 본인 역할을 읽을 수 있으며 역할 변경은 SQL 관리자만 가능
drop policy if exists "users can read own role" on public.user_roles;
create policy "users can read own role"
on public.user_roles for select to authenticated
using (user_id = (select auth.uid()));

-- 투표 테이블은 클라이언트에서 직접 읽거나 쓰지 못하도록 잠금
-- 아래 RPC 함수만 투표 등록을 허용합니다.
create or replace function public.cast_suggestion_vote(p_suggestion_id uuid, p_voter_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_voter_id is null then
    raise exception 'voter id required';
  end if;
  insert into public.suggestion_votes (suggestion_id, voter_id)
  values (p_suggestion_id, p_voter_id)
  on conflict (suggestion_id, voter_id) do nothing;

  update public.suggestions s
  set likes = (
    select count(*)::integer
    from public.suggestion_votes v
    where v.suggestion_id = p_suggestion_id
  )
  where s.id = p_suggestion_id;
end;
$$;

revoke all on function public.cast_suggestion_vote(uuid, uuid) from public;
grant execute on function public.cast_suggestion_vote(uuid, uuid) to anon, authenticated;

grant select, insert on public.suggestions to anon, authenticated;
grant update, delete on public.suggestions to authenticated;
grant select on public.user_roles to authenticated;

-- 관리자를 등록하는 방법은 README의 4단계를 확인하세요.
