-- Birim Küp · Supabase şeması
-- Supabase > SQL Editor'e yapıştırıp bir kez çalıştırın. Tekrar çalıştırmak güvenlidir.

create table if not exists public.classes (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  class_id text not null references public.classes(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60)
);

create table if not exists public.results (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  class_id text not null references public.classes(id) on delete cascade,
  student_id text not null references public.students(id) on delete cascade,
  task_id text not null check (char_length(task_id) <= 40),
  skill text not null check (skill in ('yapi','dondurme','katman','gizli','gorunus','parca')),
  level smallint not null check (level between 1 and 3),
  outcome text not null check (outcome in ('d','y','x')),
  day text not null check (day ~ '^\d{4}-\d{2}-\d{2}$'),
  tries smallint not null default 0,
  secs integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists results_owner_idx on public.results(owner, class_id);

create table if not exists public.tasks (
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  def jsonb not null,
  primary key (owner, id)
);

create table if not exists public.works (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  grid jsonb not null,
  at timestamptz not null default now()
);

create table if not exists public.activities (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  class_id text not null references public.classes(id) on delete cascade,
  set jsonb not null,
  closed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Satır bazlı güvenlik: öğretmen yalnızca kendi satırlarını görür/değiştirir
do $$ declare t text; begin
  foreach t in array array['classes','students','results','tasks','works','activities'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_all on public.%I', t);
    execute format('create policy own_all on public.%I for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid())', t);
  end loop;
end $$;

-- Öğrenci (giriş yapmadan) yalnızca bu iki işlevi kullanır; tablolara doğrudan erişemez
create or replace function public.get_activity(p_code text)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'title', a.set->>'title', 'set', a.set,
    'students', coalesce((select jsonb_agg(s.name order by s.name) from students s where s.class_id = a.class_id), '[]'::jsonb))
  from activities a where a.code = upper(trim(p_code)) and not a.closed
$$;

create or replace function public.submit_activity(p_code text, p_name text, p_results jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare a activities; sid text; nm text := left(trim(p_name), 60); r jsonb; n int := 0;
begin
  select * into a from activities where code = upper(trim(p_code)) and not closed;
  if not found then raise exception 'Etkinlik bulunamadı veya kapalı'; end if;
  if nm = '' then raise exception 'Ad gerekli'; end if;
  if jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) > 30 then raise exception 'Geçersiz sonuç'; end if;
  select id into sid from students where class_id = a.class_id and lower(trim(name)) = lower(nm) limit 1;
  if sid is null then
    sid := 's_' || replace(gen_random_uuid()::text, '-', '');
    insert into students(id, owner, class_id, name) values (sid, a.owner, a.class_id, nm);
  end if;
  for r in select * from jsonb_array_elements(p_results) loop
    if r->>'outcome' in ('d','y','x') and r->>'skill' in ('yapi','dondurme','katman','gizli','gorunus','parca')
       and (r->>'day') ~ '^\d{4}-\d{2}-\d{2}$' and char_length(coalesce(r->>'taskId','')) between 1 and 40 then
      delete from results where student_id = sid and task_id = r->>'taskId' and day = r->>'day';
      insert into results(id, owner, class_id, student_id, task_id, skill, level, outcome, day, tries, secs)
      values ('r_' || replace(gen_random_uuid()::text, '-', ''), a.owner, a.class_id, sid, r->>'taskId', r->>'skill',
        least(3, greatest(1, coalesce((r->>'level')::int, 1))), r->>'outcome', r->>'day',
        least(99, greatest(0, coalesce((r->>'tries')::int, 0))), least(86400, greatest(0, coalesce((r->>'secs')::int, 0))));
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

revoke all on function public.get_activity(text), public.submit_activity(text, text, jsonb) from public;
grant execute on function public.get_activity(text), public.submit_activity(text, text, jsonb) to anon, authenticated;
