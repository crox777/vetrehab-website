// Valida un JSON del CMI con la misma función validate() del Worker
// (src/index.js) y lo compara en estructura con apps-script/ejemplo_salida.json.
//
//   node validar_worker.mjs salida.json
//
// No hace ninguna llamada de red.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const fuente = readFileSync(join(aqui, "..", "src", "index.js"), "utf8");

function extraer(re, que) {
  const m = fuente.match(re);
  if (!m) throw new Error(`No se encontró ${que} en src/index.js`);
  return m[0];
}
const constantes = ["IDS", "PERSPECTIVAS", "ESTADOS"]
  .map(n => extraer(new RegExp(`^const ${n} = .*;$`, "m"), n)).join("\n");
const funcion = extraer(/^function validate\(doc\) \{[\s\S]*?^\}$/m, "validate()");
const validate = new Function(`${constantes}\n${funcion}\nreturn validate;`)();

const ruta = process.argv[2];
if (!ruta) { console.error("Uso: node validar_worker.mjs salida.json"); process.exit(2); }
const doc = JSON.parse(readFileSync(ruta, "utf8"));
const ejemplo = JSON.parse(readFileSync(join(aqui, "..", "apps-script", "ejemplo_salida.json"), "utf8"));

let fallas = 0;
const problemas = validate(doc);
if (problemas.length) { fallas++; console.log("validate() del Worker: RECHAZA\n  " + problemas.join("\n  ")); }
else console.log(`validate() del Worker: acepta (${doc.indicadores.length} indicadores)`);
if (!doc.corte || !Array.isArray(doc.indicadores)) process.exit(1);

const llaves = o => Object.keys(o).sort().join(",");
const dif = [];
if (llaves(doc) !== llaves(ejemplo)) dif.push(`llaves de primer nivel: ${llaves(doc)} contra ${llaves(ejemplo)}`);
if (llaves(doc.corte) !== llaves(ejemplo.corte)) dif.push("llaves de corte distintas");
const ids = doc.indicadores.map(i => i.id).join(",");
const idsEj = ejemplo.indicadores.map(i => i.id).join(",");
if (ids !== idsEj) dif.push(`orden de indicadores: ${ids} contra ${idsEj}`);
const porId = Object.fromEntries(ejemplo.indicadores.map(i => [i.id, i]));
const fijos = ["perspectiva", "nombre", "dueno", "frecuencia", "meta"];
const avisos = [];
for (const ind of doc.indicadores) {
  const ej = porId[ind.id];
  if (!ej) continue;
  const base = ["id", ...fijos, "definicion", "fuente", "estado", "valor", "detalle", "nota"];
  const faltan = base.filter(k => !(k in ind));
  if (faltan.length) dif.push(`${ind.id}: faltan ${faltan.join(", ")}`);
  const extra = Object.keys(ind).filter(k => !base.includes(k) && k !== "serie");
  if (extra.length) dif.push(`${ind.id}: llaves extra ${extra.join(", ")}`);
  if (ind.serie && !("unidad" in ind.serie)) dif.push(`${ind.id}: serie sin unidad`);
  for (const k of fijos) if (ind[k] !== ej[k]) avisos.push(`${ind.id}.${k} difiere del ejemplo`);
  if (!!ind.serie !== !!ej.serie) avisos.push(`${ind.id}: serie ${ind.serie ? "presente" : "ausente"} (en el ejemplo ${ej.serie ? "presente" : "ausente"})`);
}
if (dif.length) { fallas++; console.log("Estructura contra ejemplo_salida.json: DIFIERE\n  " + dif.join("\n  ")); }
else console.log("Estructura contra ejemplo_salida.json: igual (llaves, orden de indicadores, campos por indicador)");
if (avisos.length) console.log("Diferencias de contenido esperables:\n  " + avisos.join("\n  "));
process.exit(fallas ? 1 : 0);
