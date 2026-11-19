/* Tabla de permisos + acciones PDF. */
(function (root) {
  var QBE = root.QBE || (root.QBE = {});
  var SIZES = [20, 50, 100];
  var state = {
    key: "fechaRegistro",
    dir: -1,
    page: 1,
    size: (QBE.config && QBE.config.pageSize) || 20,
    _rows: [],
  };
  if (SIZES.indexOf(state.size) < 0) state.size = 20;

  var COLS = [
    { key: "fechaRegistro", label: "Fecha" },
    { key: "horaSalida", label: "Hora" },
    { key: "dni", label: "DNI" },
    { key: "nombres", label: "Colaborador" },
    { key: "motivo", label: "Motivo" },
    { key: "responsable", label: "Responsable" },
    { key: "carnetVerificado", label: "Carnet" },
    { key: "_pdf", label: "PDF", action: true },
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function carnetLabel(r) {
    return QBE.data.esSi(r.carnetVerificado) ? "OK" : "—";
  }
  function cell(r, c) {
    if (c.key === "_pdf") {
      return (
        '<button type="button" class="pdf-row-btn" data-pdf="' +
        esc(r._uid || r.id || r.fila || "") +
        '" title="Abrir formulario QU-GH-FR-16">PDF FR-16</button>'
      );
    }
    if (c.key === "fechaRegistro") return esc(QBE.data.fmtDate(r.fechaRegistro || r.fechaSalida || r.fecha));
    if (c.key === "horaSalida") return esc(QBE.data.fmtTime(r.horaSalida || r.horaRegistro));
    if (c.key === "nombres") return esc(QBE.data.fullName(r) || "—");
    if (c.key === "responsable") return esc(r.responsable || r.jefeDirecto || "—");
    if (c.key === "carnetVerificado") {
      var ok = QBE.data.esSi(r.carnetVerificado);
      return '<span class="pill ' + (ok ? "pill-ok" : "pill-mute") + '">' + (ok ? "OK" : "—") + "</span>";
    }
    if (c.key === "motivo") {
      var tipo = QBE.data.tipoRegistro(r);
      var tipoCls = tipo === "Incidencia" ? "pill-incid" : "pill-pase";
      var motivoTxt = r.motivo ? '<span class="motivo-sub">' + esc(r.motivo) + "</span>" : "";
      return '<span class="pill ' + tipoCls + '">' + esc(tipo) + "</span>" + motivoTxt;
    }
    return esc(r[c.key] || "—");
  }
  function paintMount(headId, bodyId, pagerId, countId, pageRows, sorted, pages) {
    var body = document.getElementById(bodyId);
    var head = document.getElementById(headId);
    var pager = document.getElementById(pagerId);
    var count = document.getElementById(countId);
    if (!body || !head) return;
    head.innerHTML = COLS.map(function (c) {
      var mark = !c.action && state.key === c.key ? (state.dir > 0 ? " ▴" : " ▾") : "";
      return '<th data-key="' + c.key + '"' + (c.action ? ' class="num"' : "") + ">" + c.label + mark + "</th>";
    }).join("");
    if (!pageRows.length) {
      body.innerHTML = '<tr class="empty"><td colspan="8">No hay permisos para los filtros seleccionados.</td></tr>';
    } else {
      body.innerHTML = pageRows
        .map(function (r) {
          return "<tr>" + COLS.map(function (c) { return "<td>" + cell(r, c) + "</td>"; }).join("") + "</tr>";
        })
        .join("");
    }
    if (count) {
      var fromN = sorted.length ? (state.page - 1) * state.size + 1 : 0;
      var toN = Math.min(state.page * state.size, sorted.length);
      count.textContent =
        sorted.length.toLocaleString("es-PE") +
        " permiso" +
        (sorted.length === 1 ? "" : "s") +
        (sorted.length ? " · " + fromN + "–" + toN : "");
    }
    if (pager) {
      var sizeOpts = SIZES.map(function (n) {
        return (
          '<option value="' +
          n +
          '"' +
          (state.size === n ? " selected" : "") +
          ">" +
          n +
          "</option>"
        );
      }).join("");
      pager.innerHTML =
        '<div class="pager-size">' +
        '<span class="pager-label">Mostrar</span>' +
        '<select class="pager-select" data-page-size aria-label="Filas por página">' +
        sizeOpts +
        "</select>" +
        '<span class="pager-label">por página</span>' +
        "</div>" +
        '<div class="pager-nav">' +
        '<button type="button" class="pager-btn" data-pg-go="1" ' +
        (state.page <= 1 ? "disabled" : "") +
        ' aria-label="Primera">«</button>' +
        '<button type="button" class="pager-btn" data-pg="-1" ' +
        (state.page <= 1 ? "disabled" : "") +
        ' aria-label="Anterior">‹</button>' +
        '<span class="pager-info">Página <strong>' +
        state.page +
        "</strong> de <strong>" +
        pages +
        "</strong></span>" +
        '<button type="button" class="pager-btn" data-pg="1" ' +
        (state.page >= pages ? "disabled" : "") +
        ' aria-label="Siguiente">›</button>' +
        '<button type="button" class="pager-btn" data-pg-go="' +
        pages +
        '" ' +
        (state.page >= pages ? "disabled" : "") +
        ' aria-label="Última">»</button>' +
        "</div>";
    }
  }
  function render(rows) {
    var sorted = QBE.data.sortRecords(rows || [], state.key, state.dir);
    var size = state.size;
    var pages = Math.max(1, Math.ceil(sorted.length / size));
    if (state.page > pages) state.page = pages;
    var from = (state.page - 1) * size;
    var pageRows = sorted.slice(from, from + size);
    paintMount("table-head", "table-body", "table-pager", "table-count", pageRows, sorted, pages);
    paintMount("dash-table-head", "dash-table-body", "dash-table-pager", "dash-table-count", pageRows, sorted, pages);
    state._rows = sorted;
  }
  function findById(id) {
    id = String(id || "");
    if (!id) return null;
    var rows = state._rows || [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (
        String(r.id) === id ||
        String(r._uid) === id ||
        String(r.fila) === id
      ) {
        return r;
      }
    }
    return null;
  }
  function resetPage() {
    state.page = 1;
  }
  function rows() {
    return state._rows || [];
  }

  /** Columnas del reporte Excel (hoja BD-PERMISOS / GET, sin id ni status) */
  var EXCEL_COLS = [
    { key: "fechaRegistro", label: "Fecha registro" },
    { key: "horaRegistro", label: "Hora registro" },
    { key: "horaGuardado", label: "Hora guardado" },
    { key: "dni", label: "DNI" },
    { key: "nombres", label: "Apellidos y nombres" },
    { key: "cargo", label: "Cargo / Puesto" },
    { key: "area", label: "Área" },
    { key: "fIngreso", label: "Fecha ingreso" },
    { key: "motivo", label: "Motivo" },
    { key: "fechaSalida", label: "Fecha salida" },
    { key: "horaSalida", label: "Hora salida" },
    { key: "observacion", label: "Observación" },
    { key: "responsable", label: "Responsable" },
    { key: "dniResponsable", label: "DNI responsable" },
    { key: "puestoResponsable", label: "Puesto responsable" },
    { key: "carnetVerificado", label: "Carnet verificado" },
    { key: "carnetDniEscaneado", label: "DNI carnet escaneado" },
  ];

  function excelCell(r, key) {
    if (key === "nombres") return QBE.data.fullName(r) || "";
    if (key === "fechaRegistro") return QBE.data.fmtDate(r.fechaRegistro || r.fecha) || "";
    if (key === "fechaSalida") return QBE.data.fmtDate(r.fechaSalida) || "";
    if (key === "fIngreso") return QBE.data.fmtDate(r.fIngreso || r.fechaIngreso) || "";
    if (key === "horaRegistro") return QBE.data.fmtTime(r.horaRegistro) === "-" ? "" : QBE.data.fmtTime(r.horaRegistro);
    if (key === "horaSalida") return QBE.data.fmtTime(r.horaSalida) === "-" ? "" : QBE.data.fmtTime(r.horaSalida);
    if (key === "horaGuardado") return QBE.data.fmtTime(r.horaGuardado) === "-" ? String(r.horaGuardado || "") : QBE.data.fmtTime(r.horaGuardado);
    if (key === "cargo") return r.cargo || r.puesto || "";
    if (key === "responsable") return r.responsable || r.jefeDirecto || "";
    if (key === "observacion") return r.observacion || (r.observaciones && r.observaciones !== "PERMISO" ? r.observaciones : "") || "";
    if (key === "carnetVerificado") return QBE.data.esSi(r.carnetVerificado) ? "SI" : "NO";
    return r[key] != null ? r[key] : "";
  }

  function exportExcel() {
    var rows = state._rows || [];
    if (!rows.length) {
      if (QBE.shell && QBE.shell.toast) QBE.shell.toast("No hay registros para exportar.", true);
      return false;
    }
    var headers = EXCEL_COLS.map(function (c) {
      return c.label;
    });
    var aoa = [headers];
    rows.forEach(function (r) {
      aoa.push(
        EXCEL_COLS.map(function (c) {
          return excelCell(r, c.key);
        })
      );
    });

    var stamp = new Date();
    var name =
      "permisos-rh-" +
      stamp.getFullYear() +
      ("0" + (stamp.getMonth() + 1)).slice(-2) +
      ("0" + stamp.getDate()).slice(-2) +
      ".xlsx";

    try {
      if (typeof XLSX !== "undefined" && XLSX.utils && XLSX.writeFile) {
        var wb = XLSX.utils.book_new();
        var ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = EXCEL_COLS.map(function (c) {
          return { wch: Math.max(12, String(c.label).length + 2) };
        });
        XLSX.utils.book_append_sheet(wb, ws, "Permisos");
        XLSX.writeFile(wb, name);
      } else {
        var lines = aoa.map(function (row) {
          return row
            .map(function (v) {
              var s = String(v == null ? "" : v);
              if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
              return s;
            })
            .join(";");
        });
        var blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name.replace(/\.xlsx$/i, ".csv");
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () {
          URL.revokeObjectURL(a.href);
        }, 1500);
      }
      if (QBE.shell && QBE.shell.toast) QBE.shell.toast("Excel exportado · " + rows.length + " registros");
      if (QBE.audit) QBE.audit.add("Exportar Excel", rows.length + " permisos");
      return true;
    } catch (err) {
      if (QBE.shell && QBE.shell.toast) {
        QBE.shell.toast("No se pudo exportar Excel: " + ((err && err.message) || "error"), true);
      }
      return false;
    }
  }

  function bind() {
    function onHeadClick(e) {
      var th = e.target.closest("th[data-key]");
      if (!th) return;
      var key = th.getAttribute("data-key");
      if (!key || key === "_pdf") return;
      if (state.key === key) state.dir *= -1;
      else {
        state.key = key;
        state.dir = key.indexOf("fecha") >= 0 || key.indexOf("hora") >= 0 ? -1 : 1;
      }
      state.page = 1;
      render(state._rows);
    }
    function onPager(e) {
      var sizeEl = e.target.closest("[data-page-size]");
      if (sizeEl && sizeEl.tagName === "SELECT") {
        var n = Number(sizeEl.value);
        if (SIZES.indexOf(n) >= 0) {
          state.size = n;
          state.page = 1;
          render(state._rows);
        }
        return;
      }
      var go = e.target.closest("[data-pg-go]");
      if (go && !go.disabled) {
        state.page = Number(go.getAttribute("data-pg-go")) || 1;
        render(state._rows);
        return;
      }
      var btn = e.target.closest("[data-pg]");
      if (!btn || btn.disabled) return;
      state.page += Number(btn.getAttribute("data-pg"));
      render(state._rows);
    }
    function onPdf(e) {
      var btn = e.target.closest("[data-pdf]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var row = findById(btn.getAttribute("data-pdf"));
      if (!row || !QBE.pdf) return;
      QBE.pdf.open(row);
    }
    ["dash-table-head", "table-head"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", onHeadClick);
    });
    ["dash-table-pager", "table-pager"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("click", onPager);
      el.addEventListener("change", onPager);
    });
    ["dash-table-body", "table-body"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", onPdf);
    });
    var lista = document.getElementById("btn-pdf-lista");
    if (lista) {
      lista.addEventListener("click", function () {
        if (QBE.pdf) QBE.pdf.printList(state._rows || []);
      });
    }
    var excelBtn = document.getElementById("btn-excel");
    if (excelBtn) {
      excelBtn.addEventListener("click", function () {
        exportExcel();
      });
    }
  }

  QBE.table = {
    render: render,
    bind: bind,
    resetPage: resetPage,
    rows: rows,
    exportExcel: exportExcel,
    carnetLabel: carnetLabel,
  };
})(typeof window !== "undefined" ? window : globalThis);
