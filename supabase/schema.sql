create table if not exists public.customers (
  id bigint generated always as identity primary key,
  document_number text not null unique,
  cedula text not null unique,
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
  payment_method text,
  admin_notes text,
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
  customer_document text not null,
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
  payment_method text,
  admin_notes text,
  created_at timestamptz not null default now()
);

alter table public.customers add column if not exists document_number text;
alter table public.customers add column if not exists cedula text;
update public.customers
set document_number = cedula
where cedula is not null
  and btrim(cedula) <> ''
  and (document_number is null or btrim(document_number) = '' or document_number like 'sin-cedula-%');
update public.customers
set cedula = document_number
where document_number is not null
  and btrim(document_number) <> ''
  and (cedula is null or btrim(cedula) = '');
update public.customers
set document_number = 'sin-cedula-' || id
where document_number is null or btrim(document_number) = '';
update public.customers
set cedula = document_number
where cedula is null or btrim(cedula) = '';
alter table public.customers alter column document_number set not null;
alter table public.customers alter column cedula set not null;
create unique index if not exists customers_document_number_key on public.customers(document_number);
create unique index if not exists customers_cedula_key on public.customers(cedula);

alter table public.ventas add column if not exists customer_document text;
update public.ventas
set customer_document = customers.document_number
from public.customers
where public.ventas.customer_id = customers.id
  and (public.ventas.customer_document is null or btrim(public.ventas.customer_document) = '');
alter table public.ventas alter column customer_document set not null;

alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists admin_notes text;
alter table public.orders add column if not exists responsable text;
alter table public.ventas add column if not exists payment_method text;
alter table public.ventas add column if not exists admin_notes text;
alter table public.ventas add column if not exists responsable text;

alter table public.orders alter column delivery_date drop not null;

create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_payment_method_idx on public.orders(payment_method);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_dessert_id_idx on public.order_items(dessert_id);
create index if not exists ventas_order_id_idx on public.ventas(order_id);
create index if not exists ventas_customer_id_idx on public.ventas(customer_id);
create index if not exists ventas_customer_document_idx on public.ventas(customer_document);
create index if not exists ventas_dessert_id_idx on public.ventas(dessert_id);
create index if not exists ventas_created_at_idx on public.ventas(created_at desc);
create index if not exists ventas_status_idx on public.ventas(status);
create index if not exists ventas_payment_method_idx on public.ventas(payment_method);

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
  ),
  (
    'Chocolate',
    'Nuestro nuevo sabor: chocolate intenso y cremoso que se funde en cada cucharada. Profundo, sedoso y adictivo para los verdaderos chocolovers.',
    10000,
    '/images/chocolate.jpg',
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
  customer_document,
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
  payment_method,
  admin_notes,
  created_at
)
select
  orders.id,
  order_items.id,
  customers.id,
  customers.document_number,
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
  orders.payment_method,
  orders.admin_notes,
  orders.created_at
from public.order_items
join public.orders on orders.id = order_items.order_id
join public.customers on customers.id = orders.customer_id
on conflict (order_item_id) do update set
  customer_name = excluded.customer_name,
  customer_document = excluded.customer_document,
  customer_email = excluded.customer_email,
  customer_phone = excluded.customer_phone,
  dessert_name = excluded.dessert_name,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  subtotal = excluded.subtotal,
  delivery_address = excluded.delivery_address,
  observations = excluded.observations,
  status = excluded.status,
  payment_method = excluded.payment_method,
  admin_notes = excluded.admin_notes;

drop view if exists public.ventas_resumen;

create view public.ventas_resumen as
with base as (
  select
    regexp_replace(customers.document_number, '[^0-9]', '', 'g') as cedula,
    orders.id as order_id,
    orders.customer_id,
    orders.total_amount,
    orders.created_at,
    orders.delivery_address,
    orders.observations,
    orders.status,
    orders.payment_method,
    orders.admin_notes
  from public.orders
  join public.customers on customers.id = orders.customer_id
),
items_cedula as (
  select
    regexp_replace(customers.document_number, '[^0-9]', '', 'g') as cedula,
    order_items.dessert_name,
    sum(order_items.quantity) as cantidad
  from public.orders
  join public.customers on customers.id = orders.customer_id
  join public.order_items on order_items.order_id = orders.id
  group by 1, order_items.dessert_name
),
resumen_items as (
  select
    cedula,
    string_agg(
      dessert_name || ': ' || cantidad ||
        case when cantidad = 1 then ' unidad' else ' unidades' end,
      ', '
      order by dessert_name
    ) as postres,
    sum(cantidad) as total_unidades
  from items_cedula
  group by cedula
),
resumen_pedidos as (
  select
    cedula,
    count(*) as total_pedidos,
    sum(total_amount) as total_pedido,
    max(created_at) as fecha_pedido
  from base
  group by cedula
),
ultimo_pedido as (
  select distinct on (cedula)
    cedula,
    customer_id,
    delivery_address,
    observations,
    status,
    payment_method,
    admin_notes
  from base
  order by cedula, created_at desc
)
select
  ultimo_pedido.customer_id,
  resumen_items.cedula,
  customers.full_name as cliente,
  customers.phone as telefono,
  customers.email as correo,
  resumen_items.postres,
  resumen_items.total_unidades,
  resumen_pedidos.total_pedidos,
  resumen_pedidos.total_pedido,
  ultimo_pedido.payment_method as metodo_pago,
  ultimo_pedido.delivery_address as direccion_entrega,
  ultimo_pedido.observations as observaciones,
  ultimo_pedido.admin_notes as notas_admin,
  ultimo_pedido.status as estado,
  resumen_pedidos.fecha_pedido
from resumen_items
join resumen_pedidos on resumen_pedidos.cedula = resumen_items.cedula
join ultimo_pedido on ultimo_pedido.cedula = resumen_items.cedula
join public.customers on customers.id = ultimo_pedido.customer_id
order by resumen_pedidos.fecha_pedido desc;

drop view if exists public.ventas_por_pedido;

create view public.ventas_por_pedido as
select
  orders.id as order_id,
  customers.document_number as cedula,
  customers.full_name as cliente,
  customers.phone as telefono,
  customers.email as correo,
  string_agg(
    order_items.dessert_name || ': ' || order_items.quantity ||
      case when order_items.quantity = 1 then ' unidad' else ' unidades' end,
    ', '
    order by order_items.dessert_name
  ) as postres,
  sum(order_items.quantity) as total_unidades,
  orders.total_amount as total_pedido,
  orders.payment_method as metodo_pago,
  orders.delivery_address as direccion_entrega,
  orders.observations as observaciones,
  orders.admin_notes as notas_admin,
  orders.status as estado,
  orders.created_at as fecha_pedido
from public.orders
join public.customers on customers.id = orders.customer_id
join public.order_items on order_items.order_id = orders.id
group by
  orders.id,
  customers.document_number,
  customers.full_name,
  customers.phone,
  customers.email,
  orders.total_amount,
  orders.payment_method,
  orders.delivery_address,
  orders.observations,
  orders.admin_notes,
  orders.status,
  orders.created_at
order by orders.created_at desc;
