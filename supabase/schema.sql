create table if not exists public.customers (
  id bigint generated always as identity primary key,
  full_name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.desserts (
  id bigint generated always as identity primary key,
  name text not null unique,
  description text not null,
  price numeric(12, 2) not null check (price >= 0),
  image_url text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id) on delete restrict,
  delivery_address text not null,
  delivery_date date,
  observations text,
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  status text not null default 'recibido',
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  dessert_id bigint not null references public.desserts(id) on delete restrict,
  dessert_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.ventas (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  order_item_id bigint not null unique references public.order_items(id) on delete cascade,
  customer_id bigint not null references public.customers(id) on delete restrict,
  dessert_id bigint not null references public.desserts(id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  dessert_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  delivery_address text not null,
  observations text,
  status text not null default 'recibido',
  created_at timestamptz not null default now()
);

alter table public.orders alter column delivery_date drop not null;

create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_dessert_id_idx on public.order_items(dessert_id);
create index if not exists ventas_order_id_idx on public.ventas(order_id);
create index if not exists ventas_customer_id_idx on public.ventas(customer_id);
create index if not exists ventas_dessert_id_idx on public.ventas(dessert_id);
create index if not exists ventas_created_at_idx on public.ventas(created_at desc);
create index if not exists ventas_status_idx on public.ventas(status);

alter table public.customers enable row level security;
alter table public.desserts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ventas enable row level security;

drop policy if exists "Public can read active desserts" on public.desserts;
create policy "Public can read active desserts"
on public.desserts
for select
to anon, authenticated
using (active = true);

drop policy if exists "Public can insert customers" on public.customers;
create policy "Public can insert customers"
on public.customers
for insert
to anon, authenticated
with check (true);

drop policy if exists "Public can insert orders" on public.orders;
create policy "Public can insert orders"
on public.orders
for insert
to anon, authenticated
with check (true);

drop policy if exists "Public can insert order items" on public.order_items;
create policy "Public can insert order items"
on public.order_items
for insert
to anon, authenticated
with check (true);

-- No public read policies are created for customers, orders or order_items.
-- No public read policies are created for ventas.
-- The admin panel reads data only through Next.js API routes that use SUPABASE_SERVICE_ROLE_KEY on the server.

insert into public.desserts (name, description, price, image_url, active)
values
  (
    'Arequipe',
    'Postre suave, dulce y cremoso, ideal para celebraciones o antojos especiales.',
    10000,
    '/images/publicidad.jpg',
    true
  ),
  (
    'Mora',
    'Postre fresco con salsa de mora artesanal y una textura cremosa irresistible.',
    10000,
    '/images/mora.jpg',
    true
  ),
  (
    'Maracuya',
    'Sabor tropical con pulpa de maracuya, dulce y ligeramente acido.',
    10000,
    '/images/maracuya.jpg',
    true
  ),
  (
    'Oreo',
    'Base cremosa con trozos de galleta Oreo para quienes aman el chocolate.',
    10000,
    '/images/oreo.jpg',
    true
  ),
  (
    'Limon',
    'Postre fresco y cremoso con ralladura de limon, perfecto para dias calidos.',
    10000,
    '/images/limon.jpg',
    true
  ),
  (
    'Leche Klim',
    'Postre cremoso con base crocante de galletas ducales, nuestra mezcla especial, leche klim y sabor equilibrado.',
    10000,
    '/images/leche-klim.png',
    true
  )
on conflict (name) do update set
  description = excluded.description,
  price = excluded.price,
  image_url = excluded.image_url,
  active = excluded.active;

insert into public.ventas (
  order_id,
  order_item_id,
  customer_id,
  dessert_id,
  customer_name,
  customer_email,
  customer_phone,
  dessert_name,
  quantity,
  unit_price,
  subtotal,
  delivery_address,
  observations,
  status,
  created_at
)
select
  orders.id,
  order_items.id,
  customers.id,
  order_items.dessert_id,
  customers.full_name,
  customers.email,
  customers.phone,
  order_items.dessert_name,
  order_items.quantity,
  order_items.unit_price,
  order_items.subtotal,
  orders.delivery_address,
  orders.observations,
  orders.status,
  orders.created_at
from public.order_items
join public.orders on orders.id = order_items.order_id
join public.customers on customers.id = orders.customer_id
on conflict (order_item_id) do update set
  customer_name = excluded.customer_name,
  customer_email = excluded.customer_email,
  customer_phone = excluded.customer_phone,
  dessert_name = excluded.dessert_name,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  subtotal = excluded.subtotal,
  delivery_address = excluded.delivery_address,
  observations = excluded.observations,
  status = excluded.status;
