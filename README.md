# Postres de Locos - Aplicacion web de pedidos

Aplicacion web profesional para vender postres caseros. Esta creada con Next.js, React, Tailwind CSS, Supabase y `xlsx`, lista para desplegar en Vercel y compartir con clientes mediante un enlace publico.

## Funcionalidades principales

- Pagina principal responsive, mobile first y enfocada en ventas.
- Catalogo con tarjetas de producto, imagenes, descripciones, precio unico de `$10.000 COP`, selector de cantidad y boton para agregar al pedido.
- Seccion "Quienes somos".
- Seccion "Descripcion de productos".
- Boton superior "Haz tu pedido" que lleva al formulario.
- Boton flotante de WhatsApp conectado a `https://wa.me/573114591424`.
- Formulario de pedido sin fecha de entrega, con nombre, cedula de ciudadania, telefono, correo, direccion y observaciones.
- Validaciones de campos obligatorios, correo, telefono, cantidades y pedidos vacios.
- Toast notifications, loaders, transiciones y feedback visual al enviar.
- Proteccion basica anti spam con honeypot y rate limiting en el endpoint de pedidos.
- Modal moderno de pedido exitoso.
- Guardado persistente de pedidos en Supabase.
- Panel `/admin` protegido con usuario y contrasena por variables de entorno.
- Dashboard admin con buscador, filtro por fecha, filtro por estado, total vendido hoy, pedidos del dia, ventas totales, producto mas vendido y graficas visuales.
- Exportacion de pedidos y resumen de ventas a Excel `.xlsx`.
- IDs numericos consecutivos en Supabase usando `bigint generated always as identity primary key`.

## Requisitos

- Node.js 18 o superior.
- Cuenta y proyecto en Supabase.
- Cuenta de Vercel para despliegue.

## Instalacion local

```bash
npm install
npm run dev
```

La aplicacion quedara disponible en:

```bash
http://localhost:3000
```

## Crear o recrear tablas en Supabase

1. Entra a tu proyecto de Supabase.
2. Ve a `SQL Editor`.
3. Si ya habias creado las tablas antes con IDs tipo UUID, primero borra las tablas antiguas ejecutando:

```sql
drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists customers cascade;
drop table if exists desserts cascade;
```

4. Copia el contenido de `supabase/schema.sql`.
5. Ejecuta el SQL completo.

Importante: este proyecto ahora usa IDs numericos consecutivos con:

```sql
id bigint generated always as identity primary key
```

Despues de borrar y recrear las tablas, los registros quedaran con IDs como `1`, `2`, `3`, `4` y asi sucesivamente.

El script crea estas tablas:

- `customers`
- `desserts`
- `orders`
- `order_items`
- `ventas`
- `ventas_resumen`

Tambien:

- Activa RLS.
- Crea policies basicas para insertar pedidos desde cliente.
- Permite leer datos administrativos solo desde endpoints seguros con `SUPABASE_SERVICE_ROLE_KEY`.
- Deja `delivery_date` como campo opcional porque el formulario ya no pide fecha de entrega.
- Inserta los productos iniciales sin escribir IDs manuales.
- Crea la tabla `ventas` para consultar rapidamente quien compro, que sabor pidio, cuantas unidades y cual es la direccion de entrega.
- Crea la vista `ventas_resumen` para ver una sola fila por pedido, por ejemplo: `Esteban | Oreo: 2 unidades, Maracuya: 1 unidad | direccion`.
- Usa la cedula de ciudadania como identificador unico del cliente en `customers.document_number`.
- Guarda la cedula y el nombre del cliente en `ventas` para que puedas reconocer facilmente quien compro.
- Agrega Leche Klim.
- Actualiza los productos activos a `$10.000 COP`.

Si tus tablas ya existen y solo quieres agregar `ventas` y la cedula de ciudadania, puedes ejecutar de nuevo el archivo `supabase/schema.sql` completo sin borrar las tablas. El script usa `create table if not exists`, agrega las columnas faltantes y tambien copia a `ventas` los pedidos que ya existan.

Nota: en `ventas` aparece una fila por cada sabor comprado. Si una persona pide tres sabores en el mismo pedido, veras tres filas con el mismo `order_id`, el mismo `customer_id`, la misma cedula y el mismo nombre. Eso significa que sigue siendo una sola orden, pero con varios productos.

Para ver los pedidos de forma mas facil, abre la vista `ventas_resumen` en Supabase. Ahi cada pedido aparece en una sola fila con la columna `postres`, por ejemplo: `Oreo: 2 unidades, Maracuya: 1 unidad`.

## Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Completa:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
ADMIN_USER=esteban
ADMIN_PASSWORD=gutierrez
```

Importante: `SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse en el navegador. En este proyecto solo se usa en rutas API del servidor.

## Usar el panel administrador

1. Ejecuta el proyecto.
2. Abre `/admin`.
3. Ingresa con los valores configurados en `ADMIN_USER` y `ADMIN_PASSWORD`.
4. Desde el panel puedes:
   - Buscar pedidos.
   - Filtrar por fecha.
   - Filtrar por estado.
   - Ver total vendido hoy.
   - Ver pedidos del dia.
   - Ver ventas totales.
   - Ver producto mas vendido.
   - Ver graficas de ventas.
   - Exportar pedidos a Excel.
   - Exportar resumen de ventas a Excel.

## Desplegar en Vercel

1. Sube el proyecto a GitHub.
2. En Vercel, crea un nuevo proyecto desde ese repositorio.
3. Agrega las variables de entorno en `Project Settings > Environment Variables`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_USER`
   - `ADMIN_PASSWORD`
4. Despliega.

## Compartir la web con clientes

Despues de desplegar en Vercel, recibiras una URL publica parecida a:

```text
https://postres-de-locos.vercel.app
```

Ese enlace lo puedes enviar por WhatsApp, Instagram, Facebook o mensaje directo. Tus clientes solo abren la pagina, eligen sabores, llenan sus datos y envian el pedido.

Antes de compartir el enlace, revisa:

- Que el SQL de `supabase/schema.sql` ya este ejecutado en Supabase.
- Que las variables de entorno esten configuradas en Vercel.
- Que puedas enviar un pedido de prueba.
- Que `/admin` permita iniciar sesion y ver ese pedido.
- Que la exportacion Excel funcione desde el panel.

## Agregar mas productos

Para agregar un producto nuevo:

1. Copia la imagen en `public/images`.
2. Inserta el producto en Supabase en la tabla `desserts` sin escribir manualmente el campo `id`.
3. Revisa el ID numerico que Supabase genero para ese producto.
4. Agrega el producto en `lib/desserts.ts` usando ese mismo ID numerico.

## Estructura principal

```text
app/
  api/
    orders/
    admin/
  admin/
components/
  Storefront.tsx
  admin/AdminDashboard.tsx
lib/
  admin-auth.ts
  desserts.ts
  supabase-admin.ts
  types.ts
public/images/
supabase/schema.sql
```

## Seguridad

- Los pedidos no se guardan en `localStorage`.
- Los pedidos se envian a `/api/orders` y se guardan en Supabase.
- `/api/orders` valida datos, usa honeypot y rate limiting basico.
- El panel admin lee pedidos desde `/api/admin/orders`.
- La lectura administrativa usa service role en servidor.
- El login admin usa cookie HTTP-only firmada desde servidor.
