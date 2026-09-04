(() => {
  const ORDER = ["F1","F2","F4","F5","F6","C1","C2","C4","C5","P1","P2","P3","P5","E1","E2"];
  const ESTADO_TXT = { verde: "Cumple", amarillo: "Atención", rojo: "Por debajo", sin_linea_base: "Sin línea base" };
  const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","set","oct","nov","dic"];
  const $ = (s, r = document) => r.querySelector(s);

  function fechaLarga(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const largo = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","setiembre","octubre","noviembre","diciembre"];
    return `${d} de ${largo[m - 1]} de ${y}`;
  }
  function fechaHora(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("es-CR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Costa_Rica" });
  }
  function mesCorto(ym) { const [y, m] = ym.split("-").map(Number); return `${MESES[m - 1]} ${String(y).slice(2)}`; }

  function sparkline(svg, serie) {
    const names = Object.keys(serie.valores || {});
    if (!names.length || !serie.meses || !serie.meses.length) return false;
    const W = 320, H = 90, padL = 4, padB = 16, padT = 6;
    const n = serie.meses.length, k = names.length;
    const all = names.flatMap(nm => serie.valores[nm]).filter(v => typeof v === "number");
    if (!all.length) return false;
    const max = Math.max(...all, 0), min = Math.min(...all, 0);
    const span = max - min || 1;
    const y = v => padT + (H - padB - padT) * (1 - (v - min) / span);
    const slotW = (W - padL * 2) / n;
    const barW = Math.max(2, (slotW - 3) / k);
    let out = `<line class="axis" x1="${padL}" y1="${y(0)}" x2="${W - padL}" y2="${y(0)}"/>`;
    names.forEach((nm, si) => {
      serie.valores[nm].forEach((v, i) => {
        if (typeof v !== "number") return;
        const x = padL + i * slotW + 1.5 + si * barW;
        const y0 = y(0), y1 = y(v);
        out += `<rect class="bar s${si + 1}" x="${x.toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1, Math.abs(y0 - y1)).toFixed(1)}" rx="1"><title>${nm} ${mesCorto(serie.meses[i])}: ${v}${serie.unidad ? " " + serie.unidad : ""}</title></rect>`;
      });
    });
    const step = n > 8 ? Math.ceil(n / 6) : 1;
    serie.meses.forEach((m, i) => {
      if (i % step && i !== n - 1) return;
      out += `<text class="lbl" x="${(padL + i * slotW + slotW / 2).toFixed(1)}" y="${H - 3}" text-anchor="middle">${mesCorto(m)}</text>`;
    });
    svg.innerHTML = out;
    svg.setAttribute("aria-label", `Serie mensual: ${names.join(", ")}`);
    return names;
  }

  function render(doc) {
    $("#corte").textContent = `Corte: ${fechaLarga(doc.corte.financiero)} (financiero) y ${fechaLarga(doc.corte.agenda)} (agenda).`;
    $("#generado").textContent = `Generado ${fechaHora(doc.generado)}${doc.recibido ? `, publicado ${fechaHora(doc.recibido)}` : ""}.`;

    const counts = { verde: 0, amarillo: 0, rojo: 0, sin_linea_base: 0 };
    document.querySelectorAll(".persp .grid").forEach(g => g.innerHTML = "");
    const tpl = $("#card");
    const byId = Object.fromEntries(doc.indicadores.map(i => [i.id, i]));
    for (const id of ORDER) {
      const ind = byId[id];
      if (!ind) continue;
      counts[ind.estado] = (counts[ind.estado] || 0) + 1;
      const node = tpl.content.cloneNode(true);
      $(".id", node).textContent = ind.id;
      const est = $(".estado", node);
      est.textContent = ESTADO_TXT[ind.estado] || ind.estado;
      est.dataset.e = ind.estado;
      $(".nombre", node).textContent = ind.nombre;
      $(".valor", node).textContent = ind.valor;
      $(".detalle", node).textContent = ind.detalle;
      $(".meta span", node).textContent = ind.meta;
      $(".definicion", node).textContent = ind.definicion;
      $(".fuente", node).textContent = `Fuente: ${ind.fuente}. Dueño: ${ind.dueno}. Frecuencia: ${ind.frecuencia}.`;
      if (ind.nota) { const n = $(".nota", node); n.textContent = ind.nota; n.hidden = false; }
      if (ind.serie) {
        const svg = $(".spark", node);
        const names = sparkline(svg, ind.serie);
        if (names) {
          svg.hidden = false;
          const ley = $(".leyenda", node);
          ley.innerHTML = names.map((nm, i) => `<span><i class="s${i + 1}"></i>${nm}${ind.serie.unidad ? " (" + ind.serie.unidad + ")" : ""}</span>`).join("");
          ley.hidden = false;
        }
      }
      const grid = $(`.persp[data-p="${ind.perspectiva}"] .grid`);
      (grid || $(".persp .grid")).appendChild(node);
    }
    $("#resumen").innerHTML = ["verde","amarillo","rojo","sin_linea_base"]
      .map(e => `<span><i style="background:var(--${e === "sin_linea_base" ? "gris" : e === "amarillo" ? "ambar" : e})"></i>${counts[e] || 0} ${ESTADO_TXT[e].toLowerCase()}</span>`).join("");
  }

  async function cargar(v) {
    const aviso = $("#aviso");
    aviso.hidden = true;
    try {
      const r = await fetch(`data.json${v ? "?v=" + encodeURIComponent(v) : ""}`, { credentials: "same-origin", cache: "no-store" });
      if (r.status === 404) { aviso.textContent = "Todavía no hay datos publicados. El primer envío del script llena el cuadro."; aviso.hidden = false; return; }
      if (!r.ok) throw new Error(r.status);
      render(await r.json());
    } catch (e) {
      aviso.textContent = "No se pudo cargar el cuadro. Recargá la página o avisale a René.";
      aviso.hidden = false;
    }
  }

  async function versiones() {
    try {
      const r = await fetch("versions.json", { credentials: "same-origin", cache: "no-store" });
      const list = r.ok ? await r.json() : [];
      const sel = $("#versiones");
      sel.innerHTML = `<option value="">Actual</option>` + list.map(v => `<option value="${v.key}">${fechaHora(v.recibido)}</option>`).join("");
      sel.addEventListener("change", () => cargar(sel.value));
    } catch {}
  }

  cargar();
  versiones();
})();
