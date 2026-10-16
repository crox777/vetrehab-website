# Alimentador local del CMI

**FOVET Rehabilitación Veterinaria S.A. · Uso interno**

`feed_cmi.py` arma el JSON del tablero `cmi.vetrehab.cr` desde archivos en la
computadora, sin hojas de Google. Calcula los quince indicadores con la misma
lógica, las mismas reglas de estado, las mismas series y el mismo redondeo que
`../apps-script/Code.gs`. La salida lleva solo conteos, sumas y porcentajes:
ningún nombre, código de paciente, teléfono ni correo.

## Qué lee

| Argumento | Archivo | Para qué |
|---|---|---|
| `--tracker-sabana` | Tracker de citas de Sabana, `.xlsx`, pestaña `Entrada de Citas` | P1, P2, P3, P5, E1, C5 |
| `--tracker-heredia` | Tracker de citas de Heredia, mismo formato | Igual |
| `--dashboard-html` | `Asesoría/VetRehab_Dashboard_Financiero.html` | Ingresos por sede, costo de ventas, gastos operativos y costos directos por sede, respetando sus cortes |
| `--entradas` | Hoja Entradas en `.csv` o `.json`, mismas columnas que en `../apps-script/README.md` | Lo que no trae el tablero: caja, encuesta, planilla, espacios de agenda |
| `--paquetes-csv` | Exportación CSV de la pestaña `Paquetes` del registro de paquetes | F4 y C4 |
| `--clientes-sabana-csv`, `--clientes-heredia-csv` | Exportación CSV de la pestaña `Registro` de cada registro de clientes nuevos | C2 |

Del tablero financiero se toman los ingresos hasta el mes de su corte de
ingresos y los gastos hasta su corte de gastos. Los meses con gastos se marcan
`gastos_completos = Sí`; los que solo tienen ingresos quedan en `No` y no entran
al margen. Una casilla escrita en `--entradas` siempre manda sobre el tablero.

## Cómo se corre

Con Python 3 y openpyxl. Si openpyxl no está instalado, anteponer
`uv run --with openpyxl` en lugar de `python3`.

```sh
cd ~/vetrehab-website/cmi/feeder
V=~/Library/CloudStorage/Dropbox/VetRehab

python3 feed_cmi.py \
  --tracker-sabana  "$V/Datos SDI/Seguimiento_Citas_Sabana_2025-06_2026-07.xlsx" \
  --tracker-heredia "$V/Datos SDI/Seguimiento_Citas_Heredia_recibido_2026-08-18.xlsx" \
  --dashboard-html  "$V/Asesoría/VetRehab_Dashboard_Financiero.html" \
  --entradas entradas_2026-10-15.csv \
  --out salida_2026-10-15.json
```

Sin `--post` solo escribe el JSON. Después se revisa con el mismo validador
del tablero:

```sh
node validar_worker.mjs salida_2026-10-15.json
```

Para publicar se agrega `--post`. Lee el token de `cmi/.ingest-token`, no lo
imprime, y no publica si el JSON no pasa la validación del tablero. Después de
una publicación correcta guarda en `historial.json` el valor del mes de F4 y C5,
que la siguiente corrida usa para comparar.

Para generar la hoja Entradas con lo que ya trae el tablero financiero:

```sh
python3 feed_cmi.py --dashboard-html "$V/Asesoría/VetRehab_Dashboard_Financiero.html" \
  --escribir-plantilla entradas_2026-10-15.csv
```

`entradas_plantilla.csv` tiene solo los encabezados. Los archivos con cifras
(`entradas_20*.csv`, `salida_*.json`, `historial.json`) no se suben al
repositorio, que es público.

## Qué sale hoy

Con los archivos al 15 de octubre de 2026, el mes de agenda es julio de 2026
(último mes cerrado según los trackers) y el mes financiero es agosto de 2026.

| Indicador | Estado | Por qué |
|---|---|---|
| F1, F2 | Con cifra | Tablero financiero. F2 solo con enero a julio, que son los meses con gastos completos |
| C5, P1, P2, E1 | Con cifra | Trackers. Sabana llega al 13 de julio, así que julio sale corto en Sabana y la nota lo dice |
| F4, C4 | Sin línea base | Falta la exportación del registro de paquetes |
| C2 | Sin línea base | Faltan las exportaciones de los registros de clientes nuevos |
| F5 | Sin línea base | No hay saldo de caja al cierre de agosto |
| F6 | Sin línea base | El tablero no trae costos directos por sede de agosto |
| C1, E2 | Sin línea base | No hay encuesta ni planilla cargadas |
| P3 | Sin línea base | Los trackers no tienen columna de estado de la cita |
| P5 | Sin línea base | No están definidos los espacios de agenda por sede |

C5 y F4 salen en amarillo la primera vez porque no hay mes anterior guardado.
C4, P3 y P5 quedan en `sin_linea_base` aunque tengan cifra, hasta que el Comité
fije su meta.

## Qué falta para completarlo

1. **Trackers nuevos.** Exportar de nuevo los dos trackers hasta el último día
   de setiembre o después. Con eso el mes de agenda pasa a setiembre.
2. **Caja al cierre.** Llenar `caja_cierre` de agosto, setiembre y octubre en el
   archivo de Entradas. Sin el dato del último mes con ingresos, F5 no sale.
3. **Registro de paquetes.** En Google Sheets, pestaña `Paquetes`,
   `Archivo` > `Descargar` > `CSV`. Se pasa con `--paquetes-csv`. C4 además
   necesita la fecha de venta llena.
4. **Registros de clientes nuevos.** Lo mismo con la pestaña `Registro` de cada
   sede, con `--clientes-sabana-csv` y `--clientes-heredia-csv`.
5. **Entradas de recepción y planilla.** `c1_promedio`, `c1_respuestas`,
   `e2_*` y `p5_espacios_*` del mes, en el archivo de Entradas.
6. **Ingresos de setiembre en adelante.** Cuando el tablero financiero corra su
   corte de ingresos, la cifra de Heredia tiene que sumar la empresa VetRehab
   Heredia, que factura aparte desde el 18 de setiembre.

## Cuidados

- `costos_directos_*` sale de los costos directos por sede del tablero
  financiero, que no reparten los honorarios de Carolina. El cuadro pide el
  23,7% de esos honorarios dentro de Heredia. Antes de que F6 use esas cifras
  hay que sumar ese ajuste en el archivo de Entradas.
- Las etiquetas de fecha del tipo `1-set` (con guion) no se leen, igual que en
  Code.gs. Esas filas se descartan y cuentan en la nota de los indicadores.
- Una diferencia con Code.gs: en un CSV, montos escritos como `₡15.000.000`
  llegan como texto y se leen como quince millones. Code.gs los leería como 15,
  porque en una hoja de Google esas celdas ya llegan como número.
