# Estetic Cars — Gestión de Calidad

Aplicación en desarrollo para gestionar reclamos, garantías y reprocesos internos en Escazú y Heredia, desde computadora y celular, con múltiples usuarios y almacenamiento compartido.

> Estado: especificación inicial. Todavía no hay una aplicación implementada ni desplegada desde este repositorio. No usar para registrar datos reales.

## Usuarios y permisos

Cuentas individuales; varias personas pueden pertenecer a cada perfil. Los permisos deben comprobarse en servidor.

- **SAC:** registra reclamos, sus puntos y evidencias; establece la fecha real del reclamo y registra comunicaciones.
- **Jefe de Control de Calidad:** evalúa cada punto, gestiona correcciones y reprocesos, verifica resultados y solicita cierre o reapertura.
- **Jefe de Operaciones:** autoriza o rechaza cierres y reaperturas. No existe un cuarto perfil de jefe de taller.

Cada caso tiene encargado de seguimiento y cada cambio conserva autor, fecha y acción. Las ediciones simultáneas deben detectar conflictos y no sobrescribir cambios ajenos silenciosamente.

## Registro y aceptación parcial

Datos: OT digitada, sede, placa, modalidad seguro/particular, descripción y fecha del reclamo. Aseguradora obligatoria para seguros; nombre del cliente opcional para particulares. La fecha y hora de ingreso al sistema son automáticas.

El cliente ingresa un **reclamo**, no una garantía previamente aceptada. Cada reclamo puede contener múltiples puntos con descripción, clasificación y evidencia. Cada punto recibe una decisión justificada: pendiente, aceptado o no aceptado.

El resultado general se calcula:

- Pendiente de evaluación si queda algún punto pendiente.
- Aceptado totalmente si todos los puntos se aceptan.
- Aceptado parcialmente si hay puntos aceptados y no aceptados.
- No aceptado si todos los puntos se rechazan.

Ejemplo: diez puntos reportados, cinco aceptados y cinco rechazados equivalen a un reclamo y una garantía parcial, no diez reclamos. Los puntos rechazados permanecen en el expediente.

La OT identifica el trabajo; cada caso tiene un identificador independiente. Se permiten varios eventos vinculados a una OT.

## Clasificación

**Reprocesos internos:** Mecánica, Desarmado, Enderezado, Alistado, Forrado, Pintura, Armado, Pulido y Detallado/lavado.

**Reclamos:** Servicio al cliente (chat, correo, información, seguimiento), Taller (selección del proceso técnico), Valoración (partidas/piezas omitidas y otros). Categorías adicionales del Excel de referencia: seguros/trámites, repuestos/compras, bodega/almacén, entrega, parqueos/patio y otros detallados.

Separar defecto observado, proceso relacionado y causa confirmada. El proceso de detección no implica responsabilidad por el origen.

## Flujo y control

1. Registrar y completar datos de identificación.
2. Evaluar todos los puntos y justificar sus decisiones.
3. Registrar comunicación al cliente con fecha, medio y constancia escrita; no exigir fotografía de esta comunicación.
4. Gestionar correcciones de puntos aceptados con encargado y fecha compromiso.
5. Calidad verifica y solicita cierre.
6. Operaciones autoriza o devuelve con motivo. La fecha de cierre se genera al autorizar.

Los casos totalmente rechazados requieren motivos y comunicación; no requieren simular una reparación. Los reprocesos internos tienen flujo de análisis/corrección propio, sin evaluación de procedencia ante un cliente.

Un caso cerrado no se puede reabrir directamente: requiere solicitud motivada y autorización de Operaciones. Conservar todos los ciclos, las fechas originales y el resultado histórico del SLA.

Permitir borradores, pero bloquear cada transición si faltan sus datos obligatorios. Exigir evidencias para defectos físicos y resultados; admitir evidencia documental para servicio/valoración. La aceptación no sustituye el análisis de causa; no completar causas automáticamente sin sustento.

## SLA de evaluación

- Inicio: fecha y hora automática de ingreso al sistema, no la fecha histórica del reclamo.
- Fin: todos los puntos evaluados y comunicación registrada.
- Verde: menos de 10 horas laborales.
- Naranja: desde 10 y antes de 20 horas laborales.
- Rojo: desde 20 horas laborales.
- Zona horaria: America/Costa_Rica.
- Ambas sedes: lunes a viernes 07:30–17:30; sábado 08:00–12:00; domingo excluido.
- Excluir todos los feriados de Costa Rica con calendario anual verificado. No declarar cumplimiento fuera de la cobertura del calendario.
- No pausar automáticamente por terceros ni reiniciar por cambio de estado. El atraso no bloquea la respuesta.
- Mantener versión del calendario y política para preservar resultados históricos.

Las correcciones tienen fecha compromiso separada. Los reprocesos internos no se mezclan con el SLA de evaluación de reclamos.

## Dashboard

- Reclamos recibidos; garantías aceptadas totalmente y parcialmente; no aceptados; pendientes de evaluación y de comunicación.
- Porcentaje de aceptación: casos total o parcialmente aceptados / casos completamente evaluados. Sin evaluados, mostrar sin datos.
- Cantidad de puntos aceptados/no aceptados, distinta del número de casos.
- Reprocesos: vehículos únicos por placa normalizada, eventos y defectos por proceso. Deduplicar vehículos en el total del período.
- Semáforo de pendientes y cumplimiento histórico de evaluados, sin tratar casos aún abiertos como cumplimiento definitivo.
- Filtros por período, sede, tipo, proceso y modalidad; causas confirmadas, reincidencias y pendientes de autorización.
- No calcular tasas sobre producción sin contar con el volumen total de vehículos/OT atendidas.

## Límites de la primera versión

Inicio vacío; sin importar registros históricos. Sin severidad, materiales ni costos. Usar datos ficticios para pruebas. Credenciales, datos de clientes y fotografías deben permanecer fuera del repositorio y de los registros públicos.

## Criterios de prueba

Verificar aceptación parcial; permisos de los tres perfiles; prohibición de cierre/reapertura sin autorización; conservación de auditoría; conflictos simultáneos; transición exacta a 10 y 20 horas; viernes/sábado/domingo y feriados; datos obligatorios; conteos de casos versus puntos y vehículos; acceso móvil.
