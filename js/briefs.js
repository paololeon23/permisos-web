/* Tarjetas de seguimiento. Solo registros reales de campo y permisos. */
(function (root) {
  var QBE = root.QBE || (root.QBE = {});

  var PACKS = {
    alertas: {
      title: "Alertas",
      kicker: "Entraron hoy, en este momento",
      img: "assets/alertas.png",
      empty: "Nadie ha entrado en este momento.",
    },
    observa: {
      title: "En observación",
      kicker: "Más de 3 registros de incidencia",
      img: "assets/arandano.png",
      empty: "Nadie supera 3 registros.",
    },
    hoy: {
      title: "Permisos de hoy",
      kicker: "Pases de salida de hoy",
      img: "assets/calendario.png",
      empty: "No hay pases de salida hoy.",
    },
  };

  function hoyIso() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function liveRows(key) {
    if (key === "alertas") {
      var hoy = QBE.campo && QBE.campo.today ? QBE.campo.today() : [];
      return hoy.map(function (r) {
        return {
          nombre: r.trabajador || "Sin nombre",
          dni: r.dni || "",
          meta: (r.hora || "—") + " · " + (r.incidencia || "Incidencia"),
          extra: r.fecha || "",
        };
      });
    }
    if (key === "observa") {
      var all = QBE.campo && QBE.campo.rows ? QBE.campo.rows() : [];
      return all
        .filter(function (r) { return Number(r.acumulado) >= 3; })
        .map(function (r) {
          return {
            nombre: r.trabajador || "Sin nombre",
            dni: r.dni || "",
            meta: (r.acumulado || 0) + " registros · observación",
            extra: (r.incidencia || "Incidencia") + (r.fecha ? " · " + r.fecha : ""),
          };
        });
    }
    if (key === "hoy") {
      var recs = QBE.app && QBE.app.records ? QBE.app.records() : [];
      var day = hoyIso();
      return recs
        .filter(function (r) { return QBE.data && QBE.data.rowDay && QBE.data.rowDay(r) === day; })
        .map(function (r) {
          var hora = QBE.data && QBE.data.fmtTime ? QBE.data.fmtTime(r.horaSalida || r.horaRegistro) : "";
          return {
            nombre: (QBE.data && QBE.data.fullName && QBE.data.fullName(r)) || r.nombres || "Sin nombre",
            dni: r.dni || "",
            meta: (hora && hora !== "-" ? hora : "—") + " · " + (QBE.data && QBE.data.tipoRegistro ? QBE.data.tipoRegistro(r) : "Pase de salida"),
            extra: r.motivo ? "Motivo: " + r.motivo : "",
          };
        });
    }
    return [];
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  var ICONS = {
    alertas:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 14 6 8z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>',
    observa:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    hoy:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8.5 15l2.2 2.2 4.3-4.4"/></svg>',
  };
  function rowHtml(r, full, key) {
    var ico = ICONS[key] || "";
    return (
      '<li><em class="row-ico row-ico-' + esc(key) + '">' + ico + "</em><div><strong>" + esc(r.nombre) +
      "</strong><small>" + esc(r.dni) + (full ? " · " + esc(r.extra) : "") + "</small></div><span>" +
      esc(r.meta) + "</span></li>"
    );
  }
  function paintList(id, key) {
    var el = document.getElementById(id);
    var pack = PACKS[key];
    if (!el || !pack) return;
    var rows = liveRows(key);
    el.innerHTML = rows.length
      ? rows.slice(0, 5).map(function (r) { return rowHtml(r, false, key); }).join("")
      : '<li class="note-empty">' + esc(pack.empty) + "</li>";
    if (key === "alertas") {
      var alertN = document.getElementById("hr-alertas");
      if (alertN) alertN.textContent = String(rows.length);
    }
  }
  var PAGE = 5;
  var view = { key: "", page: 1 };
  function paintModal() {
    var pack = PACKS[view.key];
    var list = document.getElementById("brief-modal-list");
    var pager = document.getElementById("brief-pager");
    if (!pack || !list) return;
    var rows = liveRows(view.key);
    var pages = Math.max(1, Math.ceil(rows.length / PAGE));
    if (view.page > pages) view.page = pages;
    if (view.page < 1) view.page = 1;
    var start = (view.page - 1) * PAGE;
    list.innerHTML = rows.length
      ? rows.slice(start, start + PAGE).map(function (r) { return rowHtml(r, true, view.key); }).join("")
      : '<li class="note-empty">' + esc(pack.empty) + "</li>";
    if (!pager) return;
    var btns = "";
    for (var i = 1; i <= pages; i++) {
      btns += '<button type="button" data-brief-go="' + i + '"' + (i === view.page ? ' class="is-on"' : "") + ">" + i + "</button>";
    }
    pager.innerHTML =
      "<span>" + rows.length + " registros</span><div>" +
      '<button type="button" data-brief-go="' + (view.page - 1) + '"' + (view.page <= 1 ? " disabled" : "") + ">‹</button>" +
      btns +
      '<button type="button" data-brief-go="' + (view.page + 1) + '"' + (view.page >= pages ? " disabled" : "") + ">›</button></div>";
  }
  function open(key) {
    var pack = PACKS[key];
    var modal = document.getElementById("brief-modal");
    if (!pack || !modal) return;
    view.key = key;
    view.page = 1;
    document.getElementById("brief-modal-img").src = pack.img;
    document.getElementById("brief-modal-kicker").textContent = pack.kicker;
    document.getElementById("brief-modal-title").textContent = pack.title;
    paintModal();
    modal.hidden = false;
  }
  function close() {
    var modal = document.getElementById("brief-modal");
    if (modal) modal.hidden = true;
  }
  function bind() {
    paintList("brief-alertas", "alertas");
    paintList("brief-observa", "observa");
    paintList("brief-hoy", "hoy");
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-brief]");
      if (btn) {
        open(btn.getAttribute("data-brief"));
        return;
      }
      var go = e.target.closest("[data-brief-go]");
      if (go && !go.disabled) {
        view.page = Number(go.getAttribute("data-brief-go")) || 1;
        paintModal();
        return;
      }
      if (e.target.id === "brief-modal-close" || e.target.id === "brief-modal") close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  function rows(key) {
    return PACKS[key] ? liveRows(key) : [];
  }
  function refresh() {
    paintList("brief-alertas", "alertas");
    paintList("brief-observa", "observa");
    paintList("brief-hoy", "hoy");
    if (view.key && document.getElementById("brief-modal") && !document.getElementById("brief-modal").hidden) {
      paintModal();
    }
  }
  QBE.briefs = { open: open, close: close, rows: rows, refresh: refresh };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})(typeof window !== "undefined" ? window : globalThis);
