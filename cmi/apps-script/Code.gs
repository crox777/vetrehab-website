/**
 * FOVET Rehabilitación Veterinaria S.A.
 * Code.gs
 *
 * Arma el archivo de datos del Cuadro de Mando Integral (CMI) y lo envía al
 * tablero. Lee las hojas de cálculo que ya llevan recepción y René, calcula los
 * quince indicadores de `VetRehab_CMI_v3.md`, valida el resultado y lo publica
 * con una llamada HTTPS.
 *
 * Qué hace en cada corrida:
 *   1. Abre los dos trackers de citas, el registro del pasivo prepagado, los dos
 *      registros de clientes nuevos y la hoja "Entradas".
 *   2. Calcula P1, P2, P3, P5, E1, C5, C2, F4 y C4 desde esas hojas.
 *   3. Lee F1, F2, F5, F6, C1 y E2 de la hoja "Entradas".
 *   4. Arma el JSON del CMI, lo valida y lo manda a CMI_INGEST_URL.
 *
 * Qué NO hace: no escribe en las hojas, no envía correo, no borra nada y no
 * pone ningún dato personal en la salida. El JSON lleva solo conteos, sumas y
 * porcentajes. Nunca nombres de clientes, de pacientes ni teléfonos.
 *
 * ---------------------------------------------------------------------------
 * INSTALACIÓN (una sola vez, desde la cuenta rene@vetrehab.cr)
 * ---------------------------------------------------------------------------
 * 1. Ir a https://script.google.com, "Nuevo proyecto", nombrarlo "FOVET CMI".
 * 2. Renombrar "Código.gs" a "Code.gs" y pegar este archivo.
 * 3. Configuración del proyecto > Propiedades del script, agregar:
 *
 *      SHEET_TRACKER_SABANA            ID de la hoja del tracker de Sabana
 *      SHEET_TRACKER_HEREDIA           ID de la hoja del tracker de Heredia
 *      SHEET_PASIVO                    ID del registro del pasivo prepagado
 *      SHEET_CLIENTES_NUEVOS_SABANA    ID del registro de clientes nuevos Sabana
 *      SHEET_CLIENTES_NUEVOS_HEREDIA   ID del registro de clientes nuevos Heredia
 *      SHEET_ENTRADAS_FINANCIERAS      ID de la hoja "Entradas"
 *      CMI_INGEST_URL                  https://cmi.vetrehab.cr/ingest
 *      CMI_INGEST_TOKEN                el token que entrega el tablero
 *
 *    El ID de una hoja es lo que va entre /d/ y /edit en su dirección.
 * 4. Ejecutar dryRun(). Google pide autorización la primera vez: aceptar con
 *    rene@vetrehab.cr. Revisar el registro de ejecución: imprime el JSON
 *    completo y no manda nada.
 * 5. Ejecutar run() una vez a mano y revisar que el tablero responda 200.
 * 6. Ejecutar crearDisparador() una sola vez. Queda una corrida diaria, entre
 *    3 y 4 a. m. Para quitarlo, borrarDisparadores().
 *
 * El detalle de la hoja "Entradas" y de las columnas que cada tracker debe
 * tener está en README.md, en esta misma carpeta.
 */

/* =============================== ajustes =============================== */

/** Versión del contrato de datos que espera el tablero. */
var VERSION_CONTRATO = 1;

var ZONA = 'America/Costa_Rica';

/** Meses que se incluyen en las series. */
var MESES_SERIE = 13;

/** Ventana de inactividad de C5, en días. */
var DIAS_INACTIVIDAD = 90;

/** Ventana de renovación de C4, en días. */
var DIAS_RENOVACION = 30;

/** Estados válidos. El validador rechaza cualquier otro. */
var ESTADOS = ['verde', 'amarillo', 'rojo', 'sin_linea_base'];

var PERSPECTIVAS = ['financiera', 'clientes', 'procesos', 'equipo'];

var IDS_ESPERADOS = [
  'F1', 'F2', 'F4', 'F5', 'F6',
  'C1', 'C2', 'C4', 'C5',
  'P1', 'P2', 'P3', 'P5',
  'E1', 'E2'
];

/** Metas numéricas, tomadas de VetRehab_CMI_v3.md. */
var METAS = {
  F1_CIERRE_MIN: 181000000,      // colones, cierre 2026
  F1_CIERRE_AMARILLO: 170000000, // proyección por debajo de esto es rojo
  F2_MARGEN_VERDE: 0.08,         // margen normalizado 2027
  F5_MESES_VERDE: 2.0,
  F5_MESES_AMARILLO: 1.5,
  F5_CAJA_REPLIEGUE: 12000000,   // caja bajo este monto activa el plan de repliegue
  C1_PROMEDIO: 7.5,
  C1_RESPUESTAS: 30,
  C2_ORIGEN: 0.90,
  C2_REFERIDOR: 0.90,
  P1_SABANA: 315,
  P1_HEREDIA: 140,
  P2_SABANA: 70,
  P2_HEREDIA: 10,
  E1_TOPE: 0.20,
  E1_ROJO: 0.25
};

/** Nombres de mes abreviados que aparecen escritos a mano en los trackers. */
var MESES_TEXTO = {
  ene: 0, enero: 0,
  feb: 1, febrero: 1,
  mar: 2, marzo: 2,
  abr: 3, abril: 3,
  may: 4, mayo: 4,
  jun: 5, junio: 5,
  jul: 6, julio: 6,
  ago: 7, agosto: 7,
  set: 8, sep: 8, sept: 8, setiembre: 8, septiembre: 8,
  oct: 9, octubre: 9,
  nov: 10, noviembre: 10,
  dic: 11, diciembre: 11
};

/**
 * Nombres aceptados para cada columna. La búsqueda es por texto normalizado
 * (sin tildes, sin mayúsculas, sin espacios de más), así que la hoja puede
 * traer columnas extra o en otro orden sin que el script se rompa.
 */
var COLUMNAS_TRACKER = {
  fecha: ['fecha_cita', 'fecha cita', 'fecha'],
  doctor: ['doctor/a', 'doctora', 'doctor', 'medico', 'medica'],
  codigo: ['codigo_paciente', 'codigo paciente', 'codigo qvet', 'codigo'],
  mascota: ['nombre_mascota', 'nombre mascota', 'paciente', 'mascota'],
  cliente: ['nombre_cliente', 'nombre cliente', 'cliente'],
  tipo: ['tipo_cita', 'tipo cita', 'tipo de cita', 'tipo'],
  estado: ['estado_cita', 'estado cita', 'estado de la cita', 'estado'],
  ingresos: ['ingresos', 'ingreso', 'monto']
};

var COLUMNAS_PASIVO = {
  sede: ['sede'],
  codigo: ['codigo qvet', 'codigo_paciente', 'codigo'],
  cliente: ['cliente'],
  paciente: ['paciente', 'nombre_mascota'],
  fechaVenta: ['fecha de venta', 'fecha de compra', 'fecha_venta', 'fecha de la compra'],
  sesionesCompradas: ['sesiones compradas', 'sesiones del paquete', 'sesiones'],
  montoPagado: ['monto pagado', 'monto', 'precio pagado'],
  sesionesConsumidas: ['sesiones consumidas', 'sesiones usadas'],
  ultimaSesion: ['ultima sesion', 'ultima session', 'fecha ultima sesion'],
  sesionesPendientes: ['sesiones pendientes', 'sesiones restantes'],
  ingresoDiferido: ['ingreso diferido', 'pasivo', 'saldo diferido'],
  estado: ['estado']
};

var COLUMNAS_CLIENTES = {
  fecha: ['fecha de registro', 'fecha registro', 'fecha'],
  canal: ['canal', 'origen'],
  referidor: ['clinica o doctor que refirio', 'clinica o doctor', 'referidor', 'quien refirio']
};

/** Columnas de la hoja "Entradas". Ver README.md. */
var COLUMNAS_ENTRADAS = {
  mes: ['mes'],
  ingresosSabana: ['ingresos_sabana'],
  ingresosHeredia: ['ingresos_heredia'],
  costoVentas: ['costo_ventas'],
  gastosOperativos: ['gastos_operativos'],
  gastosCompletos: ['gastos_completos'],
  cajaCierre: ['caja_cierre'],
  costosDirectosSabana: ['costos_directos_sabana'],
  costosDirectosHeredia: ['costos_directos_heredia'],
  c1Promedio: ['c1_promedio'],
  c1Respuestas: ['c1_respuestas'],
  e2PlanillaBase: ['e2_planilla_base'],
  e2Altas: ['e2_altas'],
  e2Bajas: ['e2_bajas'],
  e2BajasVoluntarias: ['e2_bajas_voluntarias'],
  p5EspaciosSabana: ['p5_espacios_sabana'],
  p5EspaciosHeredia: ['p5_espacios_heredia'],
  nota: ['nota']
};

/* ============================ punto de entrada ============================ */

/** La corre el disparador una vez al día. Calcula, valida y publica. */
function run() {
  return ejecutar_(false);
}

/** Calcula y valida, imprime el JSON en el registro y no publica nada. */
function dryRun() {
  return ejecutar_(true);
}

/** Crea el disparador de tiempo: una vez al día, entre 3 y 4 a. m. Correr una sola vez. */
function crearDisparador() {
  borrarDisparadores();
  ScriptApp.newTrigger('run')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .inTimezone(ZONA)
    .create();
  Logger.log('Disparador creado: run una vez al día, entre 3 y 4 a. m.');
}

/** Quita todos los disparadores del proyecto. */
function borrarDisparadores() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  Logger.log('Disparadores eliminados.');
}

/** Borra la memoria de meses anteriores que usan F4 y C5 para su estado. */
function borrarHistorial() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('HISTORIAL_F4');
  props.deleteProperty('HISTORIAL_C5');
  Logger.log('Historial de F4 y C5 borrado.');
}

/* ================================ motor ================================ */

function ejecutar_(esPrueba) {
  var candado = LockService.getScriptLock();
  if (!candado.tryLock(30000)) {
    Logger.log('Otra corrida está en curso. Se cancela esta.');
    return null;
  }
  try {
    var ctx = leerFuentes_();
    var paquete = construirPaquete_(ctx);
    validarPaquete_(paquete);

    var texto = JSON.stringify(paquete, null, 2);
    if (esPrueba) {
      Logger.log('dryRun: no se publica nada. JSON de %s indicadores:', paquete.indicadores.length);
      imprimirLargo_(texto);
      return paquete;
    }

    var respuesta = publicar_(texto);
    Logger.log('Publicado. Código %s. Respuesta: %s',
      respuesta.getResponseCode(), recortar_(respuesta.getContentText(), 500));
    guardarHistorial_(ctx, paquete);
    return paquete;
  } finally {
    candado.releaseLock();
  }
}

function publicar_(texto) {
  var url = propObligatoria_('CMI_INGEST_URL');
  var token = propObligatoria_('CMI_INGEST_TOKEN');
  var respuesta = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: texto,
    muteHttpExceptions: true
  });
  var codigo = respuesta.getResponseCode();
  if (codigo < 200 || codigo >= 300) {
    throw new Error('El tablero respondió ' + codigo + ': ' +
      recortar_(respuesta.getContentText(), 300));
  }
  return respuesta;
}

/* =========================== lectura de fuentes =========================== */

function leerFuentes_() {
  var ctx = {
    incidencias: {},   // id de indicador -> conteo de filas que no se pudieron leer
    faltantes: []      // fuentes que no se pudieron abrir
  };

  ctx.sabana = leerTracker_('SHEET_TRACKER_SABANA', 'Sabana', ctx);
  ctx.heredia = leerTracker_('SHEET_TRACKER_HEREDIA', 'Heredia', ctx);
  ctx.citas = ctx.sabana.filas.concat(ctx.heredia.filas);
  ctx.tieneEstado = ctx.sabana.tieneEstado || ctx.heredia.tieneEstado;

  ctx.pasivo = leerPasivo_(ctx);
  ctx.clientesNuevos = leerClientesNuevos_(ctx);
  ctx.entradas = leerEntradas_(ctx);

  ctx.corteAgenda = maxFecha_(ctx.citas);
  ctx.cortePorSede = {
    Sabana: maxFecha_(ctx.sabana.filas),
    Heredia: maxFecha_(ctx.heredia.filas)
  };
  ctx.rangoPorSede = {
    Sabana: rangoMeses_(ctx.sabana.filas),
    Heredia: rangoMeses_(ctx.heredia.filas)
  };

  // El mes de reporte es el último mes cerrado. Un mes a medias se informaría
  // siempre por debajo de su meta, así que no se usa para los indicadores
  // mensuales de operación.
  ctx.mesAgenda = mesCerrado_(ctx.corteAgenda);
  ctx.mesesAgenda = ctx.mesAgenda ? ultimosMeses_(finDeMes_(ctx.mesAgenda), MESES_SERIE) : [];

  ctx.mesFinanciero = ultimoMesFinanciero_(ctx.entradas);
  ctx.mesesFinancieros = ctx.mesFinanciero
    ? ultimosMeses_(finDeMes_(ctx.mesFinanciero), MESES_SERIE)
    : [];

  return ctx;
}

/** Abre una hoja de cálculo por su propiedad y devuelve la pestaña que toca. */
function abrirPestana_(clave, nombresPestana, ctx, obligatoria) {
  var id = prop_(clave, '');
  if (!id) {
    if (obligatoria) ctx.faltantes.push(clave);
    return null;
  }
  var libro;
  try {
    libro = SpreadsheetApp.openById(id);
  } catch (e) {
    Logger.log('No se pudo abrir %s (%s): %s', clave, id, e.message);
    ctx.faltantes.push(clave);
    return null;
  }
  var pestanas = libro.getSheets();
  for (var i = 0; i < nombresPestana.length; i++) {
    var buscada = normalizar_(nombresPestana[i]);
    for (var j = 0; j < pestanas.length; j++) {
      if (normalizar_(pestanas[j].getName()) === buscada) return pestanas[j];
    }
  }
  return pestanas.length ? pestanas[0] : null;
}

/** Devuelve {encabezados: {clave: indice}, filas: [[...]]} de una pestaña. */
function leerTabla_(pestana, mapaColumnas) {
  var valores = pestana.getDataRange().getValues();
  if (!valores.length) return { indices: {}, filas: [], encabezados: [] };

  var filaEncabezado = 0;
  var mejor = -1;
  for (var f = 0; f < Math.min(valores.length, 8); f++) {
    var puntos = contarCoincidencias_(valores[f], mapaColumnas);
    if (puntos > mejor) { mejor = puntos; filaEncabezado = f; }
  }

  var encabezados = valores[filaEncabezado].map(function (c) { return normalizar_(c); });
  var indices = {};
  Object.keys(mapaColumnas).forEach(function (clave) {
    indices[clave] = buscarColumna_(encabezados, mapaColumnas[clave]);
  });
  return {
    indices: indices,
    encabezados: encabezados,
    filas: valores.slice(filaEncabezado + 1)
  };
}

function contarCoincidencias_(fila, mapaColumnas) {
  var encabezados = fila.map(function (c) { return normalizar_(c); });
  var n = 0;
  Object.keys(mapaColumnas).forEach(function (clave) {
    if (buscarColumna_(encabezados, mapaColumnas[clave]) >= 0) n++;
  });
  return n;
}

function buscarColumna_(encabezados, alternativas) {
  for (var a = 0; a < alternativas.length; a++) {
    var buscada = normalizar_(alternativas[a]);
    for (var i = 0; i < encabezados.length; i++) {
      if (encabezados[i] === buscada) return i;
    }
  }
  // Segunda vuelta, por coincidencia parcial, para tolerar encabezados largos.
  for (var b = 0; b < alternativas.length; b++) {
    var parcial = normalizar_(alternativas[b]);
    for (var k = 0; k < encabezados.length; k++) {
      if (encabezados[k] && encabezados[k].indexOf(parcial) === 0) return k;
    }
  }
  return -1;
}

/**
 * Lee un tracker de citas. Devuelve las filas ya normalizadas, con la fecha
 * resuelta. Las etiquetas escritas a mano del tipo "4 set" toman el año de la
 * última fecha buena que se vio antes, porque el orden de filas es monotónico.
 */
function leerTracker_(clave, sede, ctx) {
  var vacio = { sede: sede, filas: [], tieneEstado: false, ilegibles: 0, total: 0 };
  var pestana = abrirPestana_(clave, ['Entrada de Citas', 'Citas', 'Registro'], ctx, true);
  if (!pestana) return vacio;

  var tabla = leerTabla_(pestana, COLUMNAS_TRACKER);
  var ix = tabla.indices;
  if (ix.fecha < 0) {
    Logger.log('El tracker de %s no tiene columna de fecha. Se ignora.', sede);
    ctx.faltantes.push(clave + ' (sin columna de fecha)');
    return vacio;
  }

  var filas = [];
  var ilegibles = 0;
  var ultimaFecha = null;
  for (var i = 0; i < tabla.filas.length; i++) {
    var cruda = tabla.filas[i];
    if (filaVacia_(cruda)) continue;

    var fecha = parseFecha_(cruda[ix.fecha], ultimaFecha);
    var tipo = ix.tipo >= 0 ? normalizar_(cruda[ix.tipo]) : '';
    if (!fecha) {
      // Sin fecha no entra a ningún cálculo mensual.
      if (tipo || (ix.mascota >= 0 && cruda[ix.mascota])) ilegibles++;
      continue;
    }
    ultimaFecha = fecha;

    // Las ventas de producto no traen tipo de cita: no son citas atendidas.
    if (!tipo) { ilegibles++; continue; }

    filas.push({
      sede: sede,
      fecha: fecha,
      mes: claveMes_(fecha),
      tipo: tipo,
      doctor: ix.doctor >= 0 ? normalizar_(cruda[ix.doctor]) : '',
      estado: ix.estado >= 0 ? normalizar_(cruda[ix.estado]) : '',
      codigo: ix.codigo >= 0 ? codigoLimpio_(cruda[ix.codigo]) : '',
      mascota: ix.mascota >= 0 ? normalizar_(cruda[ix.mascota]) : '',
      cliente: ix.cliente >= 0 ? normalizar_(cruda[ix.cliente]) : '',
      paciente: identidadPaciente_(cruda, ix, sede)
    });
  }

  return {
    sede: sede,
    filas: filas,
    tieneEstado: ix.estado >= 0,
    ilegibles: ilegibles,
    total: filas.length + ilegibles
  };
}

/**
 * Identidad interna del paciente: código de Qvet cuando existe y, si falta, el
 * nombre normalizado de mascota y cliente. Se usa solo para contar dentro del
 * script. Nunca sale al JSON.
 */
function identidadPaciente_(cruda, ix, sede) {
  var codigo = ix.codigo >= 0 ? codigoLimpio_(cruda[ix.codigo]) : '';
  if (codigo) return sede + '#' + codigo;
  var mascota = ix.mascota >= 0 ? normalizar_(cruda[ix.mascota]) : '';
  var cliente = ix.cliente >= 0 ? normalizar_(cruda[ix.cliente]) : '';
  if (!mascota && !cliente) return '';
  return sede + '~' + mascota + '|' + cliente;
}

/** El código de Qvet, o vacío si la celda trae la palabra "domicilio" u otro texto. */
function codigoLimpio_(v) {
  if (v === null || v === undefined) return '';
  var s = String(v).trim();
  if (!s) return '';
  if (!/^\d+$/.test(s)) return '';
  return s;
}

function leerPasivo_(ctx) {
  var vacio = { filas: [], tieneFechaVenta: false, ilegibles: 0, disponible: false };
  var pestana = abrirPestana_('SHEET_PASIVO', ['Paquetes', 'Registro'], ctx, true);
  if (!pestana) return vacio;

  var tabla = leerTabla_(pestana, COLUMNAS_PASIVO);
  var ix = tabla.indices;
  var filas = [];
  var ilegibles = 0;
  var conFechaVenta = 0;

  for (var i = 0; i < tabla.filas.length; i++) {
    var c = tabla.filas[i];
    if (filaVacia_(c)) continue;

    var compradas = ix.sesionesCompradas >= 0 ? numero_(c[ix.sesionesCompradas]) : null;
    var consumidas = ix.sesionesConsumidas >= 0 ? numero_(c[ix.sesionesConsumidas]) : null;
    var monto = ix.montoPagado >= 0 ? numero_(c[ix.montoPagado]) : null;
    if (compradas === null && monto === null) { ilegibles++; continue; }

    var pendientes = ix.sesionesPendientes >= 0 ? numero_(c[ix.sesionesPendientes]) : null;
    if (pendientes === null && compradas !== null) {
      pendientes = compradas - (consumidas || 0);
    }
    if (pendientes === null) { ilegibles++; continue; }
    if (pendientes < 0) pendientes = 0;

    var precioSesion = (monto !== null && compradas) ? monto / compradas : null;
    var diferido = ix.ingresoDiferido >= 0 ? numero_(c[ix.ingresoDiferido]) : null;
    if (diferido === null && precioSesion !== null) diferido = precioSesion * pendientes;

    var fechaVenta = ix.fechaVenta >= 0 ? parseFecha_(c[ix.fechaVenta], null) : null;
    if (fechaVenta) conFechaVenta++;

    filas.push({
      sede: ix.sede >= 0 ? etiquetaSede_(c[ix.sede]) : '',
      codigo: ix.codigo >= 0 ? codigoLimpio_(c[ix.codigo]) : '',
      mascota: ix.paciente >= 0 ? normalizar_(c[ix.paciente]) : '',
      cliente: ix.cliente >= 0 ? normalizar_(c[ix.cliente]) : '',
      paciente: identidadPacientePasivo_(c, ix),
      fechaVenta: fechaVenta,
      compradas: compradas,
      consumidas: consumidas,
      pendientes: pendientes,
      diferido: diferido === null ? 0 : diferido,
      ultimaSesion: ix.ultimaSesion >= 0 ? parseFecha_(c[ix.ultimaSesion], null) : null,
      estado: ix.estado >= 0 ? normalizar_(c[ix.estado]) : ''
    });
  }

  return {
    filas: filas,
    tieneFechaVenta: conFechaVenta > 0,
    conFechaVenta: conFechaVenta,
    ilegibles: ilegibles,
    disponible: true
  };
}

function identidadPacientePasivo_(c, ix) {
  var codigo = ix.codigo >= 0 ? codigoLimpio_(c[ix.codigo]) : '';
  if (codigo) return '#' + codigo;
  var paciente = ix.paciente >= 0 ? normalizar_(c[ix.paciente]) : '';
  var cliente = ix.cliente >= 0 ? normalizar_(c[ix.cliente]) : '';
  return '~' + paciente + '|' + cliente;
}

function leerClientesNuevos_(ctx) {
  var sedes = [
    { clave: 'SHEET_CLIENTES_NUEVOS_SABANA', sede: 'Sabana' },
    { clave: 'SHEET_CLIENTES_NUEVOS_HEREDIA', sede: 'Heredia' }
  ];
  var resultado = { filas: [], ilegibles: 0, disponible: false, sedes: {} };

  sedes.forEach(function (s) {
    var pestana = abrirPestana_(s.clave, ['Registro'], ctx, true);
    if (!pestana) return;
    var tabla = leerTabla_(pestana, COLUMNAS_CLIENTES);
    var ix = tabla.indices;
    resultado.disponible = true;
    resultado.sedes[s.sede] = { conFecha: 0, sinFecha: 0 };

    for (var i = 0; i < tabla.filas.length; i++) {
      var c = tabla.filas[i];
      if (filaVacia_(c)) continue;
      var fecha = ix.fecha >= 0 ? parseFecha_(c[ix.fecha], null) : null;
      if (!fecha) { resultado.ilegibles++; resultado.sedes[s.sede].sinFecha++; continue; }
      resultado.sedes[s.sede].conFecha++;
      var canal = ix.canal >= 0 ? String(c[ix.canal] || '').trim() : '';
      var referidor = ix.referidor >= 0 ? String(c[ix.referidor] || '').trim() : '';
      resultado.filas.push({
        sede: s.sede,
        mes: claveMes_(fecha),
        conCanal: !!canal,
        esReferencia: normalizar_(canal).indexOf('referencia') === 0,
        conReferidor: !!referidor
      });
    }
  });

  return resultado;
}

function leerEntradas_(ctx) {
  var pestana = abrirPestana_('SHEET_ENTRADAS_FINANCIERAS', ['Entradas'], ctx, true);
  if (!pestana) return { porMes: {}, meses: [], disponible: false, ilegibles: 0 };

  var tabla = leerTabla_(pestana, COLUMNAS_ENTRADAS);
  var ix = tabla.indices;
  var porMes = {};
  var meses = [];
  var ilegibles = 0;

  for (var i = 0; i < tabla.filas.length; i++) {
    var c = tabla.filas[i];
    if (filaVacia_(c)) continue;
    var mes = claveMesTexto_(ix.mes >= 0 ? c[ix.mes] : null);
    if (!mes) { ilegibles++; continue; }

    var fila = { mes: mes };
    Object.keys(COLUMNAS_ENTRADAS).forEach(function (clave) {
      if (clave === 'mes') return;
      var j = ix[clave];
      if (j < 0) { fila[clave] = null; return; }
      var v = c[j];
      if (clave === 'nota') { fila[clave] = v ? String(v).trim() : ''; return; }
      if (clave === 'gastosCompletos') { fila[clave] = esSi_(v); return; }
      fila[clave] = numero_(v);
    });

    porMes[mes] = fila;
    if (meses.indexOf(mes) < 0) meses.push(mes);
  }

  meses.sort();
  return { porMes: porMes, meses: meses, disponible: true, ilegibles: ilegibles, indices: ix };
}

/* ============================ armado del JSON ============================ */

function construirPaquete_(ctx) {
  var indicadores = [
    indicadorF1_(ctx),
    indicadorF2_(ctx),
    indicadorF4_(ctx),
    indicadorF5_(ctx),
    indicadorF6_(ctx),
    indicadorC1_(ctx),
    indicadorC2_(ctx),
    indicadorC4_(ctx),
    indicadorC5_(ctx),
    indicadorP1_(ctx),
    indicadorP2_(ctx),
    indicadorP3_(ctx),
    indicadorP5_(ctx),
    indicadorE1_(ctx),
    indicadorE2_(ctx)
  ];

  return {
    version: VERSION_CONTRATO,
    generado: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    corte: {
      financiero: ctx.mesFinanciero ? fechaISO_(finDeMes_(ctx.mesFinanciero)) : null,
      agenda: ctx.corteAgenda ? fechaISO_(ctx.corteAgenda) : null
    },
    indicadores: indicadores
  };
}

/* ------------------------------- financiera ------------------------------- */

function indicadorF1_(ctx) {
  var base = {
    id: 'F1',
    perspectiva: 'financiera',
    nombre: 'Ingresos por sede',
    definicion: 'Ingresos facturados por sede, netos de IVA, sumados por mes; se reporta el mes y el acumulado del año',
    fuente: 'Estado de resultados mensual de la contadora, cargado en la hoja Entradas',
    dueno: 'René',
    frecuencia: 'Mensual',
    meta: 'Cierre 2026 entre ₡181M y ₡190M; 2027 entre ₡195M y ₡215M'
  };

  var mes = ctx.mesFinanciero;
  if (!mes) return sinLineaBase_(base, 'La hoja Entradas no tiene ningún mes con ingresos.');

  var serie = serieEntradas_(ctx, ['ingresosSabana', 'ingresosHeredia']);
  var fila = ctx.entradas.porMes[mes];
  var sabana = fila.ingresosSabana || 0;
  var heredia = fila.ingresosHeredia || 0;
  var total = sabana + heredia;

  var anio = mes.slice(0, 4);
  var acu = { sabana: 0, heredia: 0, meses: 0 };
  ctx.entradas.meses.forEach(function (m) {
    if (m.slice(0, 4) !== anio || m > mes) return;
    var f = ctx.entradas.porMes[m];
    if (f.ingresosSabana === null && f.ingresosHeredia === null) return;
    acu.sabana += f.ingresosSabana || 0;
    acu.heredia += f.ingresosHeredia || 0;
    acu.meses++;
  });
  var acumulado = acu.sabana + acu.heredia;
  var proyeccion = acu.meses ? acumulado / acu.meses * 12 : 0;

  var estado = 'rojo';
  if (proyeccion >= METAS.F1_CIERRE_MIN) estado = 'verde';
  else if (proyeccion >= METAS.F1_CIERRE_AMARILLO) estado = 'amarillo';

  base.estado = estado;
  base.valor = millones_(total);
  base.detalle = nombreMesLargo_(mes) + ': Sabana ' + millones_(sabana) + ', Heredia ' +
    millones_(heredia) + '. Acumulado del año ' + millones_(acumulado) + ' en ' +
    acu.meses + ' ' + (acu.meses === 1 ? 'mes' : 'meses');
  base.serie = {
    unidad: '₡M',
    meses: serie.meses,
    valores: {
      Sabana: serie.valores.ingresosSabana.map(aMillones_),
      Heredia: serie.valores.ingresosHeredia.map(aMillones_)
    }
  };
  base.nota = 'Proyección de cierre por promedio simple del año en curso: ' + millones_(proyeccion) +
    '. ' + notaEntradas_(ctx);
  return base;
}

function indicadorF2_(ctx) {
  var base = {
    id: 'F2',
    perspectiva: 'financiera',
    nombre: 'Margen operativo',
    definicion: 'Resultado operativo entre ingresos, antes de depreciación, intereses e impuestos, por mes y acumulado; se calcula solo sobre meses con gastos completos',
    fuente: 'Estado de resultados mensual, cargado en la hoja Entradas',
    dueno: 'René',
    frecuencia: 'Mensual, lectura trimestral',
    meta: 'Positivo en el segundo semestre de 2026; margen normalizado ≥8% en 2027 sin el ingreso por vencimiento de paquetes'
  };

  var meses = mesesConGastosCompletos_(ctx);
  if (!meses.length) {
    return sinLineaBase_(base, 'Ningún mes de la hoja Entradas está marcado con gastos completos.');
  }

  var acumulado = { ingresos: 0, resultado: 0 };
  var serieValores = [];
  var serieMeses = [];
  ctx.mesesFinancieros.forEach(function (m) {
    var f = ctx.entradas.porMes[m];
    serieMeses.push(m);
    if (!f || !f.gastosCompletos) { serieValores.push(null); return; }
    var r = resultadoOperativo_(f);
    serieValores.push(r.ingresos ? redondear_(r.resultado / r.ingresos * 100, 1) : null);
  });

  meses.forEach(function (m) {
    var r = resultadoOperativo_(ctx.entradas.porMes[m]);
    acumulado.ingresos += r.ingresos;
    acumulado.resultado += r.resultado;
  });

  var margen = acumulado.ingresos ? acumulado.resultado / acumulado.ingresos : 0;
  var estado = 'rojo';
  if (margen >= METAS.F2_MARGEN_VERDE) estado = 'verde';
  else if (margen >= 0) estado = 'amarillo';

  var ultimo = meses[meses.length - 1];
  var rUltimo = resultadoOperativo_(ctx.entradas.porMes[ultimo]);

  base.estado = estado;
  base.valor = porcentaje_(margen * 100);
  base.detalle = 'Acumulado sobre ' + meses.length + ' ' + (meses.length === 1 ? 'mes' : 'meses') +
    ' con gastos completos (' + meses[0] + ' a ' + ultimo + '): ' +
    porcentaje_(margen * 100) + ' (' + millones_(acumulado.resultado) + '). ' +
    nombreMesLargo_(ultimo) + ': ' +
    (rUltimo.ingresos ? porcentaje_(rUltimo.resultado / rUltimo.ingresos * 100) : 'sin dato');
  if (serieMeses.length) {
    base.serie = { unidad: '%', meses: serieMeses, valores: { Margen: serieValores } };
  }
  base.nota = 'El estado de resultados no registra depreciación ni intereses del leasing. ' +
    'El margen se lee con esa salvedad. Solo entran los meses marcados con gastos completos en la hoja Entradas. ' +
    notaEntradas_(ctx);
  return base;
}

function indicadorF4_(ctx) {
  var base = {
    id: 'F4',
    perspectiva: 'financiera',
    nombre: 'Pasivo de sesiones prepagadas',
    definicion: 'Paquetes vendidos menos sesiones entregadas, valorado al precio pagado, neto de IVA; se reporta el total y la parte de pacientes con actividad en los últimos 90 días',
    fuente: 'Registro del pasivo prepagado alimentado por recepción',
    dueno: 'Recepción de cada sede, con René como revisor',
    frecuencia: 'Mensual',
    meta: 'Que el pasivo no crezca más rápido que la venta de paquetes. En 2027, redención ≥85% a los 180 días de los paquetes vendidos cada mes, en ambas sedes'
  };

  if (!ctx.pasivo.disponible || !ctx.pasivo.filas.length) {
    return sinLineaBase_(base, 'No se pudo leer el registro del pasivo prepagado.');
  }

  var activos = pacientesActivos_(ctx);
  var total = 0, activo = 0, pendientesTotal = 0, pendientesActivo = 0;
  var porSede = {};

  ctx.pasivo.filas.forEach(function (f) {
    if (!f.pendientes) return;
    total += f.diferido;
    pendientesTotal += f.pendientes;
    var sede = f.sede || 'Sin sede';
    if (!porSede[sede]) porSede[sede] = 0;
    porSede[sede] += f.diferido;

    var corteSede = ctx.cortePorSede[f.sede] || ctx.corteAgenda || new Date();
    var reciente = f.ultimaSesion && diasEntre_(f.ultimaSesion, corteSede) <= DIAS_INACTIVIDAD;
    if (reciente || pasivoActivo_(f, activos)) {
      activo += f.diferido;
      pendientesActivo += f.pendientes;
    }
  });

  ctx._f4Activo = activo;

  var anterior = leerHistorial_('HISTORIAL_F4');
  var estado = 'amarillo';
  if (anterior && anterior.mes !== ctx.mesAgenda && anterior.valor > 0) {
    var variacion = (activo - anterior.valor) / anterior.valor;
    if (variacion <= 0) estado = 'verde';
    else if (variacion <= 0.10) estado = 'amarillo';
    else estado = 'rojo';
  }

  var detalleSedes = Object.keys(porSede).sort().map(function (s) {
    return s + ' ' + millones_(porSede[s]);
  }).join(', ');

  base.estado = estado;
  base.valor = millones_(activo);
  base.detalle = 'Pacientes con actividad en los últimos ' + DIAS_INACTIVIDAD + ' días ' +
    millones_(activo) + ' (' + entero_(pendientesActivo) + ' sesiones). Histórico ' +
    millones_(total) + ' (' + entero_(pendientesTotal) + ' sesiones)' +
    (detalleSedes ? '. Por sede: ' + detalleSedes : '');
  base.nota = 'Las filas en ₡0 del tracker se toman como canjes de paquete. ' +
    (anterior ? 'Mes anterior: ' + millones_(anterior.valor) + '. ' : 'Sin mes anterior guardado, el estado queda en amarillo hasta la segunda corrida. ') +
    incidencia_('filas del registro sin sesiones ni monto legibles', ctx.pasivo.ilegibles);
  return base;
}

function indicadorF5_(ctx) {
  var base = {
    id: 'F5',
    perspectiva: 'financiera',
    nombre: 'Colchón de caja',
    definicion: 'Saldo en bancos al cierre de mes dividido entre el gasto operativo mensual promedio de los últimos seis meses, en meses',
    fuente: 'Balance mensual y estado de resultados, cargados en la hoja Entradas',
    dueno: 'René',
    frecuencia: 'Mensual',
    meta: 'Dos meses de gasto operativo a mitad de 2027. Si la caja cierra un mes debajo de ₡12M se activa el plan de repliegue'
  };

  var mes = ctx.mesFinanciero;
  var fila = mes ? ctx.entradas.porMes[mes] : null;
  if (!fila || fila.cajaCierre === null) {
    return sinLineaBase_(base, 'La hoja Entradas no trae saldo de caja al cierre del último mes.');
  }

  var gastos = [];
  var ordenados = ctx.entradas.meses.filter(function (m) { return m <= mes; }).slice(-6);
  ordenados.forEach(function (m) {
    var f = ctx.entradas.porMes[m];
    var g = (f.gastosOperativos || 0) + (f.costoVentas || 0);
    if (g > 0) gastos.push(g);
  });
  if (!gastos.length) {
    return sinLineaBase_(base, 'La hoja Entradas no trae gastos para calcular el promedio mensual.');
  }

  var promedio = gastos.reduce(function (a, b) { return a + b; }, 0) / gastos.length;
  var colchon = promedio ? fila.cajaCierre / promedio : 0;

  var estado = 'rojo';
  if (colchon >= METAS.F5_MESES_VERDE) estado = 'verde';
  else if (colchon >= METAS.F5_MESES_AMARILLO) estado = 'amarillo';
  if (fila.cajaCierre < METAS.F5_CAJA_REPLIEGUE) estado = 'rojo';

  var serie = serieEntradas_(ctx, ['cajaCierre']);

  base.estado = estado;
  base.valor = decimal_(colchon, 2) + ' meses';
  base.detalle = 'Al ' + fechaLarga_(finDeMes_(mes)) + ': ' + millones_(fila.cajaCierre) +
    ' de caja entre ' + millones_(promedio) + ' de gasto mensual promedio de los últimos ' +
    gastos.length + ' meses';
  base.serie = {
    unidad: '₡M',
    meses: serie.meses,
    valores: { Caja: serie.valores.cajaCierre.map(aMillones_) }
  };
  base.nota = 'El gasto mensual promedio es gastos operativos más costo de ventas. ' +
    (fila.cajaCierre < METAS.F5_CAJA_REPLIEGUE
      ? 'La caja cerró debajo de ₡12M: corresponde activar el plan de repliegue. '
      : '') + notaEntradas_(ctx);
  return base;
}

function indicadorF6_(ctx) {
  var base = {
    id: 'F6',
    perspectiva: 'financiera',
    nombre: 'Punto de equilibrio por sede',
    definicion: 'Ingreso mensual por sede necesario para cubrir sus costos directos, con los honorarios de Carolina asignados 23,7% a Heredia como línea de ajuste sobre el estado que entrega la contadora',
    fuente: 'Estado mensual por sede de la contadora más el ajuste de honorarios, cargado en la hoja Entradas',
    dueno: 'René',
    frecuencia: 'Mensual',
    meta: 'Cada sede cubre sus costos directos; Heredia sostenido tres meses seguidos antes de la decisión de enero de 2027'
  };

  var mes = ctx.mesFinanciero;
  var fila = mes ? ctx.entradas.porMes[mes] : null;
  if (!fila || fila.costosDirectosSabana === null || fila.costosDirectosHeredia === null) {
    return sinLineaBase_(base, 'Por instalar. Arranca con el primer estado mensual por sede en la hoja Entradas.');
  }

  var sedes = [
    { nombre: 'Sabana', ingreso: fila.ingresosSabana || 0, costo: fila.costosDirectosSabana },
    { nombre: 'Heredia', ingreso: fila.ingresosHeredia || 0, costo: fila.costosDirectosHeredia }
  ];
  var cubren = sedes.filter(function (s) { return s.ingreso >= s.costo; }).length;
  var estado = cubren === 2 ? 'verde' : (cubren === 1 ? 'amarillo' : 'rojo');

  // Meses seguidos en que Heredia cubre sus costos directos.
  var seguidos = 0;
  for (var i = ctx.entradas.meses.length - 1; i >= 0; i--) {
    var m = ctx.entradas.meses[i];
    if (m > mes) continue;
    var f = ctx.entradas.porMes[m];
    if (f.costosDirectosHeredia === null) break;
    if ((f.ingresosHeredia || 0) >= f.costosDirectosHeredia) seguidos++; else break;
  }

  base.estado = estado;
  base.valor = sedes.map(function (s) {
    return s.nombre + ' ' + (s.ingreso >= s.costo ? 'cubre' : 'no cubre');
  }).join(', ');
  base.detalle = nombreMesLargo_(mes) + ': Sabana ingreso ' + millones_(sedes[0].ingreso) +
    ' contra costos directos ' + millones_(sedes[0].costo) + '; Heredia ingreso ' +
    millones_(sedes[1].ingreso) + ' contra ' + millones_(sedes[1].costo) +
    '. Heredia lleva ' + seguidos + ' ' + (seguidos === 1 ? 'mes seguido' : 'meses seguidos') + ' cubriendo';
  base.serie = (function () {
    var s = serieEntradas_(ctx, ['ingresosHeredia', 'costosDirectosHeredia']);
    return {
      unidad: '₡M',
      meses: s.meses,
      valores: {
        'Heredia ingreso': s.valores.ingresosHeredia.map(aMillones_),
        'Heredia costos directos': s.valores.costosDirectosHeredia.map(aMillones_)
      }
    };
  })();
  base.nota = 'Los costos directos de Heredia incluyen el 23,7% de los honorarios de Carolina. ' +
    notaEntradas_(ctx);
  return base;
}

/* -------------------------------- clientes -------------------------------- */

function indicadorC1_(ctx) {
  var base = {
    id: 'C1',
    perspectiva: 'clientes',
    nombre: 'Satisfacción del cliente',
    definicion: 'Encuesta de una pregunta por WhatsApp después de la cita, calificación de 0 a 10; se reporta el promedio y el número de respuestas',
    fuente: 'Encuesta por WhatsApp de cada sede, resumida en la hoja Entradas',
    dueno: 'Recepción de cada sede',
    frecuencia: 'Mensual',
    meta: 'Promedio superior a 7,5 con al menos 30 respuestas al mes'
  };

  var mes = ultimoMesCon_(ctx, 'c1Promedio');
  if (!mes) {
    return sinLineaBase_(base, 'Por instalar. Arranca en el cuarto trimestre de 2026, después del piloto de avance clínico.');
  }

  var fila = ctx.entradas.porMes[mes];
  var promedio = fila.c1Promedio;
  var respuestas = fila.c1Respuestas || 0;

  var estado = 'rojo';
  if (promedio >= METAS.C1_PROMEDIO && respuestas >= METAS.C1_RESPUESTAS) estado = 'verde';
  else if (promedio >= METAS.C1_PROMEDIO || respuestas >= METAS.C1_RESPUESTAS) estado = 'amarillo';

  var serie = serieEntradas_(ctx, ['c1Promedio', 'c1Respuestas']);

  base.estado = estado;
  base.valor = decimal_(promedio, 1);
  base.detalle = nombreMesLargo_(mes) + ': promedio ' + decimal_(promedio, 1) + ' sobre ' +
    entero_(respuestas) + ' respuestas';
  base.serie = {
    unidad: 'puntos',
    meses: serie.meses,
    valores: {
      Promedio: serie.valores.c1Promedio,
      Respuestas: serie.valores.c1Respuestas
    }
  };
  base.nota = notaEntradas_(ctx);
  return base;
}

function indicadorC2_(ctx) {
  var base = {
    id: 'C2',
    perspectiva: 'clientes',
    nombre: 'Clientes nuevos y su origen',
    definicion: 'Conteo de clientes nuevos por mes y por sede, y proporción con origen registrado en el campo de dos partes (canal cerrado; clínica y doctor si es referencia veterinaria)',
    fuente: 'Registro de clientes nuevos de cada sede',
    dueno: 'Recepción de cada sede',
    frecuencia: 'Mensual',
    meta: 'Origen registrado en más del 90% de los clientes nuevos; nombre del referidor en más del 90% de las referencias veterinarias'
  };

  if (!ctx.clientesNuevos.disponible) {
    return sinLineaBase_(base, 'No se pudieron abrir los registros de clientes nuevos.');
  }

  var mes = ctx.mesAgenda;
  var delMes = ctx.clientesNuevos.filas.filter(function (f) { return f.mes === mes; });
  if (!delMes.length) {
    var conteoTotal = ctx.clientesNuevos.filas.length;
    return sinLineaBase_(base, 'Por instalar la captura de dos partes. El registro no trae filas con fecha en ' +
      (mes || 'el mes de corte') + '. Filas fechadas en total: ' + entero_(conteoTotal) + '. ' +
      incidencia_('filas sin fecha de registro', ctx.clientesNuevos.ilegibles));
  }

  var conCanal = delMes.filter(function (f) { return f.conCanal; }).length;
  var referencias = delMes.filter(function (f) { return f.esReferencia; });
  var conReferidor = referencias.filter(function (f) { return f.conReferidor; }).length;
  var proporcion = conCanal / delMes.length;
  var proporcionRef = referencias.length ? conReferidor / referencias.length : 1;

  var estado = 'rojo';
  if (proporcion > METAS.C2_ORIGEN && proporcionRef > METAS.C2_REFERIDOR) estado = 'verde';
  else if (proporcion >= 0.70) estado = 'amarillo';

  var porSede = {};
  delMes.forEach(function (f) { porSede[f.sede] = (porSede[f.sede] || 0) + 1; });

  var serie = serieClientesNuevos_(ctx);

  base.estado = estado;
  base.valor = entero_(delMes.length) + ' clientes';
  base.detalle = nombreMesLargo_(mes) + ': ' +
    ['Sabana', 'Heredia'].map(function (s) { return s + ' ' + entero_(porSede[s] || 0); }).join(', ') +
    '. Origen registrado en ' + porcentaje_(proporcion * 100) + '. Referencias veterinarias ' +
    entero_(referencias.length) + ', con nombre del referidor ' + entero_(conReferidor);
  base.serie = { unidad: 'clientes', meses: serie.meses, valores: serie.valores };
  base.nota = incidencia_('filas del registro sin fecha legible', ctx.clientesNuevos.ilegibles);
  return base;
}

function indicadorC4_(ctx) {
  var base = {
    id: 'C4',
    perspectiva: 'clientes',
    nombre: 'Renovación de paquetes',
    definicion: 'Clientes que agotaron un paquete en el mes y compraron otro dentro de los 30 días siguientes, entre el total que agotó',
    fuente: 'Registro del pasivo prepagado, con la fecha de compra de cada paquete',
    dueno: 'Recepción de cada sede',
    frecuencia: 'Mensual',
    meta: 'Meta fijada después de un trimestre con fecha de compra registrada'
  };

  if (!ctx.pasivo.disponible || !ctx.pasivo.tieneFechaVenta) {
    return sinLineaBase_(base, 'Por instalar: requiere la columna de fecha de venta llena en el registro del pasivo prepagado.');
  }

  var mes = ctx.mesAgenda;
  var agotados = ctx.pasivo.filas.filter(function (f) {
    return f.pendientes === 0 && f.ultimaSesion && claveMes_(f.ultimaSesion) === mes;
  });

  if (!agotados.length) {
    return sinLineaBase_(base, 'Ningún paquete quedó agotado en ' + (mes || 'el mes de corte') +
      ' según el registro. La meta se fija después de un trimestre con fecha de compra registrada.');
  }

  var compras = ctx.pasivo.filas.filter(function (f) { return !!f.fechaVenta; });
  var renovaron = agotados.filter(function (a) {
    return compras.some(function (c) {
      if (c.paciente !== a.paciente) return false;
      var d = diasEntre_(a.ultimaSesion, c.fechaVenta);
      return d > 0 && d <= DIAS_RENOVACION;
    });
  }).length;

  var proporcion = renovaron / agotados.length;

  base.estado = 'sin_linea_base';
  base.valor = porcentaje_(proporcion * 100);
  base.detalle = nombreMesLargo_(mes) + ': ' + entero_(renovaron) + ' de ' + entero_(agotados.length) +
    ' clientes que agotaron paquete compraron otro dentro de ' + DIAS_RENOVACION + ' días';
  base.nota = 'La cifra ya se calcula, pero la meta se fija después de un trimestre completo con fecha de compra registrada. ' +
    'Filas con fecha de venta: ' + entero_(ctx.pasivo.conFechaVenta) + ' de ' +
    entero_(ctx.pasivo.filas.length) + '. ' +
    incidencia_('filas del registro sin sesiones ni monto legibles', ctx.pasivo.ilegibles);
  return base;
}

function indicadorC5_(ctx) {
  var base = {
    id: 'C5',
    perspectiva: 'clientes',
    nombre: 'Pacientes inactivos',
    definicion: 'Pacientes con al menos una cita y ninguna en los últimos 90 días, por sede; se reporta aparte el grupo con una sola cita en su historia',
    fuente: 'Trackers de citas',
    dueno: 'Recepción de cada sede',
    frecuencia: 'Mensual',
    meta: 'Que el conteo de cada sede baje respecto del mes anterior y que la lista se trabaje cada mes con la ficha del paciente enfrente'
  };

  if (!ctx.citas.length) return sinLineaBase_(base, 'No se pudo leer ningún tracker de citas.');

  var resumen = { Sabana: null, Heredia: null };
  ['Sabana', 'Heredia'].forEach(function (sede) {
    var corte = ctx.cortePorSede[sede] || ctx.corteAgenda;
    var porPaciente = {};
    ctx.citas.forEach(function (c) {
      if (c.sede !== sede || !c.paciente) return;
      var p = porPaciente[c.paciente];
      if (!p) { porPaciente[c.paciente] = { n: 1, ultima: c.fecha }; return; }
      p.n++;
      if (c.fecha > p.ultima) p.ultima = c.fecha;
    });
    var total = 0, inactivos = 0, unaSola = 0;
    Object.keys(porPaciente).forEach(function (k) {
      var p = porPaciente[k];
      total++;
      if (diasEntre_(p.ultima, corte) > DIAS_INACTIVIDAD) {
        inactivos++;
        if (p.n === 1) unaSola++;
      }
    });
    resumen[sede] = { total: total, inactivos: inactivos, unaSola: unaSola };
  });

  var totalInactivos = resumen.Sabana.inactivos + resumen.Heredia.inactivos;
  ctx._c5Total = totalInactivos;

  var anterior = leerHistorial_('HISTORIAL_C5');
  var estado = 'amarillo';
  if (anterior && anterior.mes !== ctx.mesAgenda && anterior.valor > 0) {
    if (totalInactivos < anterior.valor) estado = 'verde';
    else if (totalInactivos <= anterior.valor * 1.05) estado = 'amarillo';
    else estado = 'rojo';
  }

  base.estado = estado;
  base.valor = entero_(totalInactivos) + ' pacientes';
  base.detalle = ['Sabana', 'Heredia'].map(function (s) {
    var r = resumen[s];
    return s + ' ' + entero_(r.inactivos) + ' de ' + entero_(r.total) + ' (' +
      porcentaje_(r.total ? r.inactivos / r.total * 100 : 0) + '), con una sola cita ' + entero_(r.unaSola);
  }).join('; ');
  base.nota = 'Ventana de ' + DIAS_INACTIVIDAD + ' días contra la última fecha de cada tracker. ' +
    'La identidad del paciente usa el código de Qvet cuando existe y el nombre normalizado cuando falta. ' +
    'El conteo es una lista de trabajo para recepción, no una medida de deserción: incluye pacientes que terminaron su tratamiento y pacientes fallecidos sin marcar. ' +
    (anterior ? 'Mes anterior: ' + entero_(anterior.valor) + '. ' : 'Sin mes anterior guardado. ') +
    incidenciasTracker_(ctx);
  return base;
}

/* -------------------------------- procesos -------------------------------- */

function indicadorP1_(ctx) {
  var base = {
    id: 'P1',
    perspectiva: 'procesos',
    nombre: 'Citas por mes por sede',
    definicion: 'Citas atendidas por mes en cada sede, sin ventas de productos',
    fuente: 'Trackers de citas y Qvet',
    dueno: 'Recepción Sabana y recepción Heredia',
    frecuencia: 'Mensual',
    meta: 'Sabana 315 al mes (nivel del segundo semestre de 2025); Heredia creciendo sobre 140'
  };

  if (!ctx.citas.length) return sinLineaBase_(base, 'No se pudo leer ningún tracker de citas.');

  var serie = serieCitas_(ctx, function () { return true; });
  var mes = ctx.mesAgenda;
  var sabana = serie.ultimo.Sabana;
  var heredia = serie.ultimo.Heredia;

  var estado = estadoPorSede_(
    [sabana, heredia], [METAS.P1_SABANA, METAS.P1_HEREDIA]);
  if (!estado) return sinLineaBase_(base, 'Ningún tracker cubre ' + nombreMesLargo_(mes) + '.');

  base.estado = estado;
  base.valor = entero_((sabana || 0) + (heredia || 0)) + ' citas';
  base.detalle = nombreMesLargo_(mes) + ': Sabana ' + entero_(sabana) + ' (meta ' + METAS.P1_SABANA +
    '), Heredia ' + entero_(heredia) + ' (meta ' + METAS.P1_HEREDIA + ')';
  base.serie = { unidad: 'citas', meses: serie.meses, valores: serie.valores };
  base.nota = 'Solo entran las filas con tipo de cita. Las ventas de producto no traen tipo y quedan fuera. ' +
    'Se informa el último mes cerrado, no el mes en curso. ' + notaAtraso_(ctx) + incidenciasTracker_(ctx);
  return base;
}

function indicadorP2_(ctx) {
  var base = {
    id: 'P2',
    perspectiva: 'procesos',
    nombre: 'Domicilios por mes',
    definicion: 'Citas de tipo domicilio por mes y por sede',
    fuente: 'Trackers de citas',
    dueno: 'Recepción de cada sede',
    frecuencia: 'Mensual',
    meta: 'Sabana alrededor de 70 al mes; Heredia sobre 10'
  };

  if (!ctx.citas.length) return sinLineaBase_(base, 'No se pudo leer ningún tracker de citas.');

  var serie = serieCitas_(ctx, esDomicilio_);
  var mes = ctx.mesAgenda;
  var sabana = serie.ultimo.Sabana;
  var heredia = serie.ultimo.Heredia;

  var estado = estadoPorSede_(
    [sabana, heredia], [METAS.P2_SABANA, METAS.P2_HEREDIA]);
  if (!estado) return sinLineaBase_(base, 'Ningún tracker cubre ' + nombreMesLargo_(mes) + '.');

  base.estado = estado;
  base.valor = entero_((sabana || 0) + (heredia || 0)) + ' domicilios';
  base.detalle = nombreMesLargo_(mes) + ': Sabana ' + entero_(sabana) + ' (meta ' + METAS.P2_SABANA +
    '), Heredia ' + entero_(heredia) + ' (meta ' + METAS.P2_HEREDIA + ')';
  base.serie = { unidad: 'domicilios', meses: serie.meses, valores: serie.valores };
  base.nota = 'Las filas de domicilio del tracker traen el ingreso bruto de IVA, a diferencia de las de clínica. ' +
    'Ese detalle no afecta este conteo. ' + notaAtraso_(ctx) + incidenciasTracker_(ctx);
  return base;
}

function indicadorP3_(ctx) {
  var base = {
    id: 'P3',
    perspectiva: 'procesos',
    nombre: 'Cancelaciones y no presentaciones',
    definicion: 'Citas canceladas o no presentadas sobre el total agendado, por sede',
    fuente: 'Columna de estado del tracker',
    dueno: 'Recepción de cada sede',
    frecuencia: 'Mensual',
    meta: 'Meta después de un trimestre completo de medición'
  };

  if (!ctx.tieneEstado) {
    return sinLineaBase_(base, 'Por instalar. Arranca en octubre de 2026, cuando los trackers lleven la columna de estado de la cita.');
  }

  var mes = ctx.mesAgenda;
  var porSede = {};
  var conEstado = 0;
  ctx.citas.forEach(function (c) {
    if (c.mes !== mes) return;
    if (!porSede[c.sede]) porSede[c.sede] = { total: 0, perdidas: 0, sinEstado: 0 };
    porSede[c.sede].total++;
    if (!c.estado) { porSede[c.sede].sinEstado++; return; }
    conEstado++;
    if (esCancelada_(c.estado)) porSede[c.sede].perdidas++;
  });

  if (!conEstado) {
    return sinLineaBase_(base, 'La columna de estado existe pero está vacía en ' + (mes || 'el mes de corte') + '.');
  }

  var total = 0, perdidas = 0, sinEstado = 0;
  Object.keys(porSede).forEach(function (s) {
    total += porSede[s].total;
    perdidas += porSede[s].perdidas;
    sinEstado += porSede[s].sinEstado;
  });
  var proporcion = total ? perdidas / total : 0;

  base.estado = 'sin_linea_base';
  base.valor = porcentaje_(proporcion * 100);
  base.detalle = nombreMesLargo_(mes) + ': ' + entero_(perdidas) + ' de ' + entero_(total) +
    ' citas agendadas. ' + ['Sabana', 'Heredia'].filter(function (s) { return porSede[s]; })
      .map(function (s) {
        var r = porSede[s];
        return s + ' ' + porcentaje_(r.total ? r.perdidas / r.total * 100 : 0);
      }).join(', ');
  base.nota = 'La cifra ya se calcula, pero la meta se fija después de un trimestre completo de medición. ' +
    incidencia_('citas del mes sin estado anotado', sinEstado);
  return base;
}

function indicadorP5_(ctx) {
  var base = {
    id: 'P5',
    perspectiva: 'procesos',
    nombre: 'Ocupación de agenda',
    definicion: 'Sesiones realizadas entre los espacios disponibles del mes, por sede y por bloque (mañana y tarde)',
    fuente: 'Trackers de citas más la capacidad de espacios definida con recepción',
    dueno: 'Recepción de cada sede',
    frecuencia: 'Mensual',
    meta: 'Meta después de un trimestre de medición'
  };

  var mes = ctx.mesAgenda;
  var fila = mes && ctx.entradas.porMes[mes] ? ctx.entradas.porMes[mes] : null;
  if (!fila || fila.p5EspaciosSabana === null || fila.p5EspaciosHeredia === null) {
    return sinLineaBase_(base, 'Por instalar. Requiere los espacios disponibles del mes por sede en la hoja Entradas.');
  }

  var realizadas = { Sabana: 0, Heredia: 0 };
  ctx.citas.forEach(function (c) {
    if (c.mes !== mes) return;
    if (esDomicilio_(c)) return;  // el domicilio no ocupa espacio de clínica
    if (realizadas[c.sede] === undefined) return;
    realizadas[c.sede]++;
  });

  var espacios = { Sabana: fila.p5EspaciosSabana, Heredia: fila.p5EspaciosHeredia };
  var ocupacion = {};
  ['Sabana', 'Heredia'].forEach(function (s) {
    ocupacion[s] = espacios[s] ? realizadas[s] / espacios[s] : null;
  });

  var total = espacios.Sabana + espacios.Heredia;
  var global = total ? (realizadas.Sabana + realizadas.Heredia) / total : 0;

  base.estado = 'sin_linea_base';
  base.valor = porcentaje_(global * 100);
  base.detalle = nombreMesLargo_(mes) + ': ' + ['Sabana', 'Heredia'].map(function (s) {
    return s + ' ' + entero_(realizadas[s]) + ' de ' + entero_(espacios[s]) + ' espacios (' +
      (ocupacion[s] === null ? 'sin capacidad definida' : porcentaje_(ocupacion[s] * 100)) + ')';
  }).join(', ');
  base.nota = 'Cuenta las citas de clínica; los domicilios quedan fuera porque no ocupan espacio de sede. ' +
    'La meta se fija después de un trimestre de medición. ' + notaAtraso_(ctx) + incidenciasTracker_(ctx);
  return base;
}

/* --------------------------------- equipo --------------------------------- */

function indicadorE1_(ctx) {
  var base = {
    id: 'E1',
    perspectiva: 'equipo',
    nombre: 'Carga clínica de Carolina',
    definicion: 'Porcentaje de las citas de la empresa que atiende ella, más el conteo de sus domicilios',
    fuente: 'Trackers de citas',
    dueno: 'René',
    frecuencia: 'Mensual',
    meta: 'Tope de 20%. La cifra se mantiene o baja; cuatro horas semanales protegidas para estrategia'
  };

  if (!ctx.citas.length) return sinLineaBase_(base, 'No se pudo leer ningún tracker de citas.');

  var mes = ctx.mesAgenda;
  var total = 0, suyas = 0, domicilios = 0;
  var sabana = { total: 0, suyas: 0 };
  ctx.citas.forEach(function (c) {
    if (c.mes !== mes) return;
    total++;
    if (c.sede === 'Sabana') sabana.total++;
    if (!esCarolina_(c.doctor)) return;
    suyas++;
    if (c.sede === 'Sabana') sabana.suyas++;
    if (esDomicilio_(c)) domicilios++;
  });

  if (!total) return sinLineaBase_(base, 'El tracker no trae citas en ' + (mes || 'el mes de corte') + '.');

  var proporcion = suyas / total;
  var estado = 'rojo';
  if (proporcion <= METAS.E1_TOPE) estado = 'verde';
  else if (proporcion <= METAS.E1_ROJO) estado = 'amarillo';

  var serie = serieCarolina_(ctx);

  base.estado = estado;
  base.valor = porcentaje_(proporcion * 100);
  base.detalle = nombreMesLargo_(mes) + ': ' + entero_(suyas) + ' de ' + entero_(total) +
    ' citas de la empresa (' + porcentaje_(proporcion * 100) + '), de las cuales ' +
    entero_(domicilios) + ' domicilios. En Sabana ' + entero_(sabana.suyas) + ' de ' +
    entero_(sabana.total) + ' (' + porcentaje_(sabana.total ? sabana.suyas / sabana.total * 100 : 0) + ')';
  base.serie = { unidad: '%', meses: serie.meses, valores: serie.valores };
  base.nota = 'La atribución sale de la columna de doctora del tracker, que solo identifica a Carolina de forma confiable. ' +
    'Se agrupan las variantes de escritura del nombre. ' + notaAtraso_(ctx) + incidenciasTracker_(ctx);
  return base;
}

function indicadorE2_(ctx) {
  var base = {
    id: 'E2',
    perspectiva: 'equipo',
    nombre: 'Estabilidad del equipo',
    definicion: 'Altas y bajas de personal por trimestre sobre la planilla base',
    fuente: 'Planilla mensual, resumida en la hoja Entradas',
    dueno: 'Carolina',
    frecuencia: 'Trimestral',
    meta: 'Rotación voluntaria cero en el semestre'
  };

  var mes = ultimoMesCon_(ctx, 'e2PlanillaBase');
  if (!mes) return sinLineaBase_(base, 'La hoja Entradas no trae la planilla base de ningún mes.');

  // Se acumula el trimestre que termina en el mes leído.
  var trimestre = ultimosMeses_(finDeMes_(mes), 3);
  var altas = 0, bajas = 0, voluntarias = 0, mesesConDato = 0;
  trimestre.forEach(function (m) {
    var f = ctx.entradas.porMes[m];
    if (!f) return;
    if (f.e2Altas === null && f.e2Bajas === null && f.e2BajasVoluntarias === null) return;
    mesesConDato++;
    altas += f.e2Altas || 0;
    bajas += f.e2Bajas || 0;
    voluntarias += f.e2BajasVoluntarias || 0;
  });

  var planilla = ctx.entradas.porMes[mes].e2PlanillaBase;
  var estado = 'verde';
  if (voluntarias === 1) estado = 'amarillo';
  else if (voluntarias >= 2) estado = 'rojo';

  base.estado = estado;
  base.valor = entero_(planilla) + ' personas';
  base.detalle = 'Trimestre a ' + nombreMesLargo_(mes) + ': planilla base ' + entero_(planilla) +
    ', altas ' + entero_(altas) + ', bajas ' + entero_(bajas) + ', de ellas voluntarias ' + entero_(voluntarias);
  base.nota = 'Se acumulan los tres meses del trimestre que cierra en el mes leído. ' +
    'Meses del trimestre con dato cargado: ' + mesesConDato + ' de 3. ' + notaEntradas_(ctx);
  return base;
}

/* ============================== validación ============================== */

function validarPaquete_(paquete) {
  var errores = [];

  if (paquete.version !== VERSION_CONTRATO) errores.push('version incorrecta');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(paquete.generado)) {
    errores.push('generado no es un ISO UTC válido');
  }
  if (!paquete.corte) errores.push('falta el bloque corte');

  var vistos = {};
  paquete.indicadores.forEach(function (ind, i) {
    var donde = 'indicador ' + (ind && ind.id ? ind.id : '#' + i);
    if (!ind.id || IDS_ESPERADOS.indexOf(ind.id) < 0) { errores.push(donde + ': id desconocido'); return; }
    if (vistos[ind.id]) errores.push(donde + ': repetido');
    vistos[ind.id] = true;
    if (PERSPECTIVAS.indexOf(ind.perspectiva) < 0) errores.push(donde + ': perspectiva inválida');
    if (ESTADOS.indexOf(ind.estado) < 0) errores.push(donde + ': estado inválido "' + ind.estado + '"');
    ['nombre', 'definicion', 'fuente', 'dueno', 'frecuencia', 'meta', 'valor', 'detalle'].forEach(function (campo) {
      if (!ind[campo] && ind[campo] !== 0) errores.push(donde + ': falta ' + campo);
    });
    if (ind.serie) {
      if (!ind.serie.meses || !ind.serie.meses.length) errores.push(donde + ': serie sin meses');
      Object.keys(ind.serie.valores || {}).forEach(function (nombre) {
        if (ind.serie.valores[nombre].length !== ind.serie.meses.length) {
          errores.push(donde + ': la serie "' + nombre + '" no coincide con los meses');
        }
      });
    }
  });

  IDS_ESPERADOS.forEach(function (id) {
    if (!vistos[id]) errores.push('falta el indicador ' + id);
  });

  if (errores.length) throw new Error('El paquete no pasó la validación: ' + errores.join('; '));
  Logger.log('Validación correcta: %s indicadores.', paquete.indicadores.length);
}

/* =============================== historial =============================== */

function leerHistorial_(clave) {
  var crudo = prop_(clave, '');
  if (!crudo) return null;
  try { return JSON.parse(crudo); } catch (e) { return null; }
}

/** Guarda el valor del mes cerrado para que la próxima corrida compare contra él. */
function guardarHistorial_(ctx, paquete) {
  var props = PropertiesService.getScriptProperties();
  var mes = ctx.mesAgenda;
  if (!mes) return;

  var f4 = paquete.indicadores.filter(function (i) { return i.id === 'F4'; })[0];
  var c5 = paquete.indicadores.filter(function (i) { return i.id === 'C5'; })[0];

  var anteriorF4 = leerHistorial_('HISTORIAL_F4');
  if (f4 && f4.estado !== 'sin_linea_base' && (!anteriorF4 || anteriorF4.mes !== mes)) {
    props.setProperty('HISTORIAL_F4', JSON.stringify({ mes: mes, valor: ctx._f4Activo || 0 }));
  }
  var anteriorC5 = leerHistorial_('HISTORIAL_C5');
  if (c5 && c5.estado !== 'sin_linea_base' && (!anteriorC5 || anteriorC5.mes !== mes)) {
    props.setProperty('HISTORIAL_C5', JSON.stringify({ mes: mes, valor: ctx._c5Total || 0 }));
  }
}

/* ================================ apoyos ================================ */

function serieEntradas_(ctx, claves) {
  var meses = ctx.mesesFinancieros.slice();
  var valores = {};
  claves.forEach(function (clave) {
    valores[clave] = meses.map(function (m) {
      var f = ctx.entradas.porMes[m];
      return f && f[clave] !== null && f[clave] !== undefined ? f[clave] : null;
    });
  });
  return { meses: meses, valores: valores };
}

function serieCitas_(ctx, filtro) {
  var meses = ctx.mesesAgenda.slice();
  var valores = { Sabana: [], Heredia: [] };
  var indice = {};
  meses.forEach(function (m, i) { indice[m] = i; valores.Sabana.push(0); valores.Heredia.push(0); });
  ctx.citas.forEach(function (c) {
    var i = indice[c.mes];
    if (i === undefined) return;
    if (!filtro(c)) return;
    if (valores[c.sede] === undefined) return;
    valores[c.sede][i]++;
  });
  // Fuera del período que cubre el tracker de la sede se deja vacío, no cero.
  ['Sabana', 'Heredia'].forEach(function (s) {
    var rango = ctx.rangoPorSede[s];
    meses.forEach(function (m, i) {
      if (!rango || m < rango.desde || m > rango.hasta) valores[s][i] = null;
    });
  });
  var ultimo = meses.length - 1;
  return {
    meses: meses,
    valores: valores,
    ultimo: {
      Sabana: ultimo >= 0 ? valores.Sabana[ultimo] : 0,
      Heredia: ultimo >= 0 ? valores.Heredia[ultimo] : 0
    }
  };
}

function serieCarolina_(ctx) {
  var meses = ctx.mesesAgenda.slice();
  var indice = {};
  var total = [], suyas = [];
  meses.forEach(function (m, i) { indice[m] = i; total.push(0); suyas.push(0); });
  ctx.citas.forEach(function (c) {
    var i = indice[c.mes];
    if (i === undefined) return;
    total[i]++;
    if (esCarolina_(c.doctor)) suyas[i]++;
  });
  return {
    meses: meses,
    valores: {
      'Carga de Carolina': suyas.map(function (s, i) {
        return total[i] ? redondear_(s / total[i] * 100, 1) : null;
      })
    }
  };
}

function serieClientesNuevos_(ctx) {
  var meses = ctx.mesesAgenda.slice();
  var indice = {};
  var valores = { Sabana: [], Heredia: [] };
  meses.forEach(function (m, i) { indice[m] = i; valores.Sabana.push(0); valores.Heredia.push(0); });
  ctx.clientesNuevos.filas.forEach(function (f) {
    var i = indice[f.mes];
    if (i === undefined) return;
    if (valores[f.sede] === undefined) return;
    valores[f.sede][i]++;
  });
  return { meses: meses, valores: valores };
}

/**
 * Pacientes con al menos una cita dentro de la ventana de 90 días, indexados
 * por las tres claves con que se puede cruzar el registro del pasivo: código de
 * Qvet, nombre de mascota con cliente, y nombre de mascota con sede. El
 * registro del pasivo escribe los nombres más cortos que el tracker, así que la
 * última clave es la que resuelve la mayoría de los cruces.
 */
function pacientesActivos_(ctx) {
  var activos = {};
  ctx.citas.forEach(function (c) {
    var corte = ctx.cortePorSede[c.sede] || ctx.corteAgenda;
    if (diasEntre_(c.fecha, corte) > DIAS_INACTIVIDAD) return;
    if (c.codigo) activos['C:' + c.codigo] = true;
    if (c.mascota && c.cliente) activos['N:' + c.mascota + '|' + c.cliente] = true;
    if (c.mascota) {
      activos['M:' + c.sede + '|' + c.mascota] = true;
      activos['M:*|' + c.mascota] = true;
    }
  });
  return activos;
}

/** ¿La fila del registro del pasivo corresponde a un paciente activo? */
function pasivoActivo_(fila, activos) {
  if (fila.codigo && activos['C:' + fila.codigo]) return true;
  if (fila.mascota && fila.cliente && activos['N:' + fila.mascota + '|' + fila.cliente]) return true;
  if (fila.mascota) {
    if (fila.sede && activos['M:' + fila.sede + '|' + fila.mascota]) return true;
    if (!fila.sede && activos['M:*|' + fila.mascota]) return true;
  }
  return false;
}

function resultadoOperativo_(fila) {
  var ingresos = (fila.ingresosSabana || 0) + (fila.ingresosHeredia || 0);
  var resultado = ingresos - (fila.costoVentas || 0) - (fila.gastosOperativos || 0);
  return { ingresos: ingresos, resultado: resultado };
}

function mesesConGastosCompletos_(ctx) {
  return ctx.entradas.meses.filter(function (m) {
    var f = ctx.entradas.porMes[m];
    if (!f.gastosCompletos) return false;
    var r = resultadoOperativo_(f);
    return r.ingresos > 0;
  });
}

function ultimoMesFinanciero_(entradas) {
  for (var i = entradas.meses.length - 1; i >= 0; i--) {
    var f = entradas.porMes[entradas.meses[i]];
    if ((f.ingresosSabana || 0) + (f.ingresosHeredia || 0) > 0) return entradas.meses[i];
  }
  return null;
}

function ultimoMesCon_(ctx, clave) {
  for (var i = ctx.entradas.meses.length - 1; i >= 0; i--) {
    var f = ctx.entradas.porMes[ctx.entradas.meses[i]];
    if (f[clave] !== null && f[clave] !== undefined && f[clave] !== '') return ctx.entradas.meses[i];
  }
  return null;
}

function estadoContraMeta_(valor, meta) {
  if (valor >= meta) return 'verde';
  if (valor >= meta * 0.9) return 'amarillo';
  return 'rojo';
}

/**
 * Estado global de un indicador con meta por sede: manda la sede peor. Una sede
 * sin dato del mes no se evalúa; si ninguna tiene dato, devuelve null.
 */
function estadoPorSede_(valores, metas) {
  var estados = [];
  for (var i = 0; i < valores.length; i++) {
    if (valores[i] === null || valores[i] === undefined) continue;
    estados.push(estadoContraMeta_(valores[i], metas[i]));
  }
  return estados.length ? peorEstado_(estados) : null;
}

function peorEstado_(lista) {
  if (lista.indexOf('rojo') >= 0) return 'rojo';
  if (lista.indexOf('amarillo') >= 0) return 'amarillo';
  return 'verde';
}

function sinLineaBase_(base, motivo) {
  base.estado = 'sin_linea_base';
  base.valor = 'Sin línea base';
  base.detalle = motivo;
  base.nota = motivo;
  return base;
}

function esDomicilio_(c) {
  return c.tipo.indexOf('domicilio') === 0;
}

function esCarolina_(doctor) {
  if (!doctor) return false;
  return doctor.indexOf('caro') === 0 || doctor === 'cf';
}

function esCancelada_(estado) {
  return ['cancelada', 'cancelado', 'no presento', 'no se presento', 'no show', 'noshow', 'ausente', 'no asistio']
    .some(function (e) { return estado.indexOf(e) === 0; });
}

function etiquetaSede_(v) {
  var n = normalizar_(v);
  if (n.indexOf('sabana') >= 0) return 'Sabana';
  if (n.indexOf('heredia') >= 0) return 'Heredia';
  return v ? String(v).trim() : '';
}

function incidenciasTracker_(ctx) {
  var n = (ctx.sabana.ilegibles || 0) + (ctx.heredia.ilegibles || 0);
  return incidencia_('filas de los trackers sin fecha o sin tipo de cita legibles', n);
}

function incidencia_(que, n) {
  if (!n) return 'Sin filas descartadas por lectura.';
  return 'Se descartaron ' + entero_(n) + ' ' + que + '.';
}

function notaEntradas_(ctx) {
  var n = ctx.entradas.ilegibles || 0;
  if (!n) return 'Sin filas descartadas en la hoja Entradas.';
  return 'Se descartaron ' + entero_(n) + ' filas de la hoja Entradas sin mes legible.';
}

/* ============================ utilidades base ============================ */

function prop_(clave, porDefecto) {
  var v = PropertiesService.getScriptProperties().getProperty(clave);
  return (v === null || v === '') ? porDefecto : v;
}

function propObligatoria_(clave) {
  var v = prop_(clave, '');
  if (!v) throw new Error('Falta la propiedad del script ' + clave + '.');
  return v;
}

function filaVacia_(fila) {
  for (var i = 0; i < fila.length; i++) {
    var v = fila[i];
    if (v !== '' && v !== null && v !== undefined) return false;
  }
  return true;
}

/** Minúsculas, sin tildes, sin espacios de más. */
function normalizar_(v) {
  if (v === null || v === undefined) return '';
  var s = String(v).trim().toLowerCase();
  s = s.replace(/[áàäâã]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
       .replace(/[óòöôõ]/g, 'o').replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n');
  return s.replace(/\s+/g, ' ');
}

/**
 * Convierte a fecha lo que traiga la celda. Acepta:
 *   - una fecha real de la hoja
 *   - texto "dd/mm/aaaa", "aaaa-mm-dd", "d de mes de aaaa"
 *   - las etiquetas escritas a mano del tipo "4 set", que toman el año y el mes
 *     del texto y el año de la última fecha buena que se vio antes.
 * Devuelve null si no logra leerla.
 */
function parseFecha_(v, ultimaFecha) {
  if (v === null || v === undefined || v === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return isNaN(v.getTime()) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
  }
  if (typeof v === 'number') {
    // Número de serie de la hoja de cálculo.
    if (v < 20000 || v > 80000) return null;
    var base = new Date(1899, 11, 30);
    base.setDate(base.getDate() + Math.floor(v));
    return base;
  }

  var s = normalizar_(v);
  if (!s) return null;

  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return fechaValida_(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
  if (m) {
    var anio = Number(m[3]);
    if (anio < 100) anio += 2000;
    return fechaValida_(anio, Number(m[2]) - 1, Number(m[1]));
  }

  // "4 set", "12 setiembre", "3 de octubre", "5 oct 2025"
  m = s.match(/^(\d{1,2})\s*(?:de\s+)?([a-z]+)\.?\s*(?:de\s+)?(\d{4})?/);
  if (m && MESES_TEXTO[m[2]] !== undefined) {
    var mes = MESES_TEXTO[m[2]];
    var dia = Number(m[1]);
    var y = m[3] ? Number(m[3]) : anioPorContexto_(ultimaFecha, mes);
    if (y === null) return null;
    return fechaValida_(y, mes, dia);
  }

  return null;
}

/**
 * Año de una etiqueta sin año. Se toma el de la última fecha buena; si esa
 * fecha ya pasó de mes (diciembre a enero), se avanza un año.
 */
function anioPorContexto_(ultimaFecha, mes) {
  if (!ultimaFecha) return null;
  var y = ultimaFecha.getFullYear();
  if (mes < ultimaFecha.getMonth() - 6) y++;
  return y;
}

function fechaValida_(anio, mes, dia) {
  if (!anio || anio < 2000 || anio > 2100) return null;
  if (mes < 0 || mes > 11) return null;
  if (dia < 1 || dia > 31) return null;
  var d = new Date(anio, mes, dia);
  return isNaN(d.getTime()) ? null : d;
}

/** Lee un número que puede venir como "₡1.234.567,89", "1,234,567.89" o texto suelto. */
function numero_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (Object.prototype.toString.call(v) === '[object Date]') return null;

  var s = String(v).replace(/[₡$\s%]/g, '').trim();
  if (!s) return null;
  var negativo = /^\(.*\)$/.test(s) || /^-/.test(s);
  s = s.replace(/[()\-]/g, '');

  var tieneComa = s.indexOf(',') >= 0;
  var tienePunto = s.indexOf('.') >= 0;
  if (tieneComa && tienePunto) {
    // El separador decimal es el que va de último.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (tieneComa) {
    var partes = s.split(',');
    if (partes.length === 2 && partes[1].length !== 3) s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
  }

  var n = parseFloat(s);
  if (!isFinite(n)) return null;
  return negativo ? -n : n;
}

function esSi_(v) {
  var s = normalizar_(v);
  if (v === true) return true;
  return ['si', 'sí', 'x', 'verdadero', 'true', '1', 'completo', 'completos'].indexOf(s) >= 0;
}

function claveMes_(fecha) {
  return Utilities.formatDate(fecha, ZONA, 'yyyy-MM');
}

/** Lee el mes de la hoja Entradas: acepta "2026-07", una fecha o "julio 2026". */
function claveMesTexto_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return claveMes_(v);
  var s = normalizar_(v);
  var m = s.match(/^(\d{4})[-\/](\d{1,2})$/);
  if (m) return m[1] + '-' + dosDigitos_(Number(m[2]));
  m = s.match(/^(\d{1,2})[-\/](\d{4})$/);
  if (m) return m[2] + '-' + dosDigitos_(Number(m[1]));
  m = s.match(/^([a-z]+)\.?\s+(?:de\s+)?(\d{4})$/);
  if (m && MESES_TEXTO[m[1]] !== undefined) return m[2] + '-' + dosDigitos_(MESES_TEXTO[m[1]] + 1);
  var f = parseFecha_(v, null);
  return f ? claveMes_(f) : null;
}

function finDeMes_(clave) {
  var anio = Number(clave.slice(0, 4));
  var mes = Number(clave.slice(5, 7));
  return new Date(anio, mes, 0);
}

function ultimosMeses_(fecha, cuantos) {
  if (!fecha) return [];
  var lista = [];
  var d = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  for (var i = cuantos - 1; i >= 0; i--) {
    var m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    lista.push(m.getFullYear() + '-' + dosDigitos_(m.getMonth() + 1));
  }
  return lista;
}

/**
 * Último mes cerrado a la fecha de corte. Si el corte cae el último día del
 * mes, ese mismo mes ya está cerrado.
 */
function mesCerrado_(corte) {
  if (!corte) return null;
  var fin = new Date(corte.getFullYear(), corte.getMonth() + 1, 0);
  if (corte.getDate() === fin.getDate()) return claveMes_(corte);
  var anterior = new Date(corte.getFullYear(), corte.getMonth(), 0);
  return claveMes_(anterior);
}

/**
 * Sedes cuyo tracker no cubre el mes de reporte completo. Su cifra del mes se
 * informa igual, pero queda corta y hay que decirlo.
 */
function notaAtraso_(ctx) {
  if (!ctx.mesAgenda) return '';
  var fin = finDeMes_(ctx.mesAgenda);
  var avisos = [];
  ['Sabana', 'Heredia'].forEach(function (s) {
    var corte = ctx.cortePorSede[s];
    if (!corte) { avisos.push('el tracker de ' + s + ' no trae citas'); return; }
    if (corte < fin) avisos.push('el tracker de ' + s + ' llega al ' + fechaLarga_(corte));
  });
  if (!avisos.length) return '';
  return 'Mes incompleto: ' + avisos.join(' y ') + '. ';
}

function maxFecha_(citas) {
  var max = null;
  for (var i = 0; i < citas.length; i++) {
    if (!max || citas[i].fecha > max) max = citas[i].fecha;
  }
  return max;
}

/** Primer y último mes que cubre un tracker, para no confundir un cero con un vacío. */
function rangoMeses_(citas) {
  if (!citas.length) return null;
  var desde = citas[0].mes, hasta = citas[0].mes;
  for (var i = 1; i < citas.length; i++) {
    if (citas[i].mes < desde) desde = citas[i].mes;
    if (citas[i].mes > hasta) hasta = citas[i].mes;
  }
  return { desde: desde, hasta: hasta };
}

function diasEntre_(desde, hasta) {
  if (!desde || !hasta) return Infinity;
  return Math.round((hasta.getTime() - desde.getTime()) / 86400000);
}

function fechaISO_(fecha) {
  return Utilities.formatDate(fecha, ZONA, 'yyyy-MM-dd');
}

function fechaLarga_(fecha) {
  var nombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  return fecha.getDate() + ' de ' + nombres[fecha.getMonth()] + ' de ' + fecha.getFullYear();
}

function nombreMesLargo_(clave) {
  var nombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  var mes = Number(clave.slice(5, 7)) - 1;
  return nombres[mes].charAt(0).toUpperCase() + nombres[mes].slice(1) + ' de ' + clave.slice(0, 4);
}

function dosDigitos_(n) {
  return (n < 10 ? '0' : '') + n;
}

function redondear_(n, decimales) {
  var f = Math.pow(10, decimales);
  return Math.round(n * f) / f;
}

function aMillones_(n) {
  return n === null || n === undefined ? null : redondear_(n / 1000000, 1);
}

/** "₡18,5M". Coma decimal, como se escribe en Costa Rica. */
function millones_(n) {
  if (n === null || n === undefined) return 'sin dato';
  var signo = n < 0 ? '−' : '';
  return signo + '₡' + decimal_(Math.abs(n) / 1000000, 1) + 'M';
}

function decimal_(n, decimales) {
  if (n === null || n === undefined || !isFinite(n)) return 'sin dato';
  return redondear_(n, decimales).toFixed(decimales).replace('.', ',');
}

function porcentaje_(n) {
  if (n === null || n === undefined || !isFinite(n)) return 'sin dato';
  var signo = n < 0 ? '−' : '';
  return signo + decimal_(Math.abs(n), 1) + '%';
}

function entero_(n) {
  if (n === null || n === undefined || !isFinite(n)) return 'sin dato';
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function recortar_(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

/** El registro de Apps Script corta las líneas largas: se imprime por partes. */
function imprimirLargo_(texto) {
  var tamano = 6000;
  for (var i = 0; i < texto.length; i += tamano) {
    Logger.log(texto.slice(i, i + tamano));
  }
}
