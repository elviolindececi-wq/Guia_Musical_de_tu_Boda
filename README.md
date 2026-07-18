# Tu Banda Sonora de Boda · El Violín de Ceci

Producto digital: `app.elviolindececi.com`

## Setup local

```bash
npm install
cp .env.example .env.local
# Editar .env.local con tus keys reales
npm run dev
```

## Deploy en Vercel

1. Subir este repo a GitHub
2. Conectar en vercel.com → New Project → importar repo
3. Vercel detecta Vite automáticamente
4. Agregar variables de entorno en Vercel → Settings → Environment Variables:
   - `ANTHROPIC_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

## Dominio

En Vercel → Settings → Domains → agregar `app.elviolindececi.com`

En el registrador del dominio, agregar CNAME:
- Nombre: `app`
- Valor: `cname.vercel-dns.com`

## Variables de entorno necesarias

| Variable | Dónde obtenerla |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `VITE_SUPABASE_URL` | supabase.com → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | supabase.com → Settings → API |

## Antes del lanzamiento

Editar estas líneas en `src/App.jsx`:

```js
// Línea ~890: reemplazar con el link real de Hotmart
const HOTMART_URL = "https://pay.hotmart.com/XXXXXXXXX";

// Línea ~893: reemplazar con el embed de YouTube del video de Ceci
const VIDEO_URL = "https://www.youtube.com/embed/ID_DEL_VIDEO";

// Línea ~60 (en la función callAI): ya apunta a /api/generate ✓
```

## Base de datos Supabase

Ejecutar en Supabase → SQL Editor:

```sql
create table if not exists public.sesiones (
  id           uuid default gen_random_uuid() primary key,
  email        text not null unique,
  nombre1      text,
  nombre2      text,
  fecha_boda   text,
  ciudad       text,
  form         jsonb not null default '{}',
  results      jsonb not null default '{}',
  arquetipo    text,
  checked      jsonb not null default '{}',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists sesiones_email_idx on public.sesiones (email);

alter table public.sesiones enable row level security;
create policy "acceso_publico" on public.sesiones using (true) with check (true);
```

## Stack

- React 18 + Vite
- Vercel (deploy + serverless functions)
- Anthropic Claude API (generación del guion)
- Supabase (persistencia por email)

---

## Versión de prueba + desbloqueo por Hotmart

Esta versión agrega tres niveles de acceso:

1. **Visitante / modo prueba:** puede usar Diseño de salón, Presupuesto, Proveedores, Checklist, Invitados, Cronograma y Guía con datos temporales que viven solo durante esa sesión.
2. **Comprador nuevo:** deja nombre, email y celular internacional, pasa al checkout de Hotmart y obtiene acceso cuando Hotmart confirma la compra.
3. **Usuario anterior:** conserva acceso completo sin volver a comprar ni repetir pasos.

### 1. Ejecutar la migración de Supabase

Abrir **Supabase → SQL Editor** y ejecutar completo:

```text
supabase/hotmart_access.sql
```

La última parte del script crea un permiso `legacy` para cada usuario que ya existe en `auth.users`. Este paso es el que evita bloquear a los usuarios actuales.

### 2. Variables nuevas en Vercel

En **Vercel → Project → Settings → Environment Variables**, agregar:

| Variable | Uso |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Permite que las funciones seguras creen leads y permisos. Nunca debe llevar prefijo `VITE_`. |
| `HOTMART_HOTTOK` | Token secreto con el que se validan los webhooks de Hotmart. |
| `HOTMART_CHECKOUT_URL` | Checkout del producto. Ya está configurado el link actual como fallback. |
| `HOTMART_PRODUCT_CODE` | `W106077396L` |
| `HOTMART_PRODUCT_ID` | ID numérico del producto que llega en el webhook. Recomendado. |
| `HOTMART_PRODUCT_UCODE` | Ucode del producto que llega en el webhook. Recomendado. |

Después de agregar las variables, hacer un nuevo deploy.

### 3. Configurar el Webhook en Hotmart

En Hotmart ir a **Herramientas → Webhook (API y notificaciones)** y crear una configuración para este producto.

URL de producción:

```text
https://TU-DOMINIO/api/hotmart-webhook
```

Usar la versión **2.0.0** y seleccionar al menos:

- Compra aprobada
- Compra completada
- Compra reembolsada
- Contracargo
- Compra cancelada

Copiar el Hottok de Hotmart en `HOTMART_HOTTOK`. Enviar un evento de prueba y copiar del payload `data.product.id` y `data.product.ucode` a las variables correspondientes.

### 4. Página posterior a la compra

En Hotmart conviene configurar la página de agradecimiento externa con la URL de la app. El comprador debe crear o iniciar sesión usando **exactamente el mismo email del checkout**. Al entrar, `/api/access` encuentra la compra y vincula el permiso con su usuario de Supabase.

### Flujo implementado

```text
Probar gratis
  → recorrer y editar todos los módulos de planificación
  → cambios temporales en memoria, sin Supabase ni persistencia local
  → al guardar, publicar, exportar, descargar o imprimir aparece el desbloqueo
  → nombre + email + celular internacional
  → checkout Hotmart con email precargado
  → webhook PURCHASE_APPROVED / PURCHASE_COMPLETE
  → permiso activo en Supabase
  → crear cuenta o iniciar sesión con el mismo email
  → guardado permanente y acceso desde cualquier dispositivo
```

Si el comprador vuelve desde el mismo navegador, el sistema recupera las respuestas del test para que no tenga que completarlo de nuevo. Los datos creados dentro de Presupuesto, Proveedores, Invitados, Salón, Checklist y Cronograma durante la prueba no se conservan: sirven únicamente para experimentar el producto antes de comprar.

### Archivos principales agregados

- `api/leads.js`: guarda el lead y arma el checkout precargado.
- `api/hotmart-webhook.js`: valida el Hottok y activa/revoca el acceso.
- `api/access.js`: verifica el permiso del usuario autenticado.
- `supabase/hotmart_access.sql`: tablas, seguridad y migración de usuarios existentes.

## Seguridad del modo prueba

La versión de prueba permite saborear el producto sin reemplazar la compra:

- abre Presupuesto, Proveedores, Checklist, Invitados, Diseño del salón, Cronograma y Guía completa;
- permite crear y modificar información dentro de esos módulos durante la sesión;
- usa una memoria temporal interna: no escribe esos datos en Supabase ni en `localStorage`;
- al recargar, salir o cerrar la prueba, los cambios de esos módulos desaparecen;
- al tocar Guardar o Publicar, deja el cambio visible solo en la sesión y abre el formulario de compra;
- Exportar, Descargar, Imprimir, Importar, Compartir y PDF se bloquean y abren el formulario de compra;
- el resultado musical personalizado y la generación con IA siguen bloqueados hasta que exista una compra validada;
- `/api/generate` exige una sesión válida y un permiso `active` o `legacy`, por lo que no puede utilizarse llamando directamente al endpoint sin compra.

Los usuarios existentes siguen habilitados por el permiso `legacy` creado en `supabase/hotmart_access.sql`.
