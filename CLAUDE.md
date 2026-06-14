@AGENTS.md

# Softdance — Plataforma SaaS de gestión para escuelas de danza

## Stack
- Next.js 16.2.9 (App Router, Turbopack) + React 19 + TypeScript 5
- Supabase (PostgreSQL + Auth + RLS + Storage)
- Tailwind CSS v4
- Wompi (pagos Colombia) — pendiente integración
- Resend (emails) — pendiente integración

## Ubicación
`/Users/jaimecriales/Sites/softdance`

## Repositorio y despliegue
- **GitHub**: https://github.com/jaimecriales8-prog/Softdance.git
- **Rama principal**: `main`
- **Producción**: https://softdance.vercel.app (Vercel — auto-deploy en push a main)
- **Proyecto Supabase**: `obettdqtoyqwxstuevun` — https://obettdqtoyqwxstuevun.supabase.co

## Arquitectura multi-tenant
Cada escuela es un tenant independiente. El `escuela_id` es la barrera de RLS entre tenants.

```
super_admin (Jaime — tú)
  └── Escuela (tenant)
        ├── admin_escuela
        └── padre (familia)
```

## Roles del sistema
- `super_admin` → tú, gestiona todas las escuelas, sin `escuela_id`
- `admin_escuela` → dueña/coordinadora de una escuela
- `padre` → ve solo sus hijas, horarios y pagos

## Modelo de datos principal

```
escuelas
  ├── activa (boolean) — tú la activas
  ├── cobro_activo (boolean) — toggle si les cobras o no
  └── plan: 'free' | 'pro'

familias → alumnas → alumna_grupo (grupo base)
                   → alumna_actividad (actividades extra)

grupos (es_elite=false → grupo normal por edad)
grupos (es_elite=true  → grupo élite)

horarios → por grupo (día, hora_inicio, hora_fin, salon, profesora)

mensualidades → por familia, por período "YYYY-MM"
  └── detalle (jsonb) → desglose por alumna

pagos → transacciones Wompi, linked a mensualidad
```

## Tablas en BD (todas con RLS)
`escuelas`, `perfiles`, `familias`, `alumnas`, `grupos`, `alumna_grupo`,
`actividades_extra`, `alumna_actividad`, `horarios`, `mensualidades`, `pagos`, `comunicados`

## Helpers RLS
```sql
mi_escuela_id()  -- escuela_id del usuario actual
mi_rol()         -- rol del usuario actual
mi_familia_id()  -- familia_id del padre actual
```

## Clientes Supabase
- `lib/supabase/client.ts` → browser (componentes cliente)
- `lib/supabase/server.ts` → server components y route handlers
- `lib/supabase/service.ts` → service role (bypasa RLS para operaciones admin)

## Proxy (auth routing)
`proxy.ts` en raíz — reemplaza middleware (deprecated en Next.js 16).
- Sin sesión → redirige a `/login`
- Con sesión en `/login` → redirige a `/dashboard`
- Rutas públicas: `/login`, `/registro`, `/auth`

## Flujo de desarrollo
1. Desarrollar en local: `cd ~/Sites/softdance && source ~/.nvm/nvm.sh && npm run dev`
2. Commit + push a `main` → Vercel auto-despliega

## Variables de entorno
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```
Están en `.env.local` (local) y en Vercel Production.

## Módulos planificados

### Panel super_admin
- Gestión de escuelas (crear, activar/desactivar, toggle cobro)
- Ver todas las escuelas y sus estados

### Panel admin_escuela
- Estudiantes: CRUD alumnas, asignar familia
- Grupos: crear por edad, gestionar élite
- Actividades extra: crear, asignar por alumna
- Horarios: días/horas por grupo
- Mensualidades: generar cobros, ver estado pagos
- Comunicados: avisos por grupo o globales

### Portal padre
- Ver hijas, grupos y actividades
- Horario semanal de cada hija
- Mensualidad del mes con desglose y botón pagar (Wompi)
- Comunicados de la escuela

## Convención de rutas planificada
```
/dashboard              → redirige según rol
/super-admin/...        → gestión de escuelas
/escuela/...            → panel admin_escuela
/familia/...            → portal padres
```

## Notas importantes
- `proxy.ts` exporta función `proxy` (no `middleware`) — cambio de Next.js 16
- `super_admin` tiene `escuela_id = NULL` en perfiles
- El cobro a escuelas es opcional por toggle — no todas pagan
- Wompi y Resend pendientes de integrar
