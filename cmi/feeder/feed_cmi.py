#!/usr/bin/env python3
"""
FOVET Rehabilitación Veterinaria S.A.
feed_cmi.py

Alimentador local del Cuadro de Mando Integral. Calcula los quince indicadores
de VetRehab_CMI_v3.md con la misma lógica que apps-script/Code.gs, pero leyendo
archivos locales en vez de hojas de Google:

  - los dos trackers de citas (.xlsx, pestaña "Entrada de Citas")
  - la hoja Entradas (.csv o .json, mismas columnas que la hoja de Code.gs)
  - el tablero financiero (VetRehab_Dashboard_Financiero.html, objeto D),
    que llena las columnas financieras de Entradas que vengan vacías
  - exportaciones CSV opcionales del registro de paquetes y de los registros
    de clientes nuevos

Por defecto solo escribe el JSON (--dry-run). Con --post lo envía al tablero
con el token de cmi/.ingest-token. El token nunca se imprime.

Requiere Python 3 y openpyxl. Sin openpyxl:
    uv run --with openpyxl feed_cmi.py ...
"""

import argparse
import csv
import json
import math
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone

try:
    import openpyxl
except ImportError:  # pragma: no cover
    sys.exit("Falta openpyxl. Correr con: uv run --with openpyxl feed_cmi.py ...")

AQUI = os.path.dirname(os.path.abspath(__file__))
TOKEN_PATH = os.path.join(AQUI, "..", ".ingest-token")
INGEST_URL = "https://cmi.vetrehab.cr/ingest"

# =============================== ajustes ===============================

VERSION_CONTRATO = 1
MESES_SERIE = 13
DIAS_INACTIVIDAD = 90
DIAS_RENOVACION = 30
ESTADOS = ["verde", "amarillo", "rojo", "sin_linea_base"]
PERSPECTIVAS = ["financiera", "clientes", "procesos", "equipo"]
IDS_ESPERADOS = ["F1", "F2", "F4", "F5", "F6", "C1", "C2", "C4", "C5",
                 "P1", "P2", "P3", "P5", "E1", "E2"]

METAS = {
    "F1_CIERRE_MIN": 181000000,
    "F1_CIERRE_AMARILLO": 170000000,
    "F2_MARGEN_VERDE": 0.08,
    "F5_MESES_VERDE": 2.0,
    "F5_MESES_AMARILLO": 1.5,
    "F5_CAJA_REPLIEGUE": 12000000,
    "C1_PROMEDIO": 7.5,
    "C1_RESPUESTAS": 30,
    "C2_ORIGEN": 0.90,
    "C2_REFERIDOR": 0.90,
    "P1_SABANA": 315,
    "P1_HEREDIA": 140,
    "P2_SABANA": 70,
    "P2_HEREDIA": 10,
    "E1_TOPE": 0.20,
    "E1_ROJO": 0.25,
}

MESES_TEXTO = {
    "ene": 0, "enero": 0, "feb": 1, "febrero": 1, "mar": 2, "marzo": 2,
    "abr": 3, "abril": 3, "may": 4, "mayo": 4, "jun": 5, "junio": 5,
    "jul": 6, "julio": 6, "ago": 7, "agosto": 7,
    "set": 8, "sep": 8, "sept": 8, "setiembre": 8, "septiembre": 8,
    "oct": 9, "octubre": 9, "nov": 10, "noviembre": 10, "dic": 11, "diciembre": 11,
}

COLUMNAS_TRACKER = {
    "fecha": ["fecha_cita", "fecha cita", "fecha"],
    "doctor": ["doctor/a", "doctora", "doctor", "medico", "medica"],
    "codigo": ["codigo_paciente", "codigo paciente", "codigo qvet", "codigo"],
    "mascota": ["nombre_mascota", "nombre mascota", "paciente", "mascota"],
    "cliente": ["nombre_cliente", "nombre cliente", "cliente"],
    "tipo": ["tipo_cita", "tipo cita", "tipo de cita", "tipo"],
    "estado": ["estado_cita", "estado cita", "estado de la cita", "estado"],
    "ingresos": ["ingresos", "ingreso", "monto"],
}

COLUMNAS_PASIVO = {
    "sede": ["sede"],
    "codigo": ["codigo qvet", "codigo_paciente", "codigo"],
    "cliente": ["cliente"],
    "paciente": ["paciente", "nombre_mascota"],
    "fechaVenta": ["fecha de venta", "fecha de compra", "fecha_venta", "fecha de la compra"],
    "sesionesCompradas": ["sesiones compradas", "sesiones del paquete", "sesiones"],
    "montoPagado": ["monto pagado", "monto", "precio pagado"],
    "sesionesConsumidas": ["sesiones consumidas", "sesiones usadas"],
    "ultimaSesion": ["ultima sesion", "ultima session", "fecha ultima sesion"],
    "sesionesPendientes": ["sesiones pendientes", "sesiones restantes"],
    "ingresoDiferido": ["valor de las sesiones pendientes", "ingreso diferido", "pasivo", "saldo diferido"],
    "estado": ["estado"],
}

COLUMNAS_CLIENTES = {
    "fecha": ["fecha de registro", "fecha registro", "fecha"],
    "canal": ["canal", "origen"],
    "referidor": ["clinica o doctor que refirio", "clinica o doctor", "referidor", "quien refirio"],
}

COLUMNAS_ENTRADAS = {
    "mes": ["mes"],
    "ingresosSabana": ["ingresos_sabana"],
    "ingresosHeredia": ["ingresos_heredia"],
    "costoVentas": ["costo_ventas"],
    "gastosOperativos": ["gastos_operativos"],
    "gastosCompletos": ["gastos_completos"],
    "cajaCierre": ["caja_cierre"],
    "costosDirectosSabana": ["costos_directos_sabana"],
    "costosDirectosHeredia": ["costos_directos_heredia"],
    "c1Promedio": ["c1_promedio"],
    "c1Respuestas": ["c1_respuestas"],
    "e2PlanillaBase": ["e2_planilla_base"],
    "e2Altas": ["e2_altas"],
    "e2Bajas": ["e2_bajas"],
    "e2BajasVoluntarias": ["e2_bajas_voluntarias"],
    "p5EspaciosSabana": ["p5_espacios_sabana"],
    "p5EspaciosHeredia": ["p5_espacios_heredia"],
    "nota": ["nota"],
}
ENCABEZADOS_ENTRADAS = [v[0] for v in COLUMNAS_ENTRADAS.values()]

# El tablero financiero arranca la hoja Entradas en este mes.
DESDE_DASHBOARD = "2026-01"

# ===================== equivalentes de JavaScript =====================


def js_round(x):
    """Math.round de JavaScript: redondea .5 hacia arriba."""
    return math.floor(x + 0.5)


def js_str(v):
    """String(v) de JavaScript para los tipos que traen las celdas."""
    if v is None:
        return ""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        if math.isfinite(v) and v == int(v) and abs(v) < 1e21:
            return str(int(v))
        return repr(v)
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return str(v)


def es_numero(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def finito(n):
    return es_numero(n) and math.isfinite(n)


# ============================ utilidades base ============================


def fila_vacia(fila):
    for v in fila:
        if v != "" and v is not None:
            return False
    return True


_TILDES = [("[áàäâã]", "a"), ("[éèëê]", "e"), ("[íìïî]", "i"), ("[óòöôõ]", "o"), ("[úùüû]", "u"), ("ñ", "n")]


def normalizar(v):
    if v is None:
        return ""
    s = js_str(v).strip().lower()
    for patron, letra in _TILDES:
        s = re.sub(patron, letra, s)
    return re.sub(r"\s+", " ", s)


def fecha_valida(anio, mes, dia):
    if not anio or anio < 2000 or anio > 2100:
        return None
    if mes < 0 or mes > 11:
        return None
    if dia < 1 or dia > 31:
        return None
    # new Date(anio, mes, dia) desborda al mes siguiente (31 de setiembre = 1 de octubre).
    return date(anio, mes + 1, 1) + timedelta(days=dia - 1)


def anio_por_contexto(ultima, mes):
    if not ultima:
        return None
    y = ultima.year
    if mes < (ultima.month - 1) - 6:
        y += 1
    return y


def parse_fecha(v, ultima):
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if es_numero(v):
        if v < 20000 or v > 80000:
            return None
        return date(1899, 12, 30) + timedelta(days=math.floor(v))
    s = normalizar(v)
    if not s:
        return None
    m = re.match(r"^(\d{4})[-/](\d{1,2})[-/](\d{1,2})", s)
    if m:
        return fecha_valida(int(m.group(1)), int(m.group(2)) - 1, int(m.group(3)))
    m = re.match(r"^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})", s)
    if m:
        anio = int(m.group(3))
        if anio < 100:
            anio += 2000
        return fecha_valida(anio, int(m.group(2)) - 1, int(m.group(1)))
    m = re.match(r"^(\d{1,2})\s*(?:de\s+)?([a-z]+)\.?\s*(?:de\s+)?(\d{4})?", s)
    if m and m.group(2) in MESES_TEXTO:
        mes = MESES_TEXTO[m.group(2)]
        dia = int(m.group(1))
        y = int(m.group(3)) if m.group(3) else anio_por_contexto(ultima, mes)
        if y is None:
            return None
        return fecha_valida(y, mes, dia)
    return None


def numero(v):
    if v is None or v == "":
        return None
    if es_numero(v):
        return v if math.isfinite(v) else None
    if isinstance(v, (datetime, date)):
        return None
    s = re.sub(r"[₡$\s%]", "", js_str(v)).strip()
    if not s:
        return None
    negativo = bool(re.match(r"^\(.*\)$", s)) or s.startswith("-")
    s = re.sub(r"[()\-]", "", s)
    tiene_coma = "," in s
    tiene_punto = "." in s
    if tiene_coma and tiene_punto:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".", 1)
        else:
            s = s.replace(",", "")
    elif tiene_coma:
        partes = s.split(",")
        if len(partes) == 2 and len(partes[1]) != 3:
            s = s.replace(",", ".", 1)
        else:
            s = s.replace(",", "")
    elif tiene_punto and re.match(r"^\d{1,3}(\.\d{3})+$", s):
        # Desvío deliberado de Code.gs: en un CSV, "₡15.000.000" o "200.000"
        # llegan como texto (en Sheets serían números) y parseFloat los leería
        # como 15 o 200. Grupos de tres cifras tras cada punto son miles.
        s = s.replace(".", "")
    m = re.match(r"^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?", s)  # parseFloat
    if not m:
        return None
    n = float(m.group(0))
    if n == int(n):
        n = int(n)
    return -n if negativo else n


def es_si(v):
    if v is True:
        return True
    return normalizar(v) in ["si", "sí", "x", "verdadero", "true", "1", "completo", "completos"]


def clave_mes(f):
    return "%04d-%02d" % (f.year, f.month)


def dos_digitos(n):
    return "%02d" % n


def clave_mes_texto(v):
    if v is None or v == "":
        return None
    if isinstance(v, (datetime, date)):
        return clave_mes(v)
    s = normalizar(v)
    m = re.match(r"^(\d{4})[-/](\d{1,2})$", s)
    if m:
        return m.group(1) + "-" + dos_digitos(int(m.group(2)))
    m = re.match(r"^(\d{1,2})[-/](\d{4})$", s)
    if m:
        return m.group(2) + "-" + dos_digitos(int(m.group(1)))
    m = re.match(r"^([a-z]+)\.?\s+(?:de\s+)?(\d{4})$", s)
    if m and m.group(1) in MESES_TEXTO:
        return m.group(2) + "-" + dos_digitos(MESES_TEXTO[m.group(1)] + 1)
    f = parse_fecha(v, None)
    return clave_mes(f) if f else None


def fin_de_mes(clave):
    anio, mes = int(clave[:4]), int(clave[5:7])
    if mes == 12:
        return date(anio, 12, 31)
    return date(anio, mes + 1, 1) - timedelta(days=1)


def ultimos_meses(fecha, cuantos):
    if not fecha:
        return []
    lista = []
    for i in range(cuantos - 1, -1, -1):
        total = fecha.year * 12 + (fecha.month - 1) - i
        lista.append("%04d-%02d" % (total // 12, total % 12 + 1))
    return lista


def mes_cerrado(corte):
    if not corte:
        return None
    if corte == fin_de_mes(clave_mes(corte)):
        return clave_mes(corte)
    return clave_mes(date(corte.year, corte.month, 1) - timedelta(days=1))


def dias_entre(desde, hasta):
    if not desde or not hasta:
        return math.inf
    return (hasta - desde).days


def fecha_iso(f):
    return f.isoformat()


NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
               "agosto", "setiembre", "octubre", "noviembre", "diciembre"]


def fecha_larga(f):
    return "%d de %s de %d" % (f.day, NOMBRES_MES[f.month - 1], f.year)


def nombre_mes_largo(clave):
    n = NOMBRES_MES[int(clave[5:7]) - 1]
    return n[0].upper() + n[1:] + " de " + clave[:4]


def redondear(n, dec):
    f = 10 ** dec
    return js_round(n * f) / f


def a_millones(n):
    return None if n is None else redondear(n / 1000000, 1)


def decimal_(n, dec):
    if not finito(n):
        return "sin dato"
    return ("%.*f" % (dec, redondear(n, dec))).replace(".", ",")


def millones(n):
    if n is None:
        return "sin dato"
    signo = "−" if n < 0 else ""
    return signo + "₡" + decimal_(abs(n) / 1000000, 1) + "M"


def porcentaje(n):
    if not finito(n):
        return "sin dato"
    signo = "−" if n < 0 else ""
    return signo + decimal_(abs(n), 1) + "%"


def entero(n):
    if not finito(n):
        return "sin dato"
    s = str(js_round(n))
    neg = s.startswith("-")
    d = s[1:] if neg else s
    d = re.sub(r"\B(?=(\d{3})+(?!\d))", ".", d)
    return ("-" if neg else "") + d


def recortar(s, n):
    s = str(s or "")
    return s[:n] + "…" if len(s) > n else s


# =========================== lectura de tablas ===========================


def buscar_columna(encabezados, alternativas):
    for a in alternativas:
        buscada = normalizar(a)
        for i, e in enumerate(encabezados):
            if e == buscada:
                return i
    for b in alternativas:
        parcial = normalizar(b)
        for k, e in enumerate(encabezados):
            if e and e.startswith(parcial):
                return k
    return -1


def contar_coincidencias(fila, mapa):
    enc = [normalizar(c) for c in fila]
    return sum(1 for clave in mapa if buscar_columna(enc, mapa[clave]) >= 0)


def leer_tabla(valores, mapa):
    """valores: lista de filas (listas). Igual que leerTabla_ de Code.gs."""
    if not valores:
        return {"indices": {k: -1 for k in mapa}, "filas": [], "encabezados": []}
    fila_enc, mejor = 0, -1
    for f in range(min(len(valores), 8)):
        puntos = contar_coincidencias(valores[f], mapa)
        if puntos > mejor:
            mejor, fila_enc = puntos, f
    encabezados = [normalizar(c) for c in valores[fila_enc]]
    indices = {k: buscar_columna(encabezados, mapa[k]) for k in mapa}
    return {"indices": indices, "encabezados": encabezados, "filas": valores[fila_enc + 1:]}


def celda(fila, j):
    return fila[j] if 0 <= j < len(fila) else ""


def valores_xlsx(ruta, pestanas):
    libro = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    hoja = None
    for nombre in pestanas:
        buscada = normalizar(nombre)
        for h in libro.sheetnames:
            if normalizar(h) == buscada:
                hoja = libro[h]
                break
        if hoja is not None:
            break
    if hoja is None:
        hoja = libro[libro.sheetnames[0]] if libro.sheetnames else None
    if hoja is None:
        return []
    filas = [list(r) for r in hoja.iter_rows(values_only=True)]
    libro.close()
    return filas


def valores_csv(ruta):
    with open(ruta, newline="", encoding="utf-8-sig") as fh:
        muestra = fh.read(4096)
        fh.seek(0)
        try:
            dialecto = csv.Sniffer().sniff(muestra, delimiters=",;\t")
        except csv.Error:
            dialecto = csv.excel
        return [list(r) for r in csv.reader(fh, dialecto)]


def valores_entradas(ruta):
    if ruta.lower().endswith(".json"):
        with open(ruta, encoding="utf-8") as fh:
            datos = json.load(fh)
        if isinstance(datos, dict):
            datos = datos.get("filas") or datos.get("Entradas") or []
        enc = []
        for d in datos:
            for k in d:
                if k not in enc:
                    enc.append(k)
        return [enc] + [[d.get(k, "") for k in enc] for d in datos]
    if ruta.lower().endswith((".xlsx", ".xlsm")):
        return valores_xlsx(ruta, ["Entradas"])
    return valores_csv(ruta)


# =========================== lectura de fuentes ===========================


def codigo_limpio(v):
    if v is None:
        return ""
    s = js_str(v).strip()
    if not s or not re.match(r"^\d+$", s):
        return ""
    return s


def identidad_paciente(c, ix, sede):
    codigo = codigo_limpio(celda(c, ix["codigo"])) if ix["codigo"] >= 0 else ""
    if codigo:
        return sede + "#" + codigo
    mascota = normalizar(celda(c, ix["mascota"])) if ix["mascota"] >= 0 else ""
    cliente = normalizar(celda(c, ix["cliente"])) if ix["cliente"] >= 0 else ""
    if not mascota and not cliente:
        return ""
    return sede + "~" + mascota + "|" + cliente


def leer_tracker(ruta, sede, ctx):
    vacio = {"sede": sede, "filas": [], "tieneEstado": False, "ilegibles": 0, "total": 0}
    if not ruta:
        ctx["faltantes"].append("tracker " + sede)
        return vacio
    valores = valores_xlsx(ruta, ["Entrada de Citas", "Citas", "Registro"])
    tabla = leer_tabla(valores, COLUMNAS_TRACKER)
    ix = tabla["indices"]
    if ix["fecha"] < 0:
        print("El tracker de %s no tiene columna de fecha. Se ignora." % sede, file=sys.stderr)
        ctx["faltantes"].append("tracker " + sede + " (sin columna de fecha)")
        return vacio

    filas, ilegibles, ultima = [], 0, None
    for cruda in tabla["filas"]:
        if fila_vacia(cruda):
            continue
        fecha = parse_fecha(celda(cruda, ix["fecha"]), ultima)
        tipo = normalizar(celda(cruda, ix["tipo"])) if ix["tipo"] >= 0 else ""
        if not fecha:
            if tipo or (ix["mascota"] >= 0 and celda(cruda, ix["mascota"])):
                ilegibles += 1
            continue
        ultima = fecha
        if not tipo:
            ilegibles += 1
            continue
        filas.append({
            "sede": sede,
            "fecha": fecha,
            "mes": clave_mes(fecha),
            "tipo": tipo,
            "doctor": normalizar(celda(cruda, ix["doctor"])) if ix["doctor"] >= 0 else "",
            "estado": normalizar(celda(cruda, ix["estado"])) if ix["estado"] >= 0 else "",
            "codigo": codigo_limpio(celda(cruda, ix["codigo"])) if ix["codigo"] >= 0 else "",
            "mascota": normalizar(celda(cruda, ix["mascota"])) if ix["mascota"] >= 0 else "",
            "cliente": normalizar(celda(cruda, ix["cliente"])) if ix["cliente"] >= 0 else "",
            "paciente": identidad_paciente(cruda, ix, sede),
        })
    return {"sede": sede, "filas": filas, "tieneEstado": ix["estado"] >= 0,
            "ilegibles": ilegibles, "total": len(filas) + ilegibles}


def etiqueta_sede(v):
    n = normalizar(v)
    if "sabana" in n:
        return "Sabana"
    if "heredia" in n:
        return "Heredia"
    return js_str(v).strip() if v else ""


def identidad_paciente_pasivo(c, ix):
    codigo = codigo_limpio(celda(c, ix["codigo"])) if ix["codigo"] >= 0 else ""
    if codigo:
        return "#" + codigo
    paciente = normalizar(celda(c, ix["paciente"])) if ix["paciente"] >= 0 else ""
    cliente = normalizar(celda(c, ix["cliente"])) if ix["cliente"] >= 0 else ""
    return "~" + paciente + "|" + cliente


def leer_pasivo(ruta, ctx):
    vacio = {"filas": [], "tieneFechaVenta": False, "ilegibles": 0, "disponible": False}
    if not ruta:
        ctx["faltantes"].append("paquetes")
        return vacio
    tabla = leer_tabla(valores_csv(ruta), COLUMNAS_PASIVO)
    ix = tabla["indices"]
    filas, ilegibles, con_fecha = [], 0, 0
    for c in tabla["filas"]:
        if fila_vacia(c):
            continue
        compradas = numero(celda(c, ix["sesionesCompradas"])) if ix["sesionesCompradas"] >= 0 else None
        consumidas = numero(celda(c, ix["sesionesConsumidas"])) if ix["sesionesConsumidas"] >= 0 else None
        monto = numero(celda(c, ix["montoPagado"])) if ix["montoPagado"] >= 0 else None
        if compradas is None and monto is None:
            ilegibles += 1
            continue
        pendientes = numero(celda(c, ix["sesionesPendientes"])) if ix["sesionesPendientes"] >= 0 else None
        if pendientes is None and compradas is not None:
            pendientes = compradas - (consumidas or 0)
        if pendientes is None:
            ilegibles += 1
            continue
        if pendientes < 0:
            pendientes = 0
        precio = monto / compradas if (monto is not None and compradas) else None
        diferido = numero(celda(c, ix["ingresoDiferido"])) if ix["ingresoDiferido"] >= 0 else None
        if diferido is None and precio is not None:
            diferido = precio * pendientes
        fecha_venta = parse_fecha(celda(c, ix["fechaVenta"]), None) if ix["fechaVenta"] >= 0 else None
        if fecha_venta:
            con_fecha += 1
        filas.append({
            "sede": etiqueta_sede(celda(c, ix["sede"])) if ix["sede"] >= 0 else "",
            "codigo": codigo_limpio(celda(c, ix["codigo"])) if ix["codigo"] >= 0 else "",
            "mascota": normalizar(celda(c, ix["paciente"])) if ix["paciente"] >= 0 else "",
            "cliente": normalizar(celda(c, ix["cliente"])) if ix["cliente"] >= 0 else "",
            "paciente": identidad_paciente_pasivo(c, ix),
            "fechaVenta": fecha_venta,
            "compradas": compradas,
            "consumidas": consumidas,
            "pendientes": pendientes,
            "diferido": 0 if diferido is None else diferido,
            "ultimaSesion": parse_fecha(celda(c, ix["ultimaSesion"]), None) if ix["ultimaSesion"] >= 0 else None,
            "estado": normalizar(celda(c, ix["estado"])) if ix["estado"] >= 0 else "",
        })
    return {"filas": filas, "tieneFechaVenta": con_fecha > 0, "conFechaVenta": con_fecha,
            "ilegibles": ilegibles, "disponible": True}


def leer_clientes_nuevos(rutas, ctx):
    resultado = {"filas": [], "ilegibles": 0, "disponible": False, "sedes": {}}
    for sede in ["Sabana", "Heredia"]:
        ruta = rutas.get(sede)
        if not ruta:
            ctx["faltantes"].append("clientes nuevos " + sede)
            continue
        tabla = leer_tabla(valores_csv(ruta), COLUMNAS_CLIENTES)
        ix = tabla["indices"]
        resultado["disponible"] = True
        resultado["sedes"][sede] = {"conFecha": 0, "sinFecha": 0}
        for c in tabla["filas"]:
            if fila_vacia(c):
                continue
            fecha = parse_fecha(celda(c, ix["fecha"]), None) if ix["fecha"] >= 0 else None
            if not fecha:
                resultado["ilegibles"] += 1
                resultado["sedes"][sede]["sinFecha"] += 1
                continue
            resultado["sedes"][sede]["conFecha"] += 1
            canal = js_str(celda(c, ix["canal"]) or "").strip() if ix["canal"] >= 0 else ""
            referidor = js_str(celda(c, ix["referidor"]) or "").strip() if ix["referidor"] >= 0 else ""
            resultado["filas"].append({
                "sede": sede,
                "mes": clave_mes(fecha),
                "conCanal": bool(canal),
                "esReferencia": normalizar(canal).startswith("referencia"),
                "conReferidor": bool(referidor),
            })
    return resultado


def leer_entradas(valores):
    if valores is None:
        return {"porMes": {}, "meses": [], "disponible": False, "ilegibles": 0}
    tabla = leer_tabla(valores, COLUMNAS_ENTRADAS)
    ix = tabla["indices"]
    por_mes, meses, ilegibles = {}, [], 0
    for c in tabla["filas"]:
        if fila_vacia(c):
            continue
        mes = clave_mes_texto(celda(c, ix["mes"]) if ix["mes"] >= 0 else None)
        if not mes:
            ilegibles += 1
            continue
        fila = {"mes": mes}
        for clave in COLUMNAS_ENTRADAS:
            if clave == "mes":
                continue
            j = ix[clave]
            if j < 0:
                fila[clave] = None
                continue
            v = celda(c, j)
            if clave == "nota":
                fila[clave] = js_str(v).strip() if v else ""
            elif clave == "gastosCompletos":
                fila[clave] = es_si(v)
            else:
                fila[clave] = numero(v)
        por_mes[mes] = fila
        if mes not in meses:
            meses.append(mes)
    meses.sort()
    return {"porMes": por_mes, "meses": meses, "disponible": True, "ilegibles": ilegibles, "indices": ix}


# ===================== tablero financiero (objeto D) =====================


def leer_dashboard(ruta):
    with open(ruta, encoding="utf-8") as fh:
        texto = fh.read()
    m = re.search(r"const D = (\{.*?\});\s*\n", texto, re.S)
    if not m:
        raise SystemExit("No se encontró 'const D = {...};' en " + ruta)
    return json.loads(m.group(1))


def filas_desde_dashboard(D, desde=DESDE_DASHBOARD):
    """
    Filas de la hoja Entradas que se pueden derivar del tablero financiero,
    respetando sus cortes: ingresos hasta D.corte.ingresos, gastos hasta
    D.corte.gastos. Lo demás queda en blanco.
    """
    corte_ing = D["corte"]["ingresos"]
    corte_gas = D["corte"]["gastos"]
    filas = {}
    for mes in D["months"]:
        if mes < desde or mes > corte_ing:
            continue
        r = D["rev"].get(mes) or {}
        f = {k: "" for k in ENCABEZADOS_ENTRADAS}
        f["mes"] = mes
        # El depósito de octubre de 2025 es una transferencia, no ingreso.
        f["ingresos_sabana"] = r.get("sabana", "")
        f["ingresos_heredia"] = r.get("heredia", "")
        if mes <= corte_gas:
            c = D["cost"][mes]
            egr = D["res"][mes]["egr"]  # gastos operativos del mayor, sin remodelación
            f["costo_ventas"] = c["costoventas"]
            f["gastos_operativos"] = egr - c["costoventas"]
            f["gastos_completos"] = "Sí"
        else:
            f["gastos_completos"] = "No"
        pm = (D.get("persede_mes") or {}).get(mes)
        if pm:
            f["costos_directos_sabana"] = pm["sab_dir"]
            f["costos_directos_heredia"] = pm["her_dir"]
        filas[mes] = f
    return filas


def combinar_entradas(valores_archivo, filas_d):
    """
    Une la hoja Entradas del archivo con las filas del tablero. Una casilla
    escrita en el archivo manda; el tablero solo llena las vacías.
    """
    if valores_archivo is None and not filas_d:
        return None
    por_mes = {}
    orden = []
    if valores_archivo:
        tabla = leer_tabla(valores_archivo, COLUMNAS_ENTRADAS)
        ix = tabla["indices"]
        for c in tabla["filas"]:
            if fila_vacia(c):
                continue
            fila = {}
            for clave, alias in COLUMNAS_ENTRADAS.items():
                fila[alias[0]] = celda(c, ix[clave]) if ix[clave] >= 0 else ""
            mes = clave_mes_texto(fila["mes"]) or ("?" + str(len(orden)))
            por_mes[mes] = fila
            orden.append(mes)
    for mes, fd in (filas_d or {}).items():
        if mes not in por_mes:
            por_mes[mes] = dict(fd)
            orden.append(mes)
            continue
        fa = por_mes[mes]
        for k, v in fd.items():
            if k == "mes":
                continue
            if fa.get(k) is None or fa.get(k) == "":
                fa[k] = v
    return [ENCABEZADOS_ENTRADAS] + [[por_mes[m].get(k, "") for k in ENCABEZADOS_ENTRADAS] for m in orden]


def escribir_plantilla(ruta, filas_d):
    with open(ruta, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(ENCABEZADOS_ENTRADAS)
        for mes in sorted(filas_d):
            f = dict(filas_d[mes])
            f["nota"] = "Financieros tomados del tablero financiero" + (
                "" if f["gastos_completos"] == "Sí" else "; gastos todavía incompletos")
            w.writerow([f.get(k, "") for k in ENCABEZADOS_ENTRADAS])


# ============================ contexto ============================


def max_fecha(citas):
    return max((c["fecha"] for c in citas), default=None)


def rango_meses(citas):
    if not citas:
        return None
    meses = [c["mes"] for c in citas]
    return {"desde": min(meses), "hasta": max(meses)}


def ultimo_mes_financiero(entradas):
    for m in reversed(entradas["meses"]):
        f = entradas["porMes"][m]
        if (f["ingresosSabana"] or 0) + (f["ingresosHeredia"] or 0) > 0:
            return m
    return None


def leer_fuentes(args):
    ctx = {"incidencias": {}, "faltantes": []}
    ctx["sabana"] = leer_tracker(args.tracker_sabana, "Sabana", ctx)
    ctx["heredia"] = leer_tracker(args.tracker_heredia, "Heredia", ctx)
    ctx["citas"] = ctx["sabana"]["filas"] + ctx["heredia"]["filas"]
    ctx["tieneEstado"] = ctx["sabana"]["tieneEstado"] or ctx["heredia"]["tieneEstado"]

    ctx["pasivo"] = leer_pasivo(args.paquetes_csv, ctx)
    ctx["clientesNuevos"] = leer_clientes_nuevos(
        {"Sabana": args.clientes_sabana_csv, "Heredia": args.clientes_heredia_csv}, ctx)

    valores = valores_entradas(args.entradas) if args.entradas else None
    filas_d = filas_desde_dashboard(leer_dashboard(args.dashboard_html), args.desde_mes) if args.dashboard_html else None
    ctx["entradas"] = leer_entradas(combinar_entradas(valores, filas_d))
    if not ctx["entradas"]["disponible"]:
        ctx["faltantes"].append("entradas")

    ctx["corteAgenda"] = max_fecha(ctx["citas"])
    ctx["cortePorSede"] = {"Sabana": max_fecha(ctx["sabana"]["filas"]),
                           "Heredia": max_fecha(ctx["heredia"]["filas"])}
    ctx["rangoPorSede"] = {"Sabana": rango_meses(ctx["sabana"]["filas"]),
                           "Heredia": rango_meses(ctx["heredia"]["filas"])}
    ctx["mesAgenda"] = mes_cerrado(ctx["corteAgenda"])
    ctx["mesesAgenda"] = ultimos_meses(fin_de_mes(ctx["mesAgenda"]), MESES_SERIE) if ctx["mesAgenda"] else []
    ctx["mesFinanciero"] = ultimo_mes_financiero(ctx["entradas"])
    ctx["mesesFinancieros"] = (ultimos_meses(fin_de_mes(ctx["mesFinanciero"]), MESES_SERIE)
                               if ctx["mesFinanciero"] else [])
    ctx["historial"] = leer_historial_archivo(args.historial)
    return ctx


# ================================ apoyos ================================


def serie_entradas(ctx, claves):
    meses = list(ctx["mesesFinancieros"])
    valores = {}
    for clave in claves:
        valores[clave] = []
        for m in meses:
            f = ctx["entradas"]["porMes"].get(m)
            valores[clave].append(f[clave] if f and f.get(clave) is not None else None)
    return {"meses": meses, "valores": valores}


def serie_citas(ctx, filtro):
    meses = list(ctx["mesesAgenda"])
    indice = {m: i for i, m in enumerate(meses)}
    valores = {"Sabana": [0] * len(meses), "Heredia": [0] * len(meses)}
    for c in ctx["citas"]:
        i = indice.get(c["mes"])
        if i is None or not filtro(c) or c["sede"] not in valores:
            continue
        valores[c["sede"]][i] += 1
    for s in ["Sabana", "Heredia"]:
        rango = ctx["rangoPorSede"][s]
        for i, m in enumerate(meses):
            if not rango or m < rango["desde"] or m > rango["hasta"]:
                valores[s][i] = None
    u = len(meses) - 1
    return {"meses": meses, "valores": valores,
            "ultimo": {"Sabana": valores["Sabana"][u] if u >= 0 else 0,
                       "Heredia": valores["Heredia"][u] if u >= 0 else 0}}


def serie_carolina(ctx):
    meses = list(ctx["mesesAgenda"])
    indice = {m: i for i, m in enumerate(meses)}
    total, suyas = [0] * len(meses), [0] * len(meses)
    for c in ctx["citas"]:
        i = indice.get(c["mes"])
        if i is None:
            continue
        total[i] += 1
        if es_carolina(c["doctor"]):
            suyas[i] += 1
    return {"meses": meses, "valores": {
        "Carga de Carolina": [redondear(s / total[i] * 100, 1) if total[i] else None
                              for i, s in enumerate(suyas)]}}


def serie_clientes_nuevos(ctx):
    meses = list(ctx["mesesAgenda"])
    indice = {m: i for i, m in enumerate(meses)}
    valores = {"Sabana": [0] * len(meses), "Heredia": [0] * len(meses)}
    for f in ctx["clientesNuevos"]["filas"]:
        i = indice.get(f["mes"])
        if i is None or f["sede"] not in valores:
            continue
        valores[f["sede"]][i] += 1
    return {"meses": meses, "valores": valores}


def pacientes_activos(ctx):
    activos = set()
    for c in ctx["citas"]:
        corte = ctx["cortePorSede"][c["sede"]] or ctx["corteAgenda"]
        if dias_entre(c["fecha"], corte) > DIAS_INACTIVIDAD:
            continue
        if c["codigo"]:
            activos.add("C:" + c["codigo"])
        if c["mascota"] and c["cliente"]:
            activos.add("N:" + c["mascota"] + "|" + c["cliente"])
        if c["mascota"]:
            activos.add("M:" + c["sede"] + "|" + c["mascota"])
            activos.add("M:*|" + c["mascota"])
    return activos


def pasivo_activo(f, activos):
    if f["codigo"] and ("C:" + f["codigo"]) in activos:
        return True
    if f["mascota"] and f["cliente"] and ("N:" + f["mascota"] + "|" + f["cliente"]) in activos:
        return True
    if f["mascota"]:
        if f["sede"] and ("M:" + f["sede"] + "|" + f["mascota"]) in activos:
            return True
        if not f["sede"] and ("M:*|" + f["mascota"]) in activos:
            return True
    return False


def resultado_operativo(f):
    ingresos = (f["ingresosSabana"] or 0) + (f["ingresosHeredia"] or 0)
    resultado = ingresos - (f["costoVentas"] or 0) - (f["gastosOperativos"] or 0)
    return {"ingresos": ingresos, "resultado": resultado}


def meses_con_gastos_completos(ctx):
    out = []
    for m in ctx["entradas"]["meses"]:
        f = ctx["entradas"]["porMes"][m]
        if f["gastosCompletos"] and resultado_operativo(f)["ingresos"] > 0:
            out.append(m)
    return out


def ultimo_mes_con(ctx, clave):
    for m in reversed(ctx["entradas"]["meses"]):
        v = ctx["entradas"]["porMes"][m].get(clave)
        if v is not None and v != "":
            return m
    return None


def estado_contra_meta(valor, meta):
    if valor >= meta:
        return "verde"
    if valor >= meta * 0.9:
        return "amarillo"
    return "rojo"


def estado_por_sede(valores, metas):
    estados = [estado_contra_meta(v, metas[i]) for i, v in enumerate(valores) if v is not None]
    return peor_estado(estados) if estados else None


def peor_estado(lista):
    if "rojo" in lista:
        return "rojo"
    if "amarillo" in lista:
        return "amarillo"
    return "verde"


def sin_linea_base(base, motivo):
    base["estado"] = "sin_linea_base"
    base["valor"] = "Sin línea base"
    base["detalle"] = motivo
    base["nota"] = motivo
    return base


def es_domicilio(c):
    return c["tipo"].startswith("domicilio")


def es_carolina(doctor):
    if not doctor:
        return False
    return doctor.startswith("caro") or doctor == "cf"


def es_cancelada(estado):
    return any(estado.startswith(e) for e in
               ["cancelada", "cancelado", "no presento", "no se presento", "no show", "noshow", "ausente", "no asistio"])


def incidencias_tracker(ctx):
    n = (ctx["sabana"]["ilegibles"] or 0) + (ctx["heredia"]["ilegibles"] or 0)
    return incidencia("filas de los trackers sin fecha o sin tipo de cita legibles", n)


def incidencia(que, n):
    if not n:
        return "Sin filas descartadas por lectura."
    return "Se descartaron " + entero(n) + " " + que + "."


def nota_entradas(ctx):
    n = ctx["entradas"].get("ilegibles") or 0
    if not n:
        return "Sin filas descartadas en la hoja Entradas."
    return "Se descartaron " + entero(n) + " filas de la hoja Entradas sin mes legible."


def nota_atraso(ctx):
    if not ctx["mesAgenda"]:
        return ""
    fin = fin_de_mes(ctx["mesAgenda"])
    avisos = []
    for s in ["Sabana", "Heredia"]:
        corte = ctx["cortePorSede"][s]
        if not corte:
            avisos.append("el tracker de " + s + " no trae citas")
            continue
        if corte < fin:
            avisos.append("el tracker de " + s + " llega al " + fecha_larga(corte))
    if not avisos:
        return ""
    return "Mes incompleto: " + " y ".join(avisos) + ". "


FALTA_PAQUETES = " Falta la exportación CSV de la pestaña Paquetes (--paquetes-csv)."
FALTA_CLIENTES = (" Faltan las exportaciones CSV de la pestaña Registro "
                  "(--clientes-sabana-csv, --clientes-heredia-csv).")

# ============================== indicadores ==============================


def indicador_f1(ctx):
    base = {
        "id": "F1", "perspectiva": "financiera", "nombre": "Ingresos por sede",
        "definicion": "Ingresos facturados por sede, netos de IVA, sumados por mes; se reporta el mes y el acumulado del año",
        "fuente": "Estado de resultados mensual de la contadora, cargado en la hoja Entradas",
        "dueno": "René", "frecuencia": "Mensual",
        "meta": "Cierre 2026 entre ₡181M y ₡190M; 2027 entre ₡195M y ₡215M",
    }
    mes = ctx["mesFinanciero"]
    if not mes:
        return sin_linea_base(base, "La hoja Entradas no tiene ningún mes con ingresos.")
    serie = serie_entradas(ctx, ["ingresosSabana", "ingresosHeredia"])
    fila = ctx["entradas"]["porMes"][mes]
    sabana = fila["ingresosSabana"] or 0
    heredia = fila["ingresosHeredia"] or 0
    total = sabana + heredia
    anio = mes[:4]
    acu = {"sabana": 0, "heredia": 0, "meses": 0}
    for m in ctx["entradas"]["meses"]:
        if m[:4] != anio or m > mes:
            continue
        f = ctx["entradas"]["porMes"][m]
        if f["ingresosSabana"] is None and f["ingresosHeredia"] is None:
            continue
        acu["sabana"] += f["ingresosSabana"] or 0
        acu["heredia"] += f["ingresosHeredia"] or 0
        acu["meses"] += 1
    acumulado = acu["sabana"] + acu["heredia"]
    proyeccion = acumulado / acu["meses"] * 12 if acu["meses"] else 0
    estado = "rojo"
    if proyeccion >= METAS["F1_CIERRE_MIN"]:
        estado = "verde"
    elif proyeccion >= METAS["F1_CIERRE_AMARILLO"]:
        estado = "amarillo"
    base["estado"] = estado
    base["valor"] = millones(total)
    base["detalle"] = (nombre_mes_largo(mes) + ": Sabana " + millones(sabana) + ", Heredia " +
                       millones(heredia) + ". Acumulado del año " + millones(acumulado) + " en " +
                       str(acu["meses"]) + " " + ("mes" if acu["meses"] == 1 else "meses"))
    base["serie"] = {"unidad": "₡M", "meses": serie["meses"], "valores": {
        "Sabana": [a_millones(v) for v in serie["valores"]["ingresosSabana"]],
        "Heredia": [a_millones(v) for v in serie["valores"]["ingresosHeredia"]]}}
    base["nota"] = ("Proyección de cierre por promedio simple del año en curso: " + millones(proyeccion) +
                    ". " + nota_entradas(ctx))
    return base


def indicador_f2(ctx):
    base = {
        "id": "F2", "perspectiva": "financiera", "nombre": "Margen operativo",
        "definicion": "Resultado operativo entre ingresos, antes de depreciación, intereses e impuestos, por mes y acumulado; se calcula solo sobre meses con gastos completos",
        "fuente": "Estado de resultados mensual, cargado en la hoja Entradas",
        "dueno": "René", "frecuencia": "Mensual, lectura trimestral",
        "meta": "Positivo en el segundo semestre de 2026; margen normalizado ≥8% en 2027 sin el ingreso por vencimiento de paquetes",
    }
    meses = meses_con_gastos_completos(ctx)
    if not meses:
        return sin_linea_base(base, "Ningún mes de la hoja Entradas está marcado con gastos completos.")
    acumulado = {"ingresos": 0, "resultado": 0}
    serie_valores, serie_meses = [], []
    for m in ctx["mesesFinancieros"]:
        f = ctx["entradas"]["porMes"].get(m)
        serie_meses.append(m)
        if not f or not f["gastosCompletos"]:
            serie_valores.append(None)
            continue
        r = resultado_operativo(f)
        serie_valores.append(redondear(r["resultado"] / r["ingresos"] * 100, 1) if r["ingresos"] else None)
    for m in meses:
        r = resultado_operativo(ctx["entradas"]["porMes"][m])
        acumulado["ingresos"] += r["ingresos"]
        acumulado["resultado"] += r["resultado"]
    margen = acumulado["resultado"] / acumulado["ingresos"] if acumulado["ingresos"] else 0
    estado = "rojo"
    if margen >= METAS["F2_MARGEN_VERDE"]:
        estado = "verde"
    elif margen >= 0:
        estado = "amarillo"
    ultimo = meses[-1]
    ru = resultado_operativo(ctx["entradas"]["porMes"][ultimo])
    base["estado"] = estado
    base["valor"] = porcentaje(margen * 100)
    base["detalle"] = ("Acumulado sobre " + str(len(meses)) + " " + ("mes" if len(meses) == 1 else "meses") +
                       " con gastos completos (" + meses[0] + " a " + ultimo + "): " +
                       porcentaje(margen * 100) + " (" + millones(acumulado["resultado"]) + "). " +
                       nombre_mes_largo(ultimo) + ": " +
                       (porcentaje(ru["resultado"] / ru["ingresos"] * 100) if ru["ingresos"] else "sin dato"))
    if serie_meses:
        base["serie"] = {"unidad": "%", "meses": serie_meses, "valores": {"Margen": serie_valores}}
    base["nota"] = ("El estado de resultados no registra depreciación ni intereses del leasing. "
                    "El margen se lee con esa salvedad. Solo entran los meses marcados con gastos completos en la hoja Entradas. " +
                    nota_entradas(ctx))
    return base


def indicador_f4(ctx):
    base = {
        "id": "F4", "perspectiva": "financiera", "nombre": "Pasivo de sesiones prepagadas",
        "definicion": "Paquetes vendidos menos sesiones entregadas, valorado al precio pagado, neto de IVA; se reporta el total y la parte de pacientes con actividad en los últimos 90 días",
        "fuente": "Registro de paquetes y sesiones pendientes, alimentado por recepción",
        "dueno": "Recepción de cada sede, con René como revisor", "frecuencia": "Mensual",
        "meta": "Que el pasivo no crezca más rápido que la venta de paquetes. En 2027, redención ≥85% a los 180 días de los paquetes vendidos cada mes, en ambas sedes",
    }
    if not ctx["pasivo"]["disponible"] or not ctx["pasivo"]["filas"]:
        motivo = "No se pudo leer el registro de paquetes y sesiones pendientes."
        if not ctx["pasivo"]["disponible"]:
            motivo += FALTA_PAQUETES
        return sin_linea_base(base, motivo)
    activos = pacientes_activos(ctx)
    total = activo = pend_total = pend_activo = 0
    por_sede = {}
    for f in ctx["pasivo"]["filas"]:
        if not f["pendientes"]:
            continue
        total += f["diferido"]
        pend_total += f["pendientes"]
        sede = f["sede"] or "Sin sede"
        por_sede[sede] = por_sede.get(sede, 0) + f["diferido"]
        corte = ctx["cortePorSede"].get(f["sede"]) or ctx["corteAgenda"] or date.today()
        reciente = f["ultimaSesion"] and dias_entre(f["ultimaSesion"], corte) <= DIAS_INACTIVIDAD
        if reciente or pasivo_activo(f, activos):
            activo += f["diferido"]
            pend_activo += f["pendientes"]
    ctx["_f4Activo"] = activo
    anterior = ctx["historial"].get("F4")
    estado = "amarillo"
    if anterior and anterior.get("mes") != ctx["mesAgenda"] and anterior.get("valor", 0) > 0:
        variacion = (activo - anterior["valor"]) / anterior["valor"]
        estado = "verde" if variacion <= 0 else ("amarillo" if variacion <= 0.10 else "rojo")
    detalle_sedes = ", ".join(s + " " + millones(por_sede[s]) for s in sorted(por_sede))
    base["estado"] = estado
    base["valor"] = millones(activo)
    base["detalle"] = ("Pacientes con actividad en los últimos " + str(DIAS_INACTIVIDAD) + " días " +
                       millones(activo) + " (" + entero(pend_activo) + " sesiones). Histórico " +
                       millones(total) + " (" + entero(pend_total) + " sesiones)" +
                       (". Por sede: " + detalle_sedes if detalle_sedes else ""))
    base["nota"] = ("Las filas en ₡0 del tracker se toman como canjes de paquete. " +
                    ("Mes anterior: " + millones(anterior["valor"]) + ". " if anterior else
                     "Sin mes anterior guardado, el estado queda en amarillo hasta la segunda corrida. ") +
                    incidencia("filas del registro sin sesiones ni monto legibles", ctx["pasivo"]["ilegibles"]))
    return base


def indicador_f5(ctx):
    base = {
        "id": "F5", "perspectiva": "financiera", "nombre": "Colchón de caja",
        "definicion": "Saldo en bancos al cierre de mes dividido entre el gasto operativo mensual promedio de los últimos seis meses, en meses",
        "fuente": "Balance mensual y estado de resultados, cargados en la hoja Entradas",
        "dueno": "René", "frecuencia": "Mensual",
        "meta": "Dos meses de gasto operativo a mitad de 2027. Si la caja cierra un mes debajo de ₡12M se activa el plan de repliegue",
    }
    mes = ctx["mesFinanciero"]
    fila = ctx["entradas"]["porMes"].get(mes) if mes else None
    if not fila or fila["cajaCierre"] is None:
        return sin_linea_base(base, "La hoja Entradas no trae saldo de caja al cierre del último mes.")
    gastos = []
    for m in [m for m in ctx["entradas"]["meses"] if m <= mes][-6:]:
        f = ctx["entradas"]["porMes"][m]
        g = (f["gastosOperativos"] or 0) + (f["costoVentas"] or 0)
        if g > 0:
            gastos.append(g)
    if not gastos:
        return sin_linea_base(base, "La hoja Entradas no trae gastos para calcular el promedio mensual.")
    promedio = sum(gastos) / len(gastos)
    colchon = fila["cajaCierre"] / promedio if promedio else 0
    estado = "rojo"
    if colchon >= METAS["F5_MESES_VERDE"]:
        estado = "verde"
    elif colchon >= METAS["F5_MESES_AMARILLO"]:
        estado = "amarillo"
    if fila["cajaCierre"] < METAS["F5_CAJA_REPLIEGUE"]:
        estado = "rojo"
    serie = serie_entradas(ctx, ["cajaCierre"])
    base["estado"] = estado
    base["valor"] = decimal_(colchon, 2) + " meses"
    base["detalle"] = ("Al " + fecha_larga(fin_de_mes(mes)) + ": " + millones(fila["cajaCierre"]) +
                       " de caja entre " + millones(promedio) + " de gasto mensual promedio de los últimos " +
                       str(len(gastos)) + " meses")
    base["serie"] = {"unidad": "₡M", "meses": serie["meses"],
                     "valores": {"Caja": [a_millones(v) for v in serie["valores"]["cajaCierre"]]}}
    base["nota"] = ("El gasto mensual promedio es gastos operativos más costo de ventas. " +
                    ("La caja cerró debajo de ₡12M: corresponde activar el plan de repliegue. "
                     if fila["cajaCierre"] < METAS["F5_CAJA_REPLIEGUE"] else "") + nota_entradas(ctx))
    return base


def indicador_f6(ctx):
    base = {
        "id": "F6", "perspectiva": "financiera", "nombre": "Punto de equilibrio por sede",
        "definicion": "Ingreso mensual por sede necesario para cubrir sus costos directos, con los honorarios de Carolina asignados 23,7% a Heredia como línea de ajuste sobre el estado que entrega la contadora",
        "fuente": "Estado mensual por sede de la contadora más el ajuste de honorarios, cargado en la hoja Entradas",
        "dueno": "René", "frecuencia": "Mensual",
        "meta": "Cada sede cubre sus costos directos; Heredia sostenido tres meses seguidos antes de la decisión de enero de 2027",
    }
    mes = ctx["mesFinanciero"]
    fila = ctx["entradas"]["porMes"].get(mes) if mes else None
    if not fila or fila["costosDirectosSabana"] is None or fila["costosDirectosHeredia"] is None:
        return sin_linea_base(base, "Por instalar. Arranca con el primer estado mensual por sede en la hoja Entradas.")
    sedes = [{"nombre": "Sabana", "ingreso": fila["ingresosSabana"] or 0, "costo": fila["costosDirectosSabana"]},
             {"nombre": "Heredia", "ingreso": fila["ingresosHeredia"] or 0, "costo": fila["costosDirectosHeredia"]}]
    cubren = sum(1 for s in sedes if s["ingreso"] >= s["costo"])
    estado = "verde" if cubren == 2 else ("amarillo" if cubren == 1 else "rojo")
    seguidos = 0
    for m in reversed(ctx["entradas"]["meses"]):
        if m > mes:
            continue
        f = ctx["entradas"]["porMes"][m]
        if f["costosDirectosHeredia"] is None:
            break
        if (f["ingresosHeredia"] or 0) >= f["costosDirectosHeredia"]:
            seguidos += 1
        else:
            break
    base["estado"] = estado
    base["valor"] = ", ".join(s["nombre"] + " " + ("cubre" if s["ingreso"] >= s["costo"] else "no cubre") for s in sedes)
    base["detalle"] = (nombre_mes_largo(mes) + ": Sabana ingreso " + millones(sedes[0]["ingreso"]) +
                       " contra costos directos " + millones(sedes[0]["costo"]) + "; Heredia ingreso " +
                       millones(sedes[1]["ingreso"]) + " contra " + millones(sedes[1]["costo"]) +
                       ". Heredia lleva " + str(seguidos) + " " +
                       ("mes seguido" if seguidos == 1 else "meses seguidos") + " cubriendo")
    s = serie_entradas(ctx, ["ingresosHeredia", "costosDirectosHeredia"])
    base["serie"] = {"unidad": "₡M", "meses": s["meses"], "valores": {
        "Heredia ingreso": [a_millones(v) for v in s["valores"]["ingresosHeredia"]],
        "Heredia costos directos": [a_millones(v) for v in s["valores"]["costosDirectosHeredia"]]}}
    base["nota"] = "Los costos directos de Heredia incluyen el 23,7% de los honorarios de Carolina. " + nota_entradas(ctx)
    return base


def indicador_c1(ctx):
    base = {
        "id": "C1", "perspectiva": "clientes", "nombre": "Satisfacción del cliente",
        "definicion": "Encuesta de una pregunta por WhatsApp después de la cita, calificación de 0 a 10; se reporta el promedio y el número de respuestas",
        "fuente": "Encuesta por WhatsApp de cada sede, resumida en la hoja Entradas",
        "dueno": "Recepción de cada sede", "frecuencia": "Mensual",
        "meta": "Promedio superior a 7,5 con al menos 30 respuestas al mes",
    }
    mes = ultimo_mes_con(ctx, "c1Promedio")
    if not mes:
        return sin_linea_base(base, "Por instalar. Arranca en el cuarto trimestre de 2026, después del piloto de avance clínico.")
    fila = ctx["entradas"]["porMes"][mes]
    promedio = fila["c1Promedio"]
    respuestas = fila["c1Respuestas"] or 0
    estado = "rojo"
    if promedio >= METAS["C1_PROMEDIO"] and respuestas >= METAS["C1_RESPUESTAS"]:
        estado = "verde"
    elif promedio >= METAS["C1_PROMEDIO"] or respuestas >= METAS["C1_RESPUESTAS"]:
        estado = "amarillo"
    serie = serie_entradas(ctx, ["c1Promedio", "c1Respuestas"])
    base["estado"] = estado
    base["valor"] = decimal_(promedio, 1)
    base["detalle"] = nombre_mes_largo(mes) + ": promedio " + decimal_(promedio, 1) + " sobre " + entero(respuestas) + " respuestas"
    base["serie"] = {"unidad": "puntos", "meses": serie["meses"], "valores": {
        "Promedio": serie["valores"]["c1Promedio"], "Respuestas": serie["valores"]["c1Respuestas"]}}
    base["nota"] = nota_entradas(ctx)
    return base


def indicador_c2(ctx):
    base = {
        "id": "C2", "perspectiva": "clientes", "nombre": "Clientes nuevos y su origen",
        "definicion": "Conteo de clientes nuevos por mes y por sede, y proporción con origen registrado en el campo de dos partes (canal cerrado; clínica y doctor si es referencia veterinaria)",
        "fuente": "Registro de clientes nuevos de cada sede",
        "dueno": "Recepción de cada sede", "frecuencia": "Mensual",
        "meta": "Origen registrado en más del 90% de los clientes nuevos; nombre del referidor en más del 90% de las referencias veterinarias",
    }
    cn = ctx["clientesNuevos"]
    if not cn["disponible"]:
        return sin_linea_base(base, "No se pudieron abrir los registros de clientes nuevos." + FALTA_CLIENTES)
    mes = ctx["mesAgenda"]
    del_mes = [f for f in cn["filas"] if f["mes"] == mes]
    if not del_mes:
        return sin_linea_base(base, "Por instalar la captura de dos partes. El registro no trae filas con fecha en " +
                              (mes or "el mes de corte") + ". Filas fechadas en total: " + entero(len(cn["filas"])) + ". " +
                              incidencia("filas sin fecha de registro", cn["ilegibles"]))
    con_canal = sum(1 for f in del_mes if f["conCanal"])
    referencias = [f for f in del_mes if f["esReferencia"]]
    con_ref = sum(1 for f in referencias if f["conReferidor"])
    prop = con_canal / len(del_mes)
    prop_ref = con_ref / len(referencias) if referencias else 1
    estado = "rojo"
    if prop > METAS["C2_ORIGEN"] and prop_ref > METAS["C2_REFERIDOR"]:
        estado = "verde"
    elif prop >= 0.70:
        estado = "amarillo"
    por_sede = {}
    for f in del_mes:
        por_sede[f["sede"]] = por_sede.get(f["sede"], 0) + 1
    serie = serie_clientes_nuevos(ctx)
    base["estado"] = estado
    base["valor"] = entero(len(del_mes)) + " clientes"
    base["detalle"] = (nombre_mes_largo(mes) + ": " +
                       ", ".join(s + " " + entero(por_sede.get(s, 0)) for s in ["Sabana", "Heredia"]) +
                       ". Origen registrado en " + porcentaje(prop * 100) + ". Referencias veterinarias " +
                       entero(len(referencias)) + ", con nombre del referidor " + entero(con_ref))
    base["serie"] = {"unidad": "clientes", "meses": serie["meses"], "valores": serie["valores"]}
    base["nota"] = incidencia("filas del registro sin fecha legible", cn["ilegibles"])
    return base


def indicador_c4(ctx):
    base = {
        "id": "C4", "perspectiva": "clientes", "nombre": "Renovación de paquetes",
        "definicion": "Clientes que agotaron un paquete en el mes y compraron otro dentro de los 30 días siguientes, entre el total que agotó",
        "fuente": "Registro de paquetes y sesiones pendientes, con la fecha de compra de cada paquete",
        "dueno": "Recepción de cada sede", "frecuencia": "Mensual",
        "meta": "Meta fijada después de un trimestre con fecha de compra registrada",
    }
    p = ctx["pasivo"]
    if not p["disponible"] or not p["tieneFechaVenta"]:
        motivo = "Por instalar: requiere la columna de fecha de venta llena en el registro de paquetes y sesiones pendientes."
        if not p["disponible"]:
            motivo += FALTA_PAQUETES
        return sin_linea_base(base, motivo)
    mes = ctx["mesAgenda"]
    agotados = [f for f in p["filas"] if f["pendientes"] == 0 and f["ultimaSesion"] and clave_mes(f["ultimaSesion"]) == mes]
    if not agotados:
        return sin_linea_base(base, "Ningún paquete quedó agotado en " + (mes or "el mes de corte") +
                              " según el registro. La meta se fija después de un trimestre con fecha de compra registrada.")
    compras = [f for f in p["filas"] if f["fechaVenta"]]

    def renovo(a):
        for c in compras:
            if c["paciente"] != a["paciente"]:
                continue
            d = dias_entre(a["ultimaSesion"], c["fechaVenta"])
            if 0 < d <= DIAS_RENOVACION:
                return True
        return False
    renovaron = sum(1 for a in agotados if renovo(a))
    prop = renovaron / len(agotados)
    base["estado"] = "sin_linea_base"
    base["valor"] = porcentaje(prop * 100)
    base["detalle"] = (nombre_mes_largo(mes) + ": " + entero(renovaron) + " de " + entero(len(agotados)) +
                       " clientes que agotaron paquete compraron otro dentro de " + str(DIAS_RENOVACION) + " días")
    base["nota"] = ("La cifra ya se calcula, pero la meta se fija después de un trimestre completo con fecha de compra registrada. "
                    "Filas con fecha de venta: " + entero(p["conFechaVenta"]) + " de " + entero(len(p["filas"])) + ". " +
                    incidencia("filas del registro sin sesiones ni monto legibles", p["ilegibles"]))
    return base


def indicador_c5(ctx):
    base = {
        "id": "C5", "perspectiva": "clientes", "nombre": "Pacientes inactivos",
        "definicion": "Pacientes con al menos una cita y ninguna en los últimos 90 días, por sede; se reporta aparte el grupo con una sola cita en su historia",
        "fuente": "Trackers de citas", "dueno": "Recepción de cada sede", "frecuencia": "Mensual",
        "meta": "Que el conteo de cada sede baje respecto del mes anterior y que la lista se trabaje cada mes con la ficha del paciente enfrente",
    }
    if not ctx["citas"]:
        return sin_linea_base(base, "No se pudo leer ningún tracker de citas.")
    resumen = {}
    for sede in ["Sabana", "Heredia"]:
        corte = ctx["cortePorSede"][sede] or ctx["corteAgenda"]
        por_paciente = {}
        for c in ctx["citas"]:
            if c["sede"] != sede or not c["paciente"]:
                continue
            p = por_paciente.get(c["paciente"])
            if not p:
                por_paciente[c["paciente"]] = {"n": 1, "ultima": c["fecha"]}
                continue
            p["n"] += 1
            if c["fecha"] > p["ultima"]:
                p["ultima"] = c["fecha"]
        total = inactivos = una = 0
        for p in por_paciente.values():
            total += 1
            if dias_entre(p["ultima"], corte) > DIAS_INACTIVIDAD:
                inactivos += 1
                if p["n"] == 1:
                    una += 1
        resumen[sede] = {"total": total, "inactivos": inactivos, "unaSola": una}
    total_inactivos = resumen["Sabana"]["inactivos"] + resumen["Heredia"]["inactivos"]
    ctx["_c5Total"] = total_inactivos
    anterior = ctx["historial"].get("C5")
    estado = "amarillo"
    if anterior and anterior.get("mes") != ctx["mesAgenda"] and anterior.get("valor", 0) > 0:
        if total_inactivos < anterior["valor"]:
            estado = "verde"
        elif total_inactivos <= anterior["valor"] * 1.05:
            estado = "amarillo"
        else:
            estado = "rojo"
    base["estado"] = estado
    base["valor"] = entero(total_inactivos) + " pacientes"
    base["detalle"] = "; ".join(
        s + " " + entero(r["inactivos"]) + " de " + entero(r["total"]) + " (" +
        porcentaje(r["inactivos"] / r["total"] * 100 if r["total"] else 0) + "), con una sola cita " + entero(r["unaSola"])
        for s, r in ((s, resumen[s]) for s in ["Sabana", "Heredia"]))
    base["nota"] = ("Ventana de " + str(DIAS_INACTIVIDAD) + " días contra la última fecha de cada tracker. "
                    "La identidad del paciente usa el código de Qvet cuando existe y el nombre normalizado cuando falta. "
                    "El conteo es una lista de trabajo para recepción, no una medida de deserción: incluye pacientes que terminaron su tratamiento y pacientes fallecidos sin marcar. " +
                    ("Mes anterior: " + entero(anterior["valor"]) + ". " if anterior else "Sin mes anterior guardado. ") +
                    incidencias_tracker(ctx))
    return base


def indicador_p1(ctx):
    base = {
        "id": "P1", "perspectiva": "procesos", "nombre": "Citas por mes por sede",
        "definicion": "Citas atendidas por mes en cada sede, sin ventas de productos",
        "fuente": "Trackers de citas y Qvet", "dueno": "Recepción Sabana y recepción Heredia", "frecuencia": "Mensual",
        "meta": "Sabana 315 al mes (nivel del segundo semestre de 2025); Heredia creciendo sobre 140",
    }
    if not ctx["citas"]:
        return sin_linea_base(base, "No se pudo leer ningún tracker de citas.")
    serie = serie_citas(ctx, lambda c: True)
    mes = ctx["mesAgenda"]
    sab, her = serie["ultimo"]["Sabana"], serie["ultimo"]["Heredia"]
    estado = estado_por_sede([sab, her], [METAS["P1_SABANA"], METAS["P1_HEREDIA"]])
    if not estado:
        return sin_linea_base(base, "Ningún tracker cubre " + nombre_mes_largo(mes) + ".")
    base["estado"] = estado
    base["valor"] = entero((sab or 0) + (her or 0)) + " citas"
    base["detalle"] = (nombre_mes_largo(mes) + ": Sabana " + entero(sab) + " (meta " + str(METAS["P1_SABANA"]) +
                       "), Heredia " + entero(her) + " (meta " + str(METAS["P1_HEREDIA"]) + ")")
    base["serie"] = {"unidad": "citas", "meses": serie["meses"], "valores": serie["valores"]}
    base["nota"] = ("Solo entran las filas con tipo de cita. Las ventas de producto no traen tipo y quedan fuera. "
                    "Se informa el último mes cerrado, no el mes en curso. " + nota_atraso(ctx) + incidencias_tracker(ctx))
    return base


def indicador_p2(ctx):
    base = {
        "id": "P2", "perspectiva": "procesos", "nombre": "Domicilios por mes",
        "definicion": "Citas de tipo domicilio por mes y por sede",
        "fuente": "Trackers de citas", "dueno": "Recepción de cada sede", "frecuencia": "Mensual",
        "meta": "Sabana alrededor de 70 al mes; Heredia sobre 10",
    }
    if not ctx["citas"]:
        return sin_linea_base(base, "No se pudo leer ningún tracker de citas.")
    serie = serie_citas(ctx, es_domicilio)
    mes = ctx["mesAgenda"]
    sab, her = serie["ultimo"]["Sabana"], serie["ultimo"]["Heredia"]
    estado = estado_por_sede([sab, her], [METAS["P2_SABANA"], METAS["P2_HEREDIA"]])
    if not estado:
        return sin_linea_base(base, "Ningún tracker cubre " + nombre_mes_largo(mes) + ".")
    base["estado"] = estado
    base["valor"] = entero((sab or 0) + (her or 0)) + " domicilios"
    base["detalle"] = (nombre_mes_largo(mes) + ": Sabana " + entero(sab) + " (meta " + str(METAS["P2_SABANA"]) +
                       "), Heredia " + entero(her) + " (meta " + str(METAS["P2_HEREDIA"]) + ")")
    base["serie"] = {"unidad": "domicilios", "meses": serie["meses"], "valores": serie["valores"]}
    base["nota"] = ("Las filas de domicilio del tracker traen el ingreso bruto de IVA, a diferencia de las de clínica. "
                    "Ese detalle no afecta este conteo. " + nota_atraso(ctx) + incidencias_tracker(ctx))
    return base


def indicador_p3(ctx):
    base = {
        "id": "P3", "perspectiva": "procesos", "nombre": "Cancelaciones y no presentaciones",
        "definicion": "Citas canceladas o no presentadas sobre el total agendado, por sede",
        "fuente": "Columna de estado del tracker", "dueno": "Recepción de cada sede", "frecuencia": "Mensual",
        "meta": "Meta después de un trimestre completo de medición",
    }
    if not ctx["tieneEstado"]:
        return sin_linea_base(base, "Por instalar. Arranca en octubre de 2026, cuando los trackers lleven la columna de estado de la cita.")
    mes = ctx["mesAgenda"]
    por_sede, con_estado = {}, 0
    for c in ctx["citas"]:
        if c["mes"] != mes:
            continue
        r = por_sede.setdefault(c["sede"], {"total": 0, "perdidas": 0, "sinEstado": 0})
        r["total"] += 1
        if not c["estado"]:
            r["sinEstado"] += 1
            continue
        con_estado += 1
        if es_cancelada(c["estado"]):
            r["perdidas"] += 1
    if not con_estado:
        return sin_linea_base(base, "La columna de estado existe pero está vacía en " + (mes or "el mes de corte") + ".")
    total = sum(r["total"] for r in por_sede.values())
    perdidas = sum(r["perdidas"] for r in por_sede.values())
    sin_estado = sum(r["sinEstado"] for r in por_sede.values())
    prop = perdidas / total if total else 0
    base["estado"] = "sin_linea_base"
    base["valor"] = porcentaje(prop * 100)
    base["detalle"] = (nombre_mes_largo(mes) + ": " + entero(perdidas) + " de " + entero(total) + " citas agendadas. " +
                       ", ".join(s + " " + porcentaje(por_sede[s]["perdidas"] / por_sede[s]["total"] * 100 if por_sede[s]["total"] else 0)
                                 for s in ["Sabana", "Heredia"] if s in por_sede))
    base["nota"] = ("La cifra ya se calcula, pero la meta se fija después de un trimestre completo de medición. " +
                    incidencia("citas del mes sin estado anotado", sin_estado))
    return base


def indicador_p5(ctx):
    base = {
        "id": "P5", "perspectiva": "procesos", "nombre": "Ocupación de agenda",
        "definicion": "Sesiones realizadas entre los espacios disponibles del mes, por sede y por bloque (mañana y tarde)",
        "fuente": "Trackers de citas más la capacidad de espacios definida con recepción",
        "dueno": "Recepción de cada sede", "frecuencia": "Mensual",
        "meta": "Meta después de un trimestre de medición",
    }
    mes = ctx["mesAgenda"]
    fila = ctx["entradas"]["porMes"].get(mes) if mes else None
    if not fila or fila["p5EspaciosSabana"] is None or fila["p5EspaciosHeredia"] is None:
        return sin_linea_base(base, "Por instalar. Requiere los espacios disponibles del mes por sede en la hoja Entradas.")
    realizadas = {"Sabana": 0, "Heredia": 0}
    for c in ctx["citas"]:
        if c["mes"] != mes or es_domicilio(c) or c["sede"] not in realizadas:
            continue
        realizadas[c["sede"]] += 1
    espacios = {"Sabana": fila["p5EspaciosSabana"], "Heredia": fila["p5EspaciosHeredia"]}
    ocup = {s: (realizadas[s] / espacios[s] if espacios[s] else None) for s in ["Sabana", "Heredia"]}
    total = espacios["Sabana"] + espacios["Heredia"]
    glob = (realizadas["Sabana"] + realizadas["Heredia"]) / total if total else 0
    base["estado"] = "sin_linea_base"
    base["valor"] = porcentaje(glob * 100)
    base["detalle"] = (nombre_mes_largo(mes) + ": " + ", ".join(
        s + " " + entero(realizadas[s]) + " de " + entero(espacios[s]) + " espacios (" +
        ("sin capacidad definida" if ocup[s] is None else porcentaje(ocup[s] * 100)) + ")"
        for s in ["Sabana", "Heredia"]))
    base["nota"] = ("Cuenta las citas de clínica; los domicilios quedan fuera porque no ocupan espacio de sede. "
                    "La meta se fija después de un trimestre de medición. " + nota_atraso(ctx) + incidencias_tracker(ctx))
    return base


def indicador_e1(ctx):
    base = {
        "id": "E1", "perspectiva": "equipo", "nombre": "Carga clínica de Carolina",
        "definicion": "Porcentaje de las citas de la empresa que atiende ella, más el conteo de sus domicilios",
        "fuente": "Trackers de citas", "dueno": "René", "frecuencia": "Mensual",
        "meta": "Tope de 20%. La cifra se mantiene o baja; cuatro horas semanales protegidas para estrategia",
    }
    if not ctx["citas"]:
        return sin_linea_base(base, "No se pudo leer ningún tracker de citas.")
    mes = ctx["mesAgenda"]
    total = suyas = domicilios = 0
    sab = {"total": 0, "suyas": 0}
    for c in ctx["citas"]:
        if c["mes"] != mes:
            continue
        total += 1
        if c["sede"] == "Sabana":
            sab["total"] += 1
        if not es_carolina(c["doctor"]):
            continue
        suyas += 1
        if c["sede"] == "Sabana":
            sab["suyas"] += 1
        if es_domicilio(c):
            domicilios += 1
    if not total:
        return sin_linea_base(base, "El tracker no trae citas en " + (mes or "el mes de corte") + ".")
    prop = suyas / total
    estado = "rojo"
    if prop <= METAS["E1_TOPE"]:
        estado = "verde"
    elif prop <= METAS["E1_ROJO"]:
        estado = "amarillo"
    serie = serie_carolina(ctx)
    base["estado"] = estado
    base["valor"] = porcentaje(prop * 100)
    base["detalle"] = (nombre_mes_largo(mes) + ": " + entero(suyas) + " de " + entero(total) +
                       " citas de la empresa (" + porcentaje(prop * 100) + "), de las cuales " +
                       entero(domicilios) + " domicilios. En Sabana " + entero(sab["suyas"]) + " de " +
                       entero(sab["total"]) + " (" + porcentaje(sab["suyas"] / sab["total"] * 100 if sab["total"] else 0) + ")")
    base["serie"] = {"unidad": "%", "meses": serie["meses"], "valores": serie["valores"]}
    base["nota"] = ("La atribución sale de la columna de doctora del tracker, que solo identifica a Carolina de forma confiable. "
                    "Se agrupan las variantes de escritura del nombre. " + nota_atraso(ctx) + incidencias_tracker(ctx))
    return base


def indicador_e2(ctx):
    base = {
        "id": "E2", "perspectiva": "equipo", "nombre": "Estabilidad del equipo",
        "definicion": "Altas y bajas de personal por trimestre sobre la planilla base",
        "fuente": "Planilla mensual, resumida en la hoja Entradas", "dueno": "Carolina", "frecuencia": "Trimestral",
        "meta": "Rotación voluntaria cero en el semestre",
    }
    mes = ultimo_mes_con(ctx, "e2PlanillaBase")
    if not mes:
        return sin_linea_base(base, "La hoja Entradas no trae la planilla base de ningún mes.")
    altas = bajas = vol = con_dato = 0
    for m in ultimos_meses(fin_de_mes(mes), 3):
        f = ctx["entradas"]["porMes"].get(m)
        if not f:
            continue
        if f["e2Altas"] is None and f["e2Bajas"] is None and f["e2BajasVoluntarias"] is None:
            continue
        con_dato += 1
        altas += f["e2Altas"] or 0
        bajas += f["e2Bajas"] or 0
        vol += f["e2BajasVoluntarias"] or 0
    planilla = ctx["entradas"]["porMes"][mes]["e2PlanillaBase"]
    estado = "verde"
    if vol == 1:
        estado = "amarillo"
    elif vol >= 2:
        estado = "rojo"
    base["estado"] = estado
    base["valor"] = entero(planilla) + " personas"
    base["detalle"] = ("Trimestre a " + nombre_mes_largo(mes) + ": planilla base " + entero(planilla) +
                       ", altas " + entero(altas) + ", bajas " + entero(bajas) + ", de ellas voluntarias " + entero(vol))
    base["nota"] = ("Se acumulan los tres meses del trimestre que cierra en el mes leído. "
                    "Meses del trimestre con dato cargado: " + str(con_dato) + " de 3. " + nota_entradas(ctx))
    return base


# ============================ armado y validación ============================


def construir_paquete(ctx):
    indicadores = [f(ctx) for f in (
        indicador_f1, indicador_f2, indicador_f4, indicador_f5, indicador_f6,
        indicador_c1, indicador_c2, indicador_c4, indicador_c5,
        indicador_p1, indicador_p2, indicador_p3, indicador_p5,
        indicador_e1, indicador_e2)]
    return {
        "version": VERSION_CONTRATO,
        "generado": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "corte": {
            "financiero": fecha_iso(fin_de_mes(ctx["mesFinanciero"])) if ctx["mesFinanciero"] else None,
            "agenda": fecha_iso(ctx["corteAgenda"]) if ctx["corteAgenda"] else None,
        },
        "indicadores": indicadores,
    }


def validar_paquete(p):
    """validarPaquete_ de Code.gs. Lanza si falla."""
    errores = []
    if p["version"] != VERSION_CONTRATO:
        errores.append("version incorrecta")
    if not re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$", p["generado"]):
        errores.append("generado no es un ISO UTC válido")
    if not p.get("corte"):
        errores.append("falta el bloque corte")
    vistos = set()
    for i, ind in enumerate(p["indicadores"]):
        donde = "indicador " + (ind.get("id") or "#" + str(i))
        if ind.get("id") not in IDS_ESPERADOS:
            errores.append(donde + ": id desconocido")
            continue
        if ind["id"] in vistos:
            errores.append(donde + ": repetido")
        vistos.add(ind["id"])
        if ind.get("perspectiva") not in PERSPECTIVAS:
            errores.append(donde + ": perspectiva inválida")
        if ind.get("estado") not in ESTADOS:
            errores.append(donde + ': estado inválido "' + str(ind.get("estado")) + '"')
        for campo in ["nombre", "definicion", "fuente", "dueno", "frecuencia", "meta", "valor", "detalle"]:
            if not ind.get(campo) and ind.get(campo) != 0:
                errores.append(donde + ": falta " + campo)
        if ind.get("serie"):
            if not ind["serie"].get("meses"):
                errores.append(donde + ": serie sin meses")
            for nombre, arr in (ind["serie"].get("valores") or {}).items():
                if len(arr) != len(ind["serie"]["meses"]):
                    errores.append(donde + ': la serie "' + nombre + '" no coincide con los meses')
    for id_ in IDS_ESPERADOS:
        if id_ not in vistos:
            errores.append("falta el indicador " + id_)
    if errores:
        raise SystemExit("El paquete no pasó la validación: " + "; ".join(errores))


def validar_como_worker(doc):
    """Las reglas de validate() en src/index.js. Devuelve la lista de problemas."""
    p = []
    if doc.get("version") != 1:
        p.append("version debe ser 1")
    corte = doc.get("corte")
    if not isinstance(corte, dict):
        p.append("falta corte")
    else:
        for k in ["financiero", "agenda"]:
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", corte.get(k) or ""):
                p.append("corte." + k + " inválido")
    pii = re.compile(r"nombre_cliente|paciente|telefono|teléfono|correo|cedula|cédula|lista", re.I)
    for ind in doc.get("indicadores", []):
        for k in ind:
            if pii.search(k) and k != "nombre":
                p.append(ind.get("id", "?") + ": campo no permitido " + k)
        s = ind.get("serie")
        if s is not None:
            for name, arr in s.get("valores", {}).items():
                if any(v is not None and not es_numero(v) for v in arr):
                    p.append(ind["id"] + ": serie " + name + " no numérica")
        for k in ["nombre", "definicion", "fuente", "dueno", "frecuencia", "meta", "valor", "detalle"]:
            if not isinstance(ind.get(k), str):
                p.append(ind.get("id", "?") + ": falta " + k)
    return p


def revisar_privacidad(texto, ctx):
    """Ningún nombre de cliente de los trackers puede aparecer en la salida."""
    salida = normalizar(texto)
    for c in ctx["citas"]:
        nombre = c["cliente"]
        if len(nombre) >= 8 and " " in nombre and nombre in salida:
            raise SystemExit("La salida contiene un nombre de cliente del tracker. No se publica.")


# =============================== historial ===============================


def leer_historial_archivo(ruta):
    if not ruta or not os.path.exists(ruta):
        return {}
    try:
        with open(ruta, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def guardar_historial(ruta, ctx, paquete):
    mes = ctx["mesAgenda"]
    if not mes or not ruta:
        return
    hist = leer_historial_archivo(ruta)
    por_id = {i["id"]: i for i in paquete["indicadores"]}
    if por_id["F4"]["estado"] != "sin_linea_base" and (not hist.get("F4") or hist["F4"].get("mes") != mes):
        hist["F4"] = {"mes": mes, "valor": ctx.get("_f4Activo") or 0}
    if por_id["C5"]["estado"] != "sin_linea_base" and (not hist.get("C5") or hist["C5"].get("mes") != mes):
        hist["C5"] = {"mes": mes, "valor": ctx.get("_c5Total") or 0}
    with open(ruta, "w", encoding="utf-8") as fh:
        json.dump(hist, fh, indent=2)


# ================================ publicar ================================


def publicar(texto):
    try:
        with open(TOKEN_PATH, encoding="utf-8") as fh:
            token = fh.read().strip()
    except OSError:
        raise SystemExit("No se pudo leer el token en cmi/.ingest-token.")
    if not token:
        raise SystemExit("El archivo cmi/.ingest-token está vacío.")
    req = urllib.request.Request(INGEST_URL, data=texto.encode("utf-8"), method="POST", headers={
        "Content-Type": "application/json", "Authorization": "Bearer " + token})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            codigo, cuerpo = r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        codigo, cuerpo = e.code, e.read().decode("utf-8", "replace")
    if codigo < 200 or codigo >= 300:
        raise SystemExit("El tablero respondió %d: %s" % (codigo, recortar(cuerpo, 300)))
    print("Publicado. Código %d. Respuesta: %s" % (codigo, recortar(cuerpo, 500)))


# =================================== CLI ===================================


def main(argv=None):
    ap = argparse.ArgumentParser(description="Alimentador local del CMI de VetRehab.")
    ap.add_argument("--tracker-sabana", help="Tracker de citas de Sabana (.xlsx)")
    ap.add_argument("--tracker-heredia", help="Tracker de citas de Heredia (.xlsx)")
    ap.add_argument("--entradas", help="Hoja Entradas (.csv, .json o .xlsx)")
    ap.add_argument("--dashboard-html", help="VetRehab_Dashboard_Financiero.html (objeto D)")
    ap.add_argument("--desde-mes", default=DESDE_DASHBOARD, help="Primer mes que se toma del tablero (AAAA-MM)")
    ap.add_argument("--paquetes-csv", help="CSV de la pestaña Paquetes del registro de paquetes")
    ap.add_argument("--clientes-sabana-csv", help="CSV de la pestaña Registro, clientes nuevos de Sabana")
    ap.add_argument("--clientes-heredia-csv", help="CSV de la pestaña Registro, clientes nuevos de Heredia")
    ap.add_argument("--historial", default=os.path.join(AQUI, "historial.json"),
                    help="Archivo con el valor del mes anterior de F4 y C5")
    ap.add_argument("--out", default="salida.json", help="Dónde escribir el JSON")
    ap.add_argument("--escribir-plantilla", metavar="CSV",
                    help="Escribe la hoja Entradas que se deriva del tablero y sale")
    modo = ap.add_mutually_exclusive_group()
    modo.add_argument("--dry-run", action="store_true", default=True, help="Solo escribe el JSON (por defecto)")
    modo.add_argument("--post", action="store_true", help="Además publica en " + INGEST_URL)
    args = ap.parse_args(argv)

    if args.escribir_plantilla:
        if not args.dashboard_html:
            ap.error("--escribir-plantilla requiere --dashboard-html")
        escribir_plantilla(args.escribir_plantilla, filas_desde_dashboard(leer_dashboard(args.dashboard_html), args.desde_mes))
        print("Plantilla escrita en " + args.escribir_plantilla)
        return

    ctx = leer_fuentes(args)
    paquete = construir_paquete(ctx)
    validar_paquete(paquete)
    texto = json.dumps(paquete, ensure_ascii=False, indent=2)
    revisar_privacidad(texto, ctx)

    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(texto + "\n")

    resumen = ", ".join(i["id"] + "=" + i["estado"] for i in paquete["indicadores"])
    print("JSON de %d indicadores en %s" % (len(paquete["indicadores"]), args.out))
    print("Corte: financiero %s, agenda %s. Mes de agenda %s." % (
        paquete["corte"]["financiero"], paquete["corte"]["agenda"], ctx["mesAgenda"]))
    print(resumen)
    if ctx["faltantes"]:
        print("Fuentes no entregadas: " + ", ".join(ctx["faltantes"]))

    problemas = validar_como_worker(paquete)
    if problemas:
        print("El tablero rechazaría este JSON: " + "; ".join(problemas), file=sys.stderr)

    if args.post:
        if problemas:
            raise SystemExit("No se publica.")
        publicar(texto)
        guardar_historial(args.historial, ctx, paquete)


if __name__ == "__main__":
    main()
