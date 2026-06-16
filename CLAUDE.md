@AGENTS.md

# Softdance — Plataforma SaaS de gestión para escuelas de danza

## Stack
- Next.js 16.2.9 (App Router, Turbopack) + React 19 + TypeScript 5
- Supabase (PostgreSQL + Auth + RLS + Storage)
- Tailwind CSS v4
- Wompi (pagos Colombia) — integrado: checkout + webhook
- Resend (emails) — integrado: bienvenida + reset + notificación mensualidad + recordatorio pago + confirmación de pago

## Ubicación
`/Users/jaimecriales/Sites/softdance`

## Repositorio y despliegue
- **GitHub**: https://github.com/jaimecriales8-prog/Softdance.git
- **Rama principal**: `main`
- **Producción**: https://softdance.grialtech.co (Vercel — auto-deploy en push a main; dominio anterior `softdance.vercel.app` sigue funcionando como fallback)
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
- `enviarBienvenida({ email, nombre, password, rol })` — al crear familia, profesor o admin_escuela. Ya NO incluye la contraseña en el correo (riesgo de seguridad); el admin la comparte directamente
- `enviarResetPassword({ email, nombre, resetUrl })` — desde `/api/auth/forgot-password`
- `enviarNuevaMensualidad({ email, nombreFamilia, periodo, total, fechaLimite, detalle })` — al generar mensualidad (cron día 1)
- `enviarRecordatorioPago({ email, nombreFamilia, periodo, total, fechaLimite })` — 3 días antes del vencimiento (cron diario)
- `enviarConfirmacionPago({ email, nombreFamilia, concepto, monto })` — al aprobarse un pago Wompi (mensualidad, matrícula o cuota de evento), enviado desde el webhook
- Remitente configurable con `EMAIL_FROM` — producción: `Softdance <noreply@ligacaribe.co>` (dominio verificado en Resend)
- Todos los datos de usuario interpolados en el HTML pasan por `esc()` (escape de HTML) para evitar XSS

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
- **Dashboard** — stats: grupos, familias, alumnas, profesores activos, clases programadas (horarios), eventos activos; campo `info_pago` para instrucciones manuales
- **Grupos** — CRUD grupos normales y élite; panel lateral con alumnas (agregar/quitar); botón Eliminar (borra horarios asociados; bloqueado si tiene alumnas/historial — usar Desactivar en ese caso)
- **Familias** — CRUD familias; buscador en tiempo real por nombre/correo; detalle con alumnas
  - Alumna: nombre, documento, fecha_nacimiento, notas
  - Asignar grupo normal o élite (independientes, no excluyentes)
  - Quitar grupo élite activo (cierra registro con fecha_fin=hoy)
  - Actividades extra (chips toggle)
  - Eventos: inscribir con conceptos individuales y valores ajustables; desinscribir
  - Historial de grupos: cronología de todos los grupos que tuvo la alumna
  - Congelar/descongelar alumna
  - Valor mensual calculado en tiempo real
  - Recibo de pago imprimible (`/escuela/familias/[id]/recibo`)
- **Horarios** — por grupo o actividad extra, agrupados por día. Toggle de vista "Lista / Disponibilidad": la vista Disponibilidad muestra una grilla por día (7am-8pm) con columnas por salón (`Salón A`, `Salón B`, `Sin asignar`) marcando huecos libres
- **Actividades extra** — CRUD, precio, tipo (mensual/único), toggle activa; botón Eliminar (borra horarios asociados; bloqueado si tiene alumnas asignadas — usar toggle Activa en ese caso)
- **Profesores** — CRUD; asignar a grupos y actividades (panel lateral con toggle por grupo/actividad); crear usuario portal (rol='profesor') → email bienvenida; botón Eliminar (borra usuario de auth si tiene, asignaciones y el registro)
- **Tarifas** — edición inline: matrícula anual, precio por grupo, precio por actividad
- **Eventos** — CRUD con conceptos (ítems de cobro); agregar alumnas con valores individuales por concepto; cuotas
- **Cobros** — tabs Por familia / Mensualidades / Eventos
  - Por familia (tab default) — agrupa mensualidad + matrícula + eventos por familia, ordenado por saldo pendiente; buscador en tiempo real; botón Exportar CSV (todos los cobros del período, cuota por cuota en eventos)
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
- **Mi estado de cuenta** — recibo imprimible: resumen pendiente/pagado de mensualidades, matrículas y eventos; botones Pagar (Wompi) e info de pago manual en cada item pendiente

### `/profesor` (profesor)
- Horario semanal de sus grupos y actividades asignadas
- Export ICS (webcal + descarga)

### `/forgot-password` y `/reset-password`
- Flujo completo de recuperación de contraseña vía Resend + Supabase recovery link

## Pagos Wompi
- Checkout URL: `https://checkout.wompi.co/p/?...` con hash SHA256 de integridad
- Referencias:
  - `MENS-{mensualidad_id}` → mensualidad
  - `MAT-{matricula_id}` → matrícula
  - `EVT-{evento_alumna_id}-{cuota_numero}` → cuota de evento (parseo con regex `/^EVT-([a-f0-9-]{36})-(\d+)$/` para evitar ambigüedad con guiones del UUID)
- Webhook en `/api/webhooks/wompi` verifica firma y actualiza el registro correspondiente
  - Si la escuela NO tiene `wompi_integrity_secret` configurado, la firma se considera **inválida** (antes pasaba sin validar — vulnerabilidad corregida)
  - Al aprobar el pago, envía `enviarConfirmacionPago` a la familia (fire-and-forget)
- Para EVT: marca la cuota como pagada; si todas las cuotas pagadas → estado='pagado'
- `cobro_activo=true` en escuela + `wompi_pub_key` configurada → botones Pagar visibles en portal padres (mensualidades, matrículas y eventos)
- `app/api/familia/pagar/route.ts` usa `createServiceClient()` únicamente para leer `config_pagos` (tabla sin acceso RLS para el rol padre); el resto de queries usan el cliente autenticado con scoping manual por `familia_id`

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
NEXT_PUBLIC_APP_URL          ← https://softdance.grialtech.co
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
- Dominio de Resend verificado para producción — ya no limitado a emails verificados manualmente
- Local `next build` puede fallar con Turbopack en CSS — usar `tsc --noEmit` para verificar tipos; Vercel usa webpack y compila bien
- Clases tipo "acrobacia" (Acrobaby, Acrodance, Acrobacia Nivel 1/2/3) se modelan como `actividades_extra`, no como `grupos` — no tienen edades fijas ni elegibilidad por grupo de edad
- Rate limiting en memoria (`Map` con TTL) en `/api/auth/forgot-password` — máx 3 intentos por IP cada 10 min; se resetea si la función serverless reinicia (aceptable para este volumen)
- Validación de `conceptos` (JSONB) en eventos: máx 50 items, cada uno con `{ nombre: string, valor: number >= 0 }` — items inválidos se filtran silenciosamente
- Dominio de producción migrado de `softdance.vercel.app` a `softdance.grialtech.co` (CNAME en GoDaddy → `cname.vercel-dns.com`)
