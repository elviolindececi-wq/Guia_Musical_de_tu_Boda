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
