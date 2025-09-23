# Neon + React 

A minimal React starter wired to Neon's Data API and Neon Auth. It shows how to configure the Data API client and make basic PostgREST queries.

## Prerequisites

- A Neon project with Data API enabled
- Authentication configured (Neon Auth)

## Getting started

1) Create your environment file and fill in values from your Neon project:

```bash
cp .env.example .env
```

Required variables:

- `VITE_NEON_DATA_API_URL` - Neon Data API base URL
- `VITE_STACK_PROJECT_ID` - Neon Auth project ID
- `VITE_STACK_PUBLISHABLE_CLIENT_KEY` - Neon Auth publishable client key

2) Apply the database schema (see `db/initial-migration.sql`).

> [!IMPORTANT]
> The Data API caches your database schema. If you change the schema, go to your Neon project → Data API → "Refresh schema cache". _This may be the case when you install run this example for the first time._

3) Start the dev server:

```bash
bun run dev
```

## Data API client setup

This app uses `@supabase/postgrest-js` SDK pointed at Neon's Data API and attaches a bearer token from Neon Auth.

```ts
import { PostgrestClient } from "@supabase/postgrest-js";

const client = new PostgrestClient(import.meta.env.VITE_NEON_DATA_API_URL, {
  headers: { Authorization: `Bearer ${accessToken}` },
});

// Example query
const { data, error } = await client
  .from("todos")
  .select("id,title,created_at")
  .eq("completed", false)
  .order("created_at", { ascending: false })
  .limit(10);
```

In this template, the client is created in a hook that reads `VITE_NEON_DATA_API_URL` and the current user’s access token:

```ts
// src/hooks/postgrest.tsx (excerpt)
import { PostgrestClient } from "@supabase/postgrest-js";

export function usePostgrest(): PostgrestClient {
  const postgrestUrl = import.meta.env.VITE_NEON_DATA_API_URL as string;
  const accessToken = /* retrieved from the signed-in session */ "...";
  return new PostgrestClient(postgrestUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
```

## Database schema & RLS

This template includes a simple table and Row Level Security (RLS) policies:

```sql
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
```

- `shared_counter` stores one row per increment with the `user_id` who added it and a timestamp.
- RLS is enabled on the table. Policies determine which rows each request can see or change.
- Insert policy: only authenticated users can insert, and only if `user_id` equals the caller’s `auth.user_id()`.
- Select policy: any authenticated user can read rows.
- Delete policy: only the owner (`auth.user_id() = user_id`) can delete.
- Grants: the `authenticated` role has full table privileges; `anonymous` can only select. RLS still applies on top of these grants.

RLS tips:

- Use `with check (condition)` to validate rows on insert/update.
- Use `using (condition)` to filter rows visible or deletable on select/delete.
- Handy helpers: `auth.user_id()` and `auth.session()` (e.g., to check roles/claims).

Example update policy (if you add updates later):

```sql
create policy "Users can update their own rows"
on shared_counter
for update
using (auth.user_id() = user_id)
with check (auth.user_id() = user_id);
```

## PostgREST basics

PostgREST exposes your database as RESTful endpoints. Below are concise examples of common queries using both raw HTTP and the JS client.

### Select rows

HTTP (curl):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$DATA_API_URL/todos?select=id,title,created_at&completed=is.false&order=created_at.desc&limit=10"
```

JS client:

```ts
const { data } = await client
  .from("todos")
  .select("id,title,created_at")
  .eq("completed", false)
  .order("created_at", { ascending: false })
  .limit(10);
```

### Filtering syntax

- `eq`, `neq`, `lt`, `gt`, `lte`, `gte`: `?priority=gte.3`
- `like`, `ilike`: `?title=ilike.*milk*`
- `in`: `?status=in.(open,closed)`
- `is` (null/true/false): `?completed=is.true`
- `or`: `?or=(status.eq.open,status.eq.pending)`

### Sorting and pagination

- Order: `?order=created_at.desc`
- Limit/offset: `?limit=20&offset=40`

### Insert, update, delete

HTTP (insert):

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"title":"Buy milk"}' \
  "$DATA_API_URL/todos"
```

JS client:

```ts
await client.from("todos").insert([{ title: "Buy milk" }]);
await client.from("todos").update({ completed: true }).eq("id", 1);
await client.from("todos").delete().eq("id", 1);
```

### Calling functions (RPC)

HTTP:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"arg1": 123}' \
  "$DATA_API_URL/rpc/my_function"
```

JS client:

```ts
const { data } = await client.rpc("my_function", { arg1: 123 });
```

---

For more, see [PostgREST](https://postgrest.org/en/stable/api.html) docs and [Neon Data API](https://neon.com/docs/data-api/get-started) docs.
