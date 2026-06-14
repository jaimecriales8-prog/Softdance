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
super_admin (Jaime)
  └── Escuela (tenant)
        ├── admin_escuela
        └── padre (familia)
              └── alumnas
```

## Roles del sistema
- `super_admin` → gestiona todas las escuelas, sin `escuela_id`
- `admin_escuela` → dueña/coordinadora de una escuela
- `padre` → ve solo sus hijas, horarios y pagos

## Modelo de datos principal

```
escuelas
  ├── activa, cobro_activo, plan
  ├── valor_matricula
  └── meses_activos (integer[]) — meses habilitados para cobro

familias → alumnas
  ├── activa, congelada (alumnas congeladas se excluyen del cobro)
  ├── documento (CC, TI)
  ├── alumna_grupo (historial de grupos — un registro por asignación)
  │     ├── activo=true → grupo actual
  │     └── activo=false, fecha_fin → historial
  └── alumna_actividad (actividades extra asignadas)

grupos
  ├── es_elite=false → grupo normal por edad (precio_mensual)
  └── es_elite=true  → grupo élite (NO excluyente — alumna puede tener ambos simultáneamente)

horarios → por grupo o actividad_extra (dia, hora_inicio, hora_fin, salon, profesora)

actividades_extra
  ├── es_recurrente=true  → suma al cobro mensual
  └── es_recurrente=false → pago único

mensualidades → por familia, por período "YYYY-MM"
  ├── subtotal, descuento, total
  ├── estado: 'pendiente' | 'pagado'
  ├── fecha_limite
  └── detalle (jsonb) → [{ alumna, lineas: [{ concepto, valor }] }]

pagos → transacciones Wompi (pendiente)
comunicados → (pendiente)
config_pagos → wompi_pub_key, wompi_priv_key por escuela
```

## Tablas en BD (todas con RLS)
`escuelas`, `perfiles`, `familias`, `alumnas`, `grupos`, `alumna_grupo`,
`actividades_extra`, `alumna_actividad`, `horarios`, `mensualidades`, `pagos`,
`comunicados`, `config_pagos`

## Helpers RLS
```sql
mi_escuela_id()  -- escuela_id del usuario actual
mi_rol()         -- rol del usuario actual
mi_familia_id()  -- familia_id del padre actual
```

## Clientes Supabase
- `lib/supabase/client.ts` → browser (componentes cliente)
- `lib/supabase/server.ts` → server components y route handlers
- `lib/supabase/service.ts` → service role (bypasa RLS para cron y operaciones admin)

## Auth routing
`app/dashboard/page.tsx` redirige según rol:
- `super_admin` → `/super-admin`
- `admin_escuela` → `/escuela`
- `padre` → `/familia`

No hay `proxy.ts` ni `middleware.ts` activos.

## Rutas implementadas

### `/super-admin`
- Lista y gestión de escuelas (crear, editar, activar/desactivar, toggle cobro)
- Configurar Wompi por escuela (pub_key + priv_key en config_pagos)
- Crear admin_escuela desde el panel de detalle de escuela

### `/escuela` (admin_escuela)
- **Dashboard** — stats: grupos, familias, alumnas
- **Grupos** — CRUD grupos normales y élite, panel lateral con alumnas del grupo (agregar/quitar)
- **Familias** — CRUD familias, detalle con alumnas por familia
  - Alumna: nombre, documento, fecha_nacimiento, notas, grupo inicial
  - Cambiar grupo normal o élite (independientes, no excluyentes)
  - Actividades extra por alumna (chips toggle)
  - Congelar/descongelar alumna (excluye del cobro mensual)
  - Valor mensual calculado en tiempo real (grupos + actividades recurrentes)
- **Horarios** — por grupo o actividad extra, agrupados por día
- **Actividades extra** — CRUD, precio, tipo (mensual/único), toggle activa
- **Tarifas** — edición inline: matrícula anual, precio por grupo, precio por actividad
- **Mensualidades** — configurar meses activos, generar por período, marcar pagada, ver detalle

### `/familia` (padre)
- **Inicio** — alumnas activas con grupos/actividades, mensualidad del mes actual
- **Horarios** — clases de los grupos de sus hijas
- **Mensualidades** — historial con desglose por alumna

## Cron jobs
- `vercel.json` → `/api/cron/generar-mensualidades` corre el 1 de cada mes a las 6am
- Genera mensualidades solo para escuelas activas con el mes habilitado en `meses_activos`
- No duplica si ya existe el período
- Excluye alumnas congeladas

## Variables de entorno
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET              ← para autenticar el cron de Vercel
```

## Pendiente
- **Wompi** — integración de pagos, link de pago en portal padres, webhook
- **Comunicados** — avisos por grupo o globales
- **Matrícula** — cobro de matrícula anual (campo valor_matricula ya existe en escuelas)
- **Descuentos** — campo descuento ya existe en mensualidades, falta UI
- **Portal padres** — botón pagar (requiere Wompi)

## Notas importantes
- Grupos élite NO son excluyentes: alumna puede tener grupo normal + élite simultáneamente
- `alumna_grupo` tiene unique constraint `(alumna_id, grupo_id, fecha_inicio)` — usar check-then-insert
- `alumna_actividad` tiene unique constraint `(alumna_id, actividad_id, fecha_inicio)` — usar upsert
- `alumnas.congelada = true` → excluida de mensualidades pero sigue en el sistema
- El token de Supabase Management API está disponible para queries directas desde scripts Node
