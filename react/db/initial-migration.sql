create table if not exists shared_counter (
    id bigint primary key generated always as identity,
    user_id text not null,
    added_at timestamp with time zone not null default now()
);

alter table shared_counter enable row level security;

--- allow users to insert their own rows
create policy "Users can insert with their own user_id"
on shared_counter
for insert
with check (auth.session()->>'role' = 'authenticated' and auth.user_id() = user_id);

--- allow users to select all rows
create policy "Users can select all rows"
on shared_counter
for select
using (auth.session()->>'role' = 'authenticated');

--- allow users to delete their own rows
create policy "Users can update their own rows"
on shared_counter
for delete
using (auth.session()->>'role' = 'authenticated' and auth.user_id() = user_id);

grant select, update, insert, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anonymous;
