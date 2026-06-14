@AGENTS.md

# Softdance — Plataforma SaaS de gestión para escuelas de danza

## Stack
- Next.js 16.2.9 (App Router, Turbopack) + React 19 + TypeScript 5
- Supabase (PostgreSQL + Auth + RLS + Storage)
- Tailwind CSS v4
- Wompi (pagos Colombia) — integrado: checkout + webhook
- Resend (emails) — integrado: bienvenida + reset + notificación mensualidad + recordatorio pago

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
        ├── profesor
        └── padre (familia)
              └── alumnas
```

## Roles del sistema
- `super_admin` → gestiona todas las escuelas, sin `escuela_id`
- `admin_escuela` → dueña/coordinadora de una escuela
- `profesor` → ve su horario en `/profesor`
- `padre` → ve solo sus hijas, horarios, pagos y comunicados

## Modelo de datos principal

```
escuelas
  ├── activa, cobro_activo, plan
  ├── valor_matricula
  ├── info_pago (texto libre para instrucciones de pago manual)
  └── meses_activos (integer[]) — meses habilitados para cobro mensual

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

eventos → competencias o eventos especiales
  ├── conceptos (jsonb) → [{ nombre, valor }] — ítems de cobro con valor por defecto
  └── num_cuotas — cuántas cuotas para pagar el evento

evento_alumna → participación de alumna en evento
  ├── total — suma de sus lineas
  ├── lineas (jsonb) → [{ concepto, valor }] — valores individuales por alumna
  ├── cuotas (jsonb) → [{ numero, estado }]
  └── estado: 'pendiente' | 'pagado'

matriculas → por familia, por año
  ├── valor, estado: 'pendiente' | 'pagado'
  └── unique(escuela_id, familia_id, anio)

comunicados → avisos por escuela
  ├── titulo, cuerpo
  └── grupo_id (null = todas las familias)

profesores → datos del profesor
  └── user_id → vincula con auth user (rol='profesor')

config_pagos → wompi_pub_key, wompi_priv_key, wompi_integrity_secret por escuela
pagos → transacciones Wompi completadas
```

## Tablas en BD (todas con RLS)
`escuelas`, `perfiles`, `familias`, `alumnas`, `grupos`, `alumna_grupo`,
`actividades_extra`, `alumna_actividad`, `horarios`, `mensualidades`, `pagos`,
`eventos`, `evento_alumna`, `matriculas`, `comunicados`, `profesores`,
`grupo_profesor`, `actividad_profesor`, `config_pagos`

## Helpers RLS
```sql
mi_escuela_id()   -- escuela_id del usuario actual
mi_rol()          -- rol del usuario actual
mi_familia_id()   -- familia_id del padre actual
mi_profesor_id()  -- profesor_id del usuario actual (desde profesores.user_id)
```

## Clientes Supabase
- `lib/supabase/client.ts` → browser (componentes cliente)
- `lib/supabase/server.ts` → server components y route handlers
- `lib/supabase/service.ts` → service role (bypasa RLS para admin y cron)

## Email — `lib/email.ts`
- `enviarBienvenida({ email, nombre, password, rol })` — al crear familia, profesor o admin_escuela
- `enviarResetPassword({ email, nombre, resetUrl })` — desde `/api/auth/forgot-password`
- `enviarNuevaMensualidad({ email, nombreFamilia, periodo, total, fechaLimite, detalle })` — al generar mensualidad (cron día 1)
- `enviarRecordatorioPago({ email, nombreFamilia, periodo, total, fechaLimite })` — 3 días antes del vencimiento (cron diario)
- Remitente configurable con `EMAIL_FROM` — producción: `Softdance <noreply@ligacaribe.co>`

## Auth routing
`app/dashboard/page.tsx` redirige según rol:
- `super_admin` → `/super-admin`
- `admin_escuela` → `/escuela`
- `profesor` → `/profesor`
- `padre` → `/familia`

Flujo recuperación de contraseña: `/forgot-password` → email con enlace → `/reset-password` (PKCE de Supabase)

## Rutas implementadas

### `/super-admin`
- Lista y gestión de escuelas (crear, editar, activar/desactivar)
- Toggle `cobro_activo` por escuela (habilita botón Wompi en portal padres)
- Configurar Wompi por escuela (pub_key, priv_key, integrity_secret en `config_pagos`)
- Crear `admin_escuela` → recibe email de bienvenida

### `/escuela` (admin_escuela)
- **Dashboard** — stats: grupos, familias, alumnas; campo `info_pago` para instrucciones manuales
- **Grupos** — CRUD grupos normales y élite; panel lateral con alumnas (agregar/quitar)
- **Familias** — CRUD familias; detalle con alumnas
  - Alumna: nombre, documento, fecha_nacimiento, notas
  - Asignar grupo normal o élite (independientes, no excluyentes)
  - Actividades extra (chips toggle)
  - Eventos: inscribir con conceptos individuales y valores ajustables; desinscribir
  - Historial de grupos: cronología de todos los grupos que tuvo la alumna
  - Congelar/descongelar alumna
  - Valor mensual calculado en tiempo real
  - Recibo de pago imprimible (`/escuela/familias/[id]/recibo`)
- **Horarios** — por grupo o actividad extra, agrupados por día
- **Actividades extra** — CRUD, precio, tipo (mensual/único), toggle activa
- **Profesores** — CRUD; asignar a grupos y actividades; crear usuario portal (rol='profesor') → email bienvenida
- **Tarifas** — edición inline: matrícula anual, precio por grupo, precio por actividad
- **Eventos** — CRUD con conceptos (ítems de cobro); agregar alumnas con valores individuales por concepto; cuotas
- **Cobros** — tabs Mensualidades / Eventos
  - Mensualidades: configurar meses activos, generar por período, marcar pagada, aplicar descuento, ver detalle
  - Eventos: estado de cuotas por alumna, marcar cuotas pagadas
- **Matrículas** — generar para todas las familias o individual; marcar pagada/pendiente
- **Comunicados** — crear/eliminar avisos; dirigir a grupo específico o todas las familias

### `/familia` (padre)
- **Inicio** — mensualidad del mes (con botón Wompi o info pago manual); matrícula pendiente del año; eventos pendientes de pago; alumnas activas
- **Horarios** — clases de los grupos de sus hijas + export ICS (webcal + descarga)
- **Mensualidades** — historial con desglose; matrículas del año
- **Eventos** — participación de sus alumnas, lineas de costo y estado de cuotas
- **Comunicados** — avisos globales + los del grupo de sus hijas
- **Mi estado de cuenta** — recibo imprimible: resumen pendiente/pagado de mensualidades y eventos

### `/profesor` (profesor)
- Horario semanal de sus grupos y actividades asignadas
- Export ICS (webcal + descarga)

### `/forgot-password` y `/reset-password`
- Flujo completo de recuperación de contraseña vía Resend + Supabase recovery link

## Pagos Wompi
- Checkout URL: `https://checkout.wompi.co/p/?...` con hash SHA256 de integridad
- Reference format: `MENS-{mensualidad_id}`
- Webhook en `/api/webhooks/wompi` verifica firma y marca mensualidad como 'pagado'
- `cobro_activo=true` en escuela + `wompi_pub_key` configurada → botón Pagar visible en portal padres

## Cron jobs
- `/api/cron/generar-mensualidades` — día 1 de cada mes a las 6am
  - Genera mensualidades para escuelas activas con el mes habilitado en `meses_activos`
  - No duplica si ya existe el período; excluye alumnas congeladas
  - Envía email `enviarNuevaMensualidad` a cada familia al generar
- `/api/cron/recordatorio-pago` — diario a las 9am
  - Busca mensualidades pendientes con `fecha_limite` = hoy + 3 días
  - Envía email `enviarRecordatorioPago` a cada familia afectada

## Variables de entorno
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL          ← https://softdance.vercel.app
CRON_SECRET                  ← autenticar cron de Vercel
RESEND_API_KEY               ← API key de Resend
EMAIL_FROM                   ← opcional, ej: Softdance <noreply@tudominio.com>
```

## Notas importantes
- Grupos élite NO son excluyentes: alumna puede tener grupo normal + élite simultáneamente
- `alumna_grupo` tiene unique constraint `(alumna_id, grupo_id, fecha_inicio)` — check-then-insert
- `alumna_actividad` tiene unique constraint `(alumna_id, actividad_id, fecha_inicio)` — upsert
- `alumnas.congelada = true` → excluida de mensualidades pero sigue en el sistema
- `evento_alumna.lineas` por alumna sobreescribe los `conceptos` del evento (valores individuales)
- Resend plan free solo envía a emails verificados; verificar dominio para producción real
- Local `next build` puede fallar con Turbopack en CSS — usar `tsc --noEmit` para verificar tipos; Vercel usa webpack y compila bien
