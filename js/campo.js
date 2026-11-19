/* Incidencias de campo — solo GET de la hoja ACUMULADOS. */
(function (root) {
  var QBE = root.QBE || (root.QBE = {});
  var API =
    "https://script.google.com/macros/s/AKfycbzGUtiJX7Qr9RY64qy_TjXj8N7vaLW1Rn8UCF8HezJPXng0HmUKJ7m6pVJu8A9JzHQ7/exec";
  var COUNTS = [
    { id: "instruccion", label: "Instrucción" },
    { id: "tardia", label: "Tardía" },
    { id: "falta", label: "Inasistencia" },
    { id: "epp", label: "EPP" },
    { id: "bpa", label: "BPA" },
    { id: "fruta", label: "Fruta" },
    { id: "conducta", label: "Conducta" },
  ];
  var SIZES = [20, 50, 100];
  var state = { rows: [], view: [], page: 1, size: 20, dni: "", loaded: false, busy: false };

  function $(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function fold(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
  function num(v) {
    var n = Number(v);
    return isFinite(n) && n > 0 ? n : 0;
  }
  function nivelDe(row) {
    var a = num(row.acumulado);
    if (row.tipo === "medida" || row.tipo === "dt" || a >= 3) return "Medida";
    if (row.tipo === "critico" || row.tipo === "escrita" || a >= 2) return "Estado crítico";
    return "Incidencia";
  }
  function listFrom(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.records)) return data.records;
    return [];
  }
  function normalize(raw) {
    raw = raw || {};
    var t = raw.trabajador || {};
    var s = raw.supervisor || {};
    var c = raw.conteos || {};
    var conteos = {};
    COUNTS.forEach(function (item) {
      conteos[item.id] = num(c[item.id]);
    });
    var acumulado = num(raw.acumulado);
    COUNTS.forEach(function (item) {
      if (conteos[item.id] > acumulado) acumulado = conteos[item.id];
    });
    return {
      id: String(raw.id || ""),
      fecha: String(raw.fecha || ""),
      hora: String(raw.hora || ""),
      trabajador: String(t.nombre || ""),
      dni: String(t.dni || ""),
      cargo: String(t.cargo || ""),
      incidencia: String(raw.motivoLabel || ""),
      responsable: String(s.nombre || ""),
      dniResp: String(s.dni || ""),
      conteos: conteos,
      acumulado: acumulado,
      tipo: raw.tipo || "",
      texto: String(raw.texto || raw.descripcion || ""),
    };
  }
  function countHtml(n) {
    n = num(n);
    if (!n) return '<span class="cnt cnt-0">—</span>';
    var cls = n >= 3 ? "cnt-3" : n === 2 ? "cnt-2" : "cnt-1";
    return '<span class="cnt ' + cls + '">' + n + "</span>";
  }
  function nivelHtml(label) {
    var cls = "nivel-inc";
    if (label === "Medida") cls = "nivel-med";
    else if (label === "Estado crítico") cls = "nivel-cri";
    return '<span class="nivel ' + cls + '">' + esc(label) + "</span>";
  }
  function isoFecha(fecha) {
    var m = String(fecha || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
    if (/^\d{4}-\d{2}-\d{2}/.test(String(fecha || ""))) return String(fecha).slice(0, 10);
    return "";
  }
  function applyFilter() {
    var desde = $("campo-desde") ? String($("campo-desde").value || "") : "";
    var hasta = $("campo-hasta") ? String($("campo-hasta").value || "") : "";
    var motivo = $("campo-motivo") ? String($("campo-motivo").value || "*") : "*";
    state.view = (state.rows || []).filter(function (r) {
      var day = isoFecha(r.fecha);
      if (desde && day && day < desde) return false;
      if (hasta && day && day > hasta) return false;
      if (motivo && motivo !== "*") {
        var hit = num(r.conteos[motivo]) > 0;
        var label = COUNTS.filter(function (c) { return c.id === motivo; })[0];
        if (!hit && label && fold(r.incidencia).indexOf(fold(label.label)) >= 0) hit = true;
        if (!hit) return false;
      }
      return true;
    });
    var pages = Math.max(1, Math.ceil(state.view.length / state.size));
    if (state.page > pages) state.page = pages;
  }
  function paintKpis() {
    var rows = state.view;
    var personas = {};
    var crit = 0;
    var med = 0;
    rows.forEach(function (r) {
      if (r.dni) personas[r.dni] = 1;
      var n = nivelDe(r);
      if (n === "Medida") med += 1;
      else if (n === "Estado crítico") crit += 1;
    });
    if ($("campo-kpi-n")) $("campo-kpi-n").textContent = String(rows.length);
    if ($("campo-kpi-p")) $("campo-kpi-p").textContent = String(Object.keys(personas).length);
    if ($("campo-kpi-c")) $("campo-kpi-c").textContent = String(crit);
    if ($("campo-kpi-m")) $("campo-kpi-m").textContent = String(med);
    if ($("hr-campo")) $("hr-campo").textContent = String(rows.length);
    if ($("side-campo")) $("side-campo").textContent = String(rows.length);
    if (QBE.notify && QBE.notify.sync) QBE.notify.sync();
  }
  function paint() {
    applyFilter();
    var head = $("campo-head");
    var body = $("campo-body");
    if (!head || !body) return;
    var headers = ["Código", "Fecha", "Hora", "Trabajador", "DNI", "Cargo", "Nivel", "Incidencia", "Responsable", "Acumulado"];
    head.innerHTML = headers.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("");
    var pages = Math.max(1, Math.ceil(state.view.length / state.size));
    var from = (state.page - 1) * state.size;
    var pageRows = state.view.slice(from, from + state.size);
    if (!pageRows.length) {
      body.innerHTML =
        '<tr class="empty"><td colspan="' +
        headers.length +
        '">' +
        (state.dni
          ? "No hay acumulados para ese DNI."
          : "No hay acumulados para ese corte. Busque un DNI para ver su historial.") +
        "</td></tr>";
    } else {
      body.innerHTML = pageRows
        .map(function (r) {
          var nivel = nivelDe(r);
          var cells = [
            esc(r.id || "—"),
            esc(r.fecha || "—"),
            esc(r.hora || "—"),
            esc(r.trabajador || "—"),
            esc(r.dni || "—"),
            esc(r.cargo || "—"),
            nivelHtml(nivel),
            esc(r.incidencia || "—"),
            esc(r.responsable || "—"),
            '<button type="button" class="cnt-btn" data-campo-open="' + esc(r.id) + '" aria-label="Ver acumulado">' + countHtml(r.acumulado) + "</button>",
          ];
          return '<tr class="campo-row" data-campo-open="' + esc(r.id) + '">' + cells.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
        })
        .join("");
    }
    var pager = $("campo-pager");
    if (pager) {
      var opts = SIZES.map(function (n) {
        return '<option value="' + n + '"' + (state.size === n ? " selected" : "") + ">" + n + "</option>";
      }).join("");
      pager.innerHTML =
        '<div class="pager-size"><span class="pager-label">Mostrar</span>' +
        '<select class="pager-select" data-campo-size aria-label="Filas por página">' +
        opts +
        '</select><span class="pager-label">por página</span></div>' +
        '<div class="pager-nav">' +
        '<button type="button" class="pager-btn" data-campo-go="1"' + (state.page <= 1 ? " disabled" : "") + ">«</button>" +
        '<button type="button" class="pager-btn" data-campo-pg="-1"' + (state.page <= 1 ? " disabled" : "") + ">‹</button>" +
        '<span class="pager-info">Página <strong>' + state.page + "</strong> de <strong>" + pages + "</strong></span>" +
        '<button type="button" class="pager-btn" data-campo-pg="1"' + (state.page >= pages ? " disabled" : "") + ">›</button>" +
        '<button type="button" class="pager-btn" data-campo-go="' + pages + '"' + (state.page >= pages ? " disabled" : "") + ">»</button>" +
        "</div>";
    }
    paintKpis();
    paintAlertas(state.rows || []);
    var chip = $("campo-chip");
    if (chip) {
      chip.textContent = state.dni
        ? "Historial del DNI " + state.dni + " · solo lectura"
        : "Acumulados de la hoja. Busque un DNI para ver a una persona.";
    }
  }
  function paintAlertas(rows) {
    rows = rows || [];
    var med = 0;
    var cri = 0;
    var inc = 0;
    var byTipo = {};
    COUNTS.forEach(function (c) { byTipo[c.id] = 0; });
    rows.forEach(function (r) {
      var n = nivelDe(r);
      if (n === "Medida") med += 1;
      else if (n === "Estado crítico") cri += 1;
      else inc += 1;
      COUNTS.forEach(function (c) {
        if (num(r.conteos[c.id]) > 0 || fold(r.incidencia).indexOf(fold(c.label)) >= 0) byTipo[c.id] += 1;
      });
    });
    var total = Math.max(rows.length, 1);
    function setBar(id, n) {
      var el = $(id);
      if (el) el.textContent = String(n);
    }
    function setWidth(id, n) {
      var el = $(id);
      if (el) el.style.width = Math.round((n / total) * 100) + "%";
    }
    setBar("alert-med", med);
    setBar("alert-cri", cri);
    setBar("alert-inc", inc);
    setWidth("alert-med-bar", med);
    setWidth("alert-cri-bar", cri);
    setWidth("alert-inc-bar", inc);
    var list = $("alert-list");
    if (list) {
      var watch = rows.filter(function (r) {
        var n = nivelDe(r);
        return n === "Medida" || n === "Estado crítico";
      }).slice(0, 6);
      if (!watch.length) {
        list.innerHTML = '<li class="alert-empty">Sin casos en crítico o medida para este corte.</li>';
      } else {
        list.innerHTML = watch.map(function (r) {
          var n = nivelDe(r);
          var cls = n === "Medida" ? "nivel-med" : "nivel-cri";
          return (
            "<li><div><strong>" + esc(r.trabajador || "—") + "</strong><small>" +
            esc(r.dni || "") + " · " + esc(r.incidencia || "—") + " · " + esc(r.fecha || "") +
            '</small></div><span class="nivel ' + cls + '">' + esc(n) + "</span></li>"
          );
        }).join("");
      }
    }
    var dist = $("alert-dist");
    if (dist) {
      var max = 1;
      COUNTS.forEach(function (c) { if (byTipo[c.id] > max) max = byTipo[c.id]; });
      dist.innerHTML = COUNTS.map(function (c) {
        var n = byTipo[c.id];
        var w = Math.round((n / max) * 100);
        return (
          '<div class="alert-row"><span>' + esc(c.label) + "</span><b>" + n +
          '</b><div class="alert-bar"><i style="width:' + w + '%"></i></div></div>'
        );
      }).join("");
    }
  }
  function setLoading(on, text) {
    var el = $("loading");
    if (!el) return;
    el.hidden = !on;
    var t = $("loading-text");
    if (t && text) t.textContent = text;
  }
  function load(dni, quiet) {
    if (state.busy) return Promise.resolve();
    state.busy = true;
    state.dni = String(dni || "").replace(/\D/g, "");
    if (!quiet) setLoading(true, "Cargando incidencias…");
    var url = API + (state.dni ? "?dni=" + encodeURIComponent(state.dni) : "");
    return fetch(url, { method: "GET", cache: "no-store", redirect: "follow" })
      .then(function (res) {
        return res.text().then(function (t) {
          if (!res.ok) throw new Error("No se pudo leer acumulados.");
          var data = t ? JSON.parse(t) : [];
          state.rows = listFrom(data).map(normalize);
          state.page = 1;
          state.loaded = true;
          paint();
          if (!quiet && QBE.shell && QBE.shell.toast) {
            QBE.shell.toast(state.rows.length + " acumulado" + (state.rows.length === 1 ? "" : "s"));
          }
        });
      })
      .catch(function (err) {
        state.rows = [];
        state.loaded = true;
        paint();
        if (!quiet && QBE.shell && QBE.shell.toast) {
          QBE.shell.toast((err && err.message) || "No se pudo cargar incidencias.", true);
        }
      })
      .finally(function () {
        state.busy = false;
        if (!quiet) setLoading(false);
      });
  }
  function ensure() {
    if (!state.loaded) load("");
    else paint();
  }
  function reload(quiet) {
    load(state.dni, quiet);
  }
  function bind() {
    if (bind.done) return;
    bind.done = true;
    var body = $("campo-body");
    if (body) {
      body.addEventListener("click", function (e) {
        var hit = e.target.closest("[data-campo-open]");
        if (!hit) return;
        openActa(hit.getAttribute("data-campo-open"));
      });
    }
    var modal = $("campo-modal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target.id === "campo-modal" || e.target.id === "campo-modal-close") closeActa();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeActa();
    });
    var dni = $("campo-dni");
    var go = function () {
      load(dni ? dni.value : "");
    };
    if ($("campo-buscar")) $("campo-buscar").addEventListener("click", go);
    if (dni) {
      dni.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          go();
        }
      });
    }
    if ($("campo-hoy")) {
      $("campo-hoy").addEventListener("click", function () {
        if (dni) dni.value = "";
        var hoy = fechaHoyInput();
        if ($("campo-desde")) $("campo-desde").value = hoy;
        if ($("campo-hasta")) $("campo-hasta").value = hoy;
        if ($("campo-motivo")) {
          $("campo-motivo").value = "*";
          if (QBE.selects) QBE.selects.refresh($("campo-motivo"));
        }
        if (state.dni) load("");
        else {
          state.page = 1;
          paint();
        }
      });
    }
    ["campo-desde", "campo-hasta", "campo-motivo"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("change", function () {
        state.page = 1;
        paint();
      });
    });
    var pager = $("campo-pager");
    if (pager) {
      pager.addEventListener("click", function (e) {
        var goBtn = e.target.closest("[data-campo-go]");
        if (goBtn && !goBtn.disabled) {
          state.page = Number(goBtn.getAttribute("data-campo-go")) || 1;
          paint();
          return;
        }
        var step = e.target.closest("[data-campo-pg]");
        if (!step || step.disabled) return;
        state.page += Number(step.getAttribute("data-campo-pg")) || 0;
        paint();
      });
      pager.addEventListener("change", function (e) {
        var sel = e.target.closest("[data-campo-size]");
        if (!sel) return;
        var n = Number(sel.value);
        if (SIZES.indexOf(n) < 0) return;
        state.size = n;
        state.page = 1;
        paint();
      });
    }
  }

  function openActa(id) {
    var row = null;
    (state.rows || []).forEach(function (r) {
      if (String(r.id) === String(id)) row = r;
    });
    var modal = $("campo-modal");
    var body = $("campo-modal-body");
    if (!row || !modal || !body) return;
    var nivel = nivelDe(row);
    if ($("campo-modal-kicker")) $("campo-modal-kicker").textContent = row.fecha + " · " + (row.hora || "—");
    if ($("campo-modal-name")) $("campo-modal-name").textContent = row.trabajador || "Sin nombre";
    var regs = COUNTS.filter(function (c) { return num(row.conteos[c.id]) > 0; });
    var tabla = regs.length
      ? '<table class="acta-table"><thead><tr><th>Registro</th><th>Cantidad</th></tr></thead><tbody>' +
        regs.map(function (c) {
          return "<tr><td>" + esc(c.label) + "</td><td>" + countHtml(row.conteos[c.id]) + "</td></tr>";
        }).join("") +
        "<tr class=\"acta-total\"><td>Acumulado</td><td>" + countHtml(row.acumulado) + "</td></tr></tbody></table>"
      : '<p class="acta-empty">Sin cantidades en este registro.</p>';
    var frases = String(row.texto || "").replace(/\.\s+/g, ".|").split("|").filter(function (p) { return p.trim(); });
    var texto = frases.length
      ? "<ul class=\"acta-texto\">" + frases.map(function (p) { return "<li>" + esc(p.trim()) + "</li>"; }).join("") + "</ul>"
      : '<p class="acta-empty">Sin constancia escrita.</p>';
    body.innerHTML =
      '<div class="acta-top">' + nivelHtml(nivel) + "<span>" + esc(row.id || "—") + "</span></div>" +
      '<dl class="acta-facts">' +
      "<div><dt>DNI</dt><dd>" + esc(row.dni || "—") + "</dd></div>" +
      "<div><dt>Cargo</dt><dd>" + esc(row.cargo || "—") + "</dd></div>" +
      "<div><dt>Incidencia</dt><dd>" + esc(row.incidencia || "—") + "</dd></div>" +
      "<div><dt>Responsable</dt><dd>" + esc(row.responsable || "—") + "</dd></div>" +
      "<div><dt>DNI responsable</dt><dd>" + esc(row.dniResp || "—") + "</dd></div>" +
      "</dl>" +
      '<section class="acta-block"><h3>Registros</h3>' + tabla + "</section>" +
      '<section class="acta-block"><h3>Constancia</h3>' + texto + "</section>";
    modal.hidden = false;
  }
  function closeActa() {
    var modal = $("campo-modal");
    if (modal) modal.hidden = true;
  }
  function rows() {
    return state.rows.slice();
  }
  function fechaHoyInput() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function today() {
    var hoy = fechaHoyInput();
    return state.rows.filter(function (r) { return isoFecha(r.fecha) === hoy; });
  }
  QBE.campo = { bind: bind, ensure: ensure, reload: reload, load: load, rows: rows, today: today };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})(typeof window !== "undefined" ? window : globalThis);
