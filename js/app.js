/* Orquesta carga GET de permisos, filtros, KPI y tabla. */
(function (root) {
  var QBE = root.QBE || (root.QBE = {});
  var pack = { records: [], source: "empty", generatedAt: "", motivos: [], kpis: null };
  var filtered = [];
  var busy = false;

  function $(id) {
    return document.getElementById(id);
  }
  function setStatus(text, kind) {
    var el = $("src-status");
    if (!el) return;
    el.textContent = text;
    el.className = "src-status" + (kind ? " " + kind : "");
  }
  function setLoading(on, text) {
    var el = $("loading");
    if (!el) return;
    el.hidden = !on;
    var t = $("loading-text");
    if (t && text) t.textContent = text;
  }
  function refresh() {
    var f = QBE.filters.current();
    filtered = QBE.data.filterRows(pack.records, f);
    var kpis = QBE.data.computeKpis(filtered);
    QBE.kpis.render(kpis);
    if (QBE.kpis.trend) QBE.kpis.trend(filtered);
    QBE.table.render(filtered);
    if (QBE.briefs && QBE.briefs.refresh) QBE.briefs.refresh();
  }
  function usePack(next, source) {
    var rows = QBE.data.normalizeAll((next && (next.data || next.records)) || []);
    pack = {
      records: rows,
      source: source || "api",
      generatedAt: (next && next.generatedAt) || "",
      motivos: (next && next.motivos) || [],
      kpis: (next && next.kpis) || null,
      formulario: (next && next.formulario) || "",
    };
    QBE.filters.render(QBE.data.optionsFrom(pack.records));
    QBE.table.resetPage();
    refresh();
    var n = pack.records.length;
    if (source === "api") {
      if (n) {
        setStatus(
          "BD-PERMISOS · " +
            n.toLocaleString("es-PE") +
            " permisos" +
            (pack.formulario ? " · " + pack.formulario : ""),
          "ok"
        );
      } else setStatus("La planilla no tiene permisos todavía.", "warn");
    } else if (source === "demo") {
      setStatus("Sin conexión a la API · mostrando demo. Revise token/URL.", "demo");
    } else {
      setStatus("Sin datos.", "");
    }
  }
  function demoPack() {
    var hoy = new Date();
    var ymd =
      hoy.getFullYear() +
      "-" +
      String(hoy.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(hoy.getDate()).padStart(2, "0");
    return {
      ok: true,
      generatedAt: new Date().toLocaleString("es-PE"),
      data: [
        {
          id: "DEMO1",
          fechaRegistro: ymd,
          horaRegistro: "09:12:00",
          dni: "45678912",
          nombres: "PEREZ LOPEZ, MARIA",
          cargo: "OPERARIA",
          fIngreso: "2023-04-12",
          motivo: "Salud",
          fechaSalida: ymd,
          horaSalida: "10:30:00",
          observacion: "Cita médica",
          responsable: "RAMIREZ, JORGE",
          dniResponsable: "40111222",
          puestoResponsable: "SUPERVISOR",
          carnetVerificado: "SI",
        },
        {
          id: "DEMO2",
          fechaRegistro: ymd,
          horaRegistro: "11:05:00",
          dni: "47890123",
          nombres: "QUISPE HUAMAN, LUIS",
          cargo: "AYUDANTE",
          fIngreso: "2024-01-08",
          motivo: "Personal",
          fechaSalida: ymd,
          horaSalida: "12:00:00",
          observacion: "",
          responsable: "TORRES, ANA",
          dniResponsable: "40999888",
          puestoResponsable: "JEFE DE AREA",
          carnetVerificado: "NO",
        },
        {
          id: "DEMO3",
          fechaRegistro: ymd,
          horaRegistro: "14:20:00",
          dni: "41234567",
          nombres: "CASTRO DIAZ, ROSA",
          cargo: "OPERARIA",
          fIngreso: "2022-09-01",
          motivo: "Por tarea",
          fechaSalida: ymd,
          horaSalida: "15:00:00",
          observacion: "Trámite en planta",
          responsable: "RAMIREZ, JORGE",
          dniResponsable: "40111222",
          puestoResponsable: "SUPERVISOR",
          carnetVerificado: "SI",
        },
      ],
    };
  }
  function loadParams() {
    // Siempre trae todas las fechas: el filtro (día / desde-hasta) es en el cliente
    return { todas: true, limit: 3000 };
  }
  function reload(opts) {
    var silent = !!(opts && opts.silent === true);
    if (busy) return Promise.resolve();
    busy = true;
    if (!silent) setLoading(true, "Cargando permisos…");
    if (QBE.kpis && QBE.kpis.cloud) QBE.kpis.cloud(silent ? 72 : 18, "Bajando información");
    var params = loadParams();
    return Promise.resolve()
      .then(function () {
        if (!QBE.api.url()) return null;
        return QBE.api.loadPermisos(params);
      })
      .then(function (data) {
        if (data && (data.data || data.records)) {
          usePack(data, "api");
          if (!silent && QBE.audit) QBE.audit.add("Actualizar", (data.total || (data.data || []).length) + " permisos");
          return;
        }
        setStatus("La API no devolvió permisos.", "warn");
        usePack({ data: [] }, "api");
      })
      .catch(function (err) {
        var msg = (err && err.message) || "No se pudo cargar.";
        setStatus(msg, "err");
        if (QBE.shell && QBE.shell.toast) QBE.shell.toast(msg, true);
        usePack({ data: [] }, "api");
      })
      .finally(function () {
        busy = false;
        if (!silent) setLoading(false);
        if (QBE.kpis && QBE.kpis.cloud) QBE.kpis.cloud(100, "Analizando data de campo");
      });
  }
  function boot() {
    QBE.filters.bind(function () {
      refresh();
    });
    QBE.table.bind();
    if (QBE.pdf) QBE.pdf.bind();
    var reloadBtn = $("btn-reload");
    if (reloadBtn) reloadBtn.addEventListener("click", reload);
    var rango = $("f-rango");
    if (rango) {
      rango.addEventListener("change", function () {
        if (rango.value === "dia") reload();
        else refresh();
      });
    }
    var fecha = $("f-fecha");
    if (fecha) {
      fecha.addEventListener("change", function () {
        if ($("f-rango") && $("f-rango").value === "dia") reload();
        else refresh();
      });
    }
    reload();
    setInterval(function () {
      if (document.hidden) return;
      var h = String(location.hash || "#/dashboard");
      if (h !== "#/dashboard" && h !== "" && h !== "#") return;
      reload({ silent: true });
      if (QBE.campo && QBE.campo.reload) QBE.campo.reload(true);
    }, 25000);
  }

  function records() {
    return pack.records.slice();
  }
  QBE.app = { boot: boot, reload: reload, refresh: refresh, records: records };
})(typeof window !== "undefined" ? window : globalThis);
