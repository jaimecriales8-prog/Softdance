# Manual de usuario — Administrador de escuela
**Softdance** · softdance.vercel.app

---

## Acceso

Ingresa en **softdance.vercel.app/login** con el correo y contraseña que te enviaron al crear tu cuenta. Si olvidaste tu contraseña, haz clic en *Olvidé mi contraseña* e ingresa tu correo; recibirás un enlace para restablecerla.

Al ingresar llegarás directamente al panel de tu escuela.

---

## Panel principal

La barra lateral izquierda tiene acceso a todos los módulos. En la parte inferior aparece tu nombre y el botón para cerrar sesión.

El **Dashboard** muestra un resumen: número de grupos, familias y alumnas activas, y el campo de instrucciones de pago manual (ver sección Cobros).

---

## Grupos

Los grupos son la unidad base de cobro mensual. Hay dos tipos:

- **Grupos normales** — por edad o nivel. Una alumna solo puede estar en uno a la vez.
- **Grupos élite** — para alumnas de competencia. No son excluyentes: una alumna puede tener grupo normal *y* grupo élite simultáneamente.

### Crear un grupo
1. Ve a **Grupos** en el menú.
2. Haz clic en **+ Nuevo grupo**.
3. Ingresa nombre, precio mensual y si es élite o no.

### Gestionar alumnas de un grupo
Haz clic en el nombre del grupo para abrir el panel lateral. Ahí puedes ver las alumnas asignadas y agregar nuevas buscando por nombre.

---

## Familias y alumnas

Cada alumna pertenece a una familia. La familia es quien recibe los cobros y tiene acceso al portal de padres.

### Crear una familia
1. Ve a **Familias → + Nueva familia**.
2. Ingresa nombre, correo y teléfono.
3. Puedes crear el usuario del portal (para que los padres puedan ingresar): marca la opción al crear o hazlo desde el detalle de la familia. El padre recibirá un correo con sus credenciales.

### Agregar una alumna
Dentro del detalle de la familia, haz clic en **+ Agregar alumna**. Puedes ingresar:
- Nombre completo
- Número de documento (CC, TI)
- Fecha de nacimiento
- Grupo inicial
- Notas internas

### Gestionar una alumna

Dentro de la tarjeta de cada alumna encontrarás estas acciones:

| Acción | Descripción |
|---|---|
| **Cambiar grupo** | Mueve a la alumna a otro grupo normal. El grupo anterior queda en el historial. |
| **⭐ Élite** | Asigna un grupo élite (adicional al grupo normal). |
| **Quitar élite** | Desvincula a la alumna del grupo élite activo. Queda en el historial. |
| **Actividades** | Abre el panel de actividades extra. Haz clic en cada actividad para asignarla o quitarla. |
| **Eventos** | Inscribe o desvincula a la alumna de eventos (ver sección Eventos). |
| **Historial** | Muestra todos los grupos por los que pasó la alumna con fechas de entrada y salida. |
| **Congelar** | Congela a la alumna: sigue en el sistema pero no se le genera mensualidad. Útil para ausencias temporales. |
| **Editar** | Edita nombre, documento, fecha de nacimiento y notas. |

---

## Horarios

Registra las clases de cada grupo o actividad extra.

1. Ve a **Horarios → + Nuevo horario**.
2. Selecciona si es para un grupo o una actividad extra.
3. Elige día, hora de inicio, hora de fin, salón y profesora.

Los horarios se muestran agrupados por día. Las familias también pueden verlos en su portal y exportarlos al calendario del celular.

---

## Actividades extra

Son cobros adicionales al grupo mensual. Pueden ser:

- **Recurrentes** — se suman al cobro mensual (ej. taller de técnica, clases particulares).
- **Pago único** — se cobran una sola vez (ej. material, uniforme).

Para asignar una actividad a una alumna, entra al detalle de la familia y usa el panel **Actividades** de la alumna.

---

## Profesores

### Crear un profesor
1. Ve a **Profesores → + Nuevo profesor**.
2. Ingresa nombre y datos de contacto.

### Asignar grupos y actividades
Desde el detalle del profesor puedes asignarlo a grupos y actividades extra. Eso determina qué horarios aparecen en su portal.

### Crear usuario portal
Haz clic en **Crear usuario** en el detalle del profesor. Ingresa su correo — recibirá un email con sus credenciales de acceso al portal `/profesor`.

---

## Tarifas

Desde **Tarifas** puedes editar en línea:
- Valor de la matrícula anual
- Precio mensual de cada grupo
- Precio de cada actividad extra

Los cambios aplican a partir del siguiente período generado; no modifican mensualidades ya creadas.

---

## Eventos

Los eventos son cobros especiales (competencias, presentaciones, viajes). Cada evento tiene:
- **Conceptos** — ítems de cobro con un valor por defecto (ej. inscripción, vestuario, transporte).
- **Cuotas** — el total se puede dividir en varias cuotas.

### Crear un evento
1. Ve a **Eventos → + Nuevo evento**.
2. Ingresa nombre, fecha y número de cuotas.
3. Agrega los conceptos con sus valores por defecto.

### Inscribir una alumna en un evento
Hay dos formas:

**Desde Eventos** (inscripción masiva por evento): abre el evento y agrega alumnas.

**Desde el perfil de la alumna** (recomendado para valores individualizados):
1. Ve a **Familias → [nombre de familia]**.
2. En la tarjeta de la alumna, haz clic en **Eventos**.
3. Verás los eventos disponibles. Haz clic en **+ Agregar**.
4. Se abre un modal con los conceptos del evento. Marca los que aplican a esta alumna y ajusta los valores si es necesario.
5. El total y las cuotas se calculan automáticamente. Haz clic en **Inscribir**.

Para desinscribir, haz clic en **✓ Inscrita · Quitar**.

---

## Cobros

### Mensualidades

Las mensualidades se generan **automáticamente el día 1 de cada mes** para las escuelas con ese mes habilitado. Las familias reciben un correo con el detalle al momento de generarse.

**Configurar meses activos:** en la pestaña Mensualidades de Cobros, selecciona los meses del año en que se cobra. Por ejemplo, si la escuela no cobra en diciembre, desmarca diciembre.

**Generar manualmente:** puedes generar mensualidades para un período específico desde el botón **Generar mensualidades**.

**Acciones por mensualidad:**
- **Marcar como pagada** — clic en el estado para cambiar entre Pendiente y Pagado.
- **Aplicar descuento** — abre un modal para ingresar el valor del descuento; el total se recalcula.
- **Ver detalle** — expande el desglose por alumna con los conceptos incluidos.

### Cobro de eventos

En la pestaña **Eventos** de Cobros puedes ver el estado de cuotas por alumna y marcar cuotas individualmente como pagadas.

### Recordatorio automático

3 días antes de la fecha límite de cada mensualidad, el sistema envía automáticamente un correo de recordatorio a la familia.

---

## Matrículas

Las matrículas son cobros anuales por familia.

1. Ve a **Matrículas**.
2. Puedes **Generar para todas** las familias del año actual de una vez, o crear matrículas individuales.
3. Cambia el estado entre Pendiente y Pagado con un clic.

El valor por defecto viene de **Tarifas → Matrícula anual**.

---

## Comunicados

Envía avisos a las familias que aparecen en su portal.

1. Ve a **Comunicados → + Nuevo comunicado**.
2. Escribe título y mensaje.
3. Elige destinatarios:
   - **Todas las familias** — deja el campo grupo vacío.
   - **Un grupo específico** — selecciona el grupo; solo lo verán las familias con alumnas en ese grupo.

Los comunicados se pueden eliminar pero no editar.

---

## Pagos en línea (Wompi)

Si tienes configurado Wompi (lo activa el administrador de Softdance), las familias verán botones de pago en su portal para:

- Mensualidades pendientes
- Matrículas pendientes
- Cuotas de eventos pendientes

Los pagos se procesan automáticamente: al confirmar el pago en Wompi, el sistema marca el cobro como pagado sin intervención manual.

### Instrucciones de pago manual

Si no tienes Wompi, puedes publicar instrucciones de transferencia o pago en efectivo:

1. Ve al **Dashboard**.
2. En el campo **Instrucciones de pago**, escribe los datos (número de cuenta, nequi, etc.).
3. Guarda. Las familias verán este texto en su portal junto a los cobros pendientes.

---

## Recibo de la familia

Desde **Familias → [nombre de familia]**, haz clic en **Ver recibo** (esquina superior derecha). Muestra un estado de cuenta completo de la familia con mensualidades y eventos, listo para imprimir o guardar como PDF.

---

## Portal de padres

Las familias acceden en **softdance.vercel.app/familia** con las credenciales que les enviaste. Desde su portal pueden:

- Ver la mensualidad del mes y pagar en línea (si está habilitado)
- Ver matrículas y eventos pendientes
- Consultar horarios y exportarlos al calendario
- Leer comunicados
- Ver su historial completo de pagos e imprimirlo

---

## Preguntas frecuentes

**¿Qué pasa si una alumna se congela a mitad de mes?**
La mensualidad de ese mes ya generada no se modifica. A partir del siguiente mes, la alumna congelada se excluye del cálculo automático.

**¿Puedo cambiar el precio de un grupo y que afecte el mes actual?**
No. El precio solo aplica a las mensualidades generadas después del cambio. Las mensualidades ya creadas mantienen sus valores originales.

**¿Una alumna puede estar en dos grupos normales?**
No. Solo puede estar en un grupo normal a la vez. Sí puede estar en un grupo normal *y* un grupo élite simultáneamente.

**¿Cómo sé si una familia ya pagó?**
En **Cobros → Mensualidades** verás el estado de cada familia. Las pagadas muestran ✓ Pagado en verde. También puedes ver el recibo completo desde el detalle de la familia.

**¿Los comunicados llegan por correo?**
Por ahora los comunicados solo aparecen en el portal de los padres. No se envían por correo.

---

*Soporte: hola@softdance.co*
