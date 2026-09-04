# Alimentador del Cuadro de Mando Integral

**FOVET Rehabilitación Veterinaria S.A. · Uso interno**

Esta carpeta tiene el script que arma los datos del tablero del CMI y los envía
una vez al día. Los indicadores son los quince de
`Asesoría/VetRehab_CMI_v3.md`. El script no inventa ninguno ni cambia sus
definiciones.

| Archivo | Qué es |
|---|---|
| `Code.gs` | El script de Apps Script. Lee las hojas, calcula, valida y publica. |
| `ejemplo_salida.json` | Una salida de muestra con las líneas base de julio de 2026. Sirve para sembrar el tablero antes de la primera corrida real. |

El script lee seis hojas de cálculo y escribe en ninguna. No envía correo, no
borra nada y no toca los archivos originales.

## Qué sale de dónde

| Indicador | De dónde sale |
|---|---|
| F1 Ingresos por sede | Hoja Entradas: `ingresos_sabana`, `ingresos_heredia` |
| F2 Margen operativo | Hoja Entradas: ingresos, `costo_ventas`, `gastos_operativos`, `gastos_completos` |
| F4 Pasivo de sesiones prepagadas | Registro del pasivo prepagado, cruzado con los trackers para separar los pacientes activos |
| F5 Colchón de caja | Hoja Entradas: `caja_cierre`, `gastos_operativos`, `costo_ventas` |
| F6 Punto de equilibrio por sede | Hoja Entradas: `costos_directos_sabana`, `costos_directos_heredia` |
| C1 Satisfacción del cliente | Hoja Entradas: `c1_promedio`, `c1_respuestas` |
| C2 Clientes nuevos y su origen | Registros de clientes nuevos de las dos sedes |
| C4 Renovación de paquetes | Registro del pasivo prepagado, con la fecha de venta llena |
| C5 Pacientes inactivos | Trackers de citas |
| P1 Citas por mes por sede | Trackers de citas |
| P2 Domicilios por mes | Trackers de citas |
| P3 Cancelaciones y no presentaciones | Trackers de citas, columna de estado |
| P5 Ocupación de agenda | Trackers de citas más `p5_espacios_sabana` y `p5_espacios_heredia` de la hoja Entradas |
| E1 Carga clínica de Carolina | Trackers de citas, columna de doctora |
| E2 Estabilidad del equipo | Hoja Entradas: `e2_planilla_base`, `e2_altas`, `e2_bajas`, `e2_bajas_voluntarias` |

Un indicador cuya entrada todavía no existe sale como `sin_linea_base`. Lo
mismo pasa con los que el cuadro marca como por instalar: F6, C1, C4, P3 y P5.
C4, P3 y P5 muestran ya la cifra calculada cuando el dato aparece, pero su
estado se queda en `sin_linea_base` hasta que el Comité fije la meta, que es lo
que dice el cuadro.

## Instalación

Una sola vez, desde la cuenta `rene@vetrehab.cr`.

1. **Subir las seis hojas a Drive.** Los trackers, el registro del pasivo
   prepagado, los dos registros de clientes nuevos y la hoja Entradas tienen que
   ser hojas de cálculo de Google, no archivos de Excel guardados en Drive. Si
   están en `.xlsx`, abrirlos y usar `Archivo` > `Guardar como Hojas de cálculo
   de Google`. Anotar el ID de cada una: es lo que va entre `/d/` y `/edit` en la
   dirección.

2. **Crear el proyecto.** Ir a <https://script.google.com>, `Nuevo proyecto`, y
   nombrarlo `FOVET CMI`.

3. **Pegar el archivo.** Renombrar `Código.gs` a `Code.gs` y pegar el contenido
   de `Code.gs`.

4. **Cargar las propiedades.** `Configuración del proyecto` >
   `Propiedades del script` > `Agregar propiedad`:

   | Propiedad | Valor |
   |---|---|
   | `SHEET_TRACKER_SABANA` | ID de la hoja del tracker de Sabana |
   | `SHEET_TRACKER_HEREDIA` | ID de la hoja del tracker de Heredia |
   | `SHEET_PASIVO` | ID del registro del pasivo prepagado |
   | `SHEET_CLIENTES_NUEVOS_SABANA` | ID del registro de clientes nuevos de Sabana |
   | `SHEET_CLIENTES_NUEVOS_HEREDIA` | ID del registro de clientes nuevos de Heredia |
   | `SHEET_ENTRADAS_FINANCIERAS` | ID de la hoja Entradas |
   | `CMI_INGEST_URL` | `https://cmi.vetrehab.cr/ingest` |
   | `CMI_INGEST_TOKEN` | el token que entrega el tablero |

5. **Probar sin publicar.** Ejecutar `dryRun()`. La primera vez Google pide
   autorización: `Revisar permisos`, elegir `rene@vetrehab.cr`, y en la pantalla
   que dice que la aplicación no está verificada, entrar por
   `Configuración avanzada` > `Ir a FOVET CMI`. Los permisos que pide son Hojas
   de cálculo (leer) y conexión a un servicio externo (el tablero). Abrir
   `Ver` > `Registros de ejecución`: imprime el JSON completo y no manda nada.

6. **Primera corrida real.** Ejecutar `run()`. El registro dice el código de
   respuesta del tablero. Un 200 es correcto.

7. **Dejarlo automático.** Ejecutar `crearDisparador()` una sola vez. Queda una
   corrida diaria, entre 3 y 4 a. m. Para quitarlo, `borrarDisparadores()`.

## La hoja Entradas

Una hoja de cálculo con una pestaña llamada `Entradas`. La primera fila son los
encabezados, escritos tal cual aparecen abajo. Después va **una fila por mes**.
Las cifras financieras las carga René cuando llega el estado de resultados de la
contadora; las de encuesta y planilla las cargan recepción y Carolina.

| Columna | Qué se escribe | Unidad |
|---|---|---|
| `mes` | El mes al que corresponde la fila | `2026-07` |
| `ingresos_sabana` | Ingresos facturados de Sabana en el mes | colones, netos de IVA |
| `ingresos_heredia` | Ingresos facturados de Heredia en el mes | colones, netos de IVA |
| `costo_ventas` | Costo de las ventas del mes, las dos sedes juntas | colones |
| `gastos_operativos` | Total de gastos del mes sin costo de ventas, las dos sedes juntas | colones |
| `gastos_completos` | `Sí` cuando el mes ya trae todos los gastos; `No` mientras falte planilla, honorarios contables o INS | `Sí` o `No` |
| `caja_cierre` | Saldo en bancos al último día del mes | colones |
| `costos_directos_sabana` | Costos directos de Sabana en el mes | colones |
| `costos_directos_heredia` | Costos directos de Heredia, ya con el 23,7% de los honorarios de Carolina | colones |
| `c1_promedio` | Promedio de la encuesta del mes | número de 0 a 10 |
| `c1_respuestas` | Cuántas personas respondieron en el mes | conteo |
| `e2_planilla_base` | Personas en planilla al cierre del mes | conteo |
| `e2_altas` | Personas que entraron en el mes | conteo |
| `e2_bajas` | Personas que salieron en el mes | conteo |
| `e2_bajas_voluntarias` | De las bajas, cuántas fueron renuncias | conteo |
| `p5_espacios_sabana` | Espacios de agenda disponibles en Sabana durante el mes | conteo |
| `p5_espacios_heredia` | Espacios de agenda disponibles en Heredia durante el mes | conteo |
| `nota` | Aclaración del mes, opcional. No se publica | texto |

Reglas de llenado:

- Una casilla en blanco significa que el dato todavía no existe. El indicador
  que depende de ella sale como `sin_linea_base`. Nunca se escribe cero para
  tapar un vacío.
- Los montos van sin puntos ni el signo de colón, o con el formato de moneda de
  la hoja. El script lee las dos formas.
- `costos_directos_sabana` y `costos_directos_heredia` se llenan desde setiembre
  de 2026, cuando llegue el primer estado mensual por sede. Antes de eso se
  dejan vacías y F6 sale como por instalar.
- `gastos_completos` en `No` deja el mes fuera del cálculo de F2. Así se evita
  que un mes a medias mueva el margen acumulado.
- `p5_espacios_*` se define una vez con recepción, contando cuántas citas caben
  al mes en cada sede. Mientras esté vacío, P5 sale como por instalar.

## Lo que deben traer los trackers

El script busca las columnas por su nombre, no por su posición. Tolera columnas
extra, columnas en otro orden y variantes de mayúsculas o tildes. Estas son las
que necesita en la pestaña `Entrada de Citas`:

| Columna | Para qué | Sin ella |
|---|---|---|
| `Fecha_Cita` | Todo lo mensual | El tracker no se puede usar |
| `Tipo_Cita` | P1, P2, P5, E1 | La fila no cuenta como cita |
| `Doctor/a` | E1 | E1 sale sin línea base |
| `Codigo_Paciente` | C5, F4 | Se usa el nombre de mascota y cliente en su lugar |
| `Nombre_Mascota` y `Nombre_Cliente` | C5, F4 cuando falta el código | Baja la precisión del cruce |
| `Estado_Cita` | P3 | P3 queda como por instalar |

Cómo trata el script los casos conocidos de estos archivos:

- Las etiquetas escritas a mano del tipo `4 set` se leen como fecha. El año lo
  toma de la última fecha buena anterior, porque las filas van en orden.
- Las filas sin tipo de cita son ventas de producto y no cuentan como citas.
- Las filas de domicilio traen el ingreso bruto de IVA y las de clínica lo traen
  neto. Ningún indicador de este script suma esa columna, así que la diferencia
  no lo afecta.
- Las citas de Carolina se reconocen por la columna de doctora, agrupando las
  variantes de escritura del nombre.
- Toda fila que no se pueda leer se descarta y se cuenta. El conteo aparece en
  la nota del indicador que la habría usado.

El registro del pasivo prepagado necesita `Sede`, `Sesiones compradas`,
`Monto pagado` y `Sesiones consumidas` o `Sesiones pendientes`. Para C4 hace
falta además `Fecha de venta` llena en cada fila. Los registros de clientes
nuevos necesitan `Fecha de registro`, `Canal` y
`Clínica o doctor que refirió`; hoy la fecha de registro está vacía en el
histórico, así que C2 arranca cuando recepción empiece a llenarla.

## Mes de reporte

Los indicadores de operación se calculan sobre el último mes cerrado, no sobre
el mes en curso. Un mes a medias siempre quedaría por debajo de su meta. La
fecha de corte que va en el JSON sí es la última fecha que aparece en los
trackers, y cada indicador dice en su nota si el tracker de una sede no llegó al
final del mes.

F4 y C5 comparan contra el mes anterior. El script guarda el valor del mes
cerrado en las propiedades `HISTORIAL_F4` e `HISTORIAL_C5`. La primera corrida
no tiene con qué comparar y esos dos indicadores salen en amarillo. Para empezar
de cero, `borrarHistorial()`.

## Operación

| Cuándo | Qué pasa |
|---|---|
| Todos los días entre 3 y 4 a. m. | El script corre solo y publica el JSON |
| El último día hábil del mes | Recepción llena su parte de la hoja Entradas y cierra los trackers del mes |
| Cuando llega el estado de resultados | René llena las columnas financieras del mes y pone `gastos_completos` en `Sí` |
| Si el script falla | Apps Script avisa por correo a `rene@vetrehab.cr`. Abrir `Ejecuciones` en el proyecto y leer el error |

Errores que se ven de vez en cuando:

- `Falta la propiedad del script CMI_INGEST_URL`. Se cargó incompleta la
  configuración.
- `El tablero respondió 401`. El token no coincide con el que espera el tablero.
- `El paquete no pasó la validación`. El mensaje dice qué indicador y qué campo.
  Casi siempre es una columna renombrada en alguna hoja.

## Seguridad

- El script corre bajo la cuenta `rene@vetrehab.cr`. Nadie más necesita
  ejecutarlo. El proyecto no se comparte con las cuentas de sede.
- El token vive únicamente en las propiedades del script. No está escrito dentro
  del código, no aparece en el registro de ejecución y no sale en el JSON. No se
  manda por WhatsApp ni por correo.
- La salida no lleva ningún dato personal. Solo conteos, sumas y porcentajes.
  Ni nombres de clientes, ni nombres de pacientes, ni teléfonos, ni cédulas, ni
  correos. Los nombres se usan dentro del script para cruzar filas y se quedan
  ahí.
- Si el token se filtra, se rota en Cloudflare, se genera uno nuevo y se
  actualiza la propiedad `CMI_INGEST_TOKEN`. El script vuelve a publicar en la
  siguiente corrida sin ningún otro cambio.
- Los seis IDs de hojas no son secretos por sí solos: sin permiso sobre la hoja
  no abren nada. Aun así se tratan como configuración interna del proyecto.
