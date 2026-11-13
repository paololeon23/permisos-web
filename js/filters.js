/* Filtros del panel de permisos (dashboard + detalle fecha→fecha). */
(function (root) {
  var QBE = root.QBE || (root.QBE = {});
  var state = {
    q: "",
    motivo: "*",
    rango: "todas",
    fecha: "",
    desde: "",
    hasta: "",
    motivoDetalle: "*",
  };

  function $(id) {
    return document.getElementById(id);
  }
  function todayYmd() {
    var d = new Date();
    var mm = d.getMonth() + 1;
    var dd = d.getDate();
    return d.getFullYear() + "-" + (mm < 10 ? "0" : "") + mm + "-" + (dd < 10 ? "0" : "") + dd;
  }
  function fillSelect(el, items, allLabel) {
    if (!el) return;
    var cur = el.value || "*";
    var html = '<option value="*">' + (allLabel || "Todos") + "</option>";
    (items || []).forEach(function (v) {
      html += '<option value="' + String(v).replace(/"/g, "&quot;") + '">' + v + "</option>";
    });
    el.innerHTML = html;
    if (cur && (cur === "*" || items.indexOf(cur) >= 0)) el.value = cur;
  }
  function syncFromDom() {
    var page = String(location.hash || "");
    var onDetalle = page.indexOf("detalle") >= 0;

    state.q =
      ($("q") && $("q").value) ||
      ($("q-table") && $("q-table").value) ||
      ($("q-detalle") && $("q-detalle").value) ||
      "";
    state.motivo = ($("f-motivo") && $("f-motivo").value) || "*";
    state.rango = ($("f-rango") && $("f-rango").value) || "todas";
    state.fecha = ($("f-fecha") && $("f-fecha").value) || "";
    state.desde = ($("f-desde") && $("f-desde").value) || "";
    state.hasta = ($("f-hasta") && $("f-hasta").value) || "";
    state.motivoDetalle = ($("f-motivo-detalle") && $("f-motivo-detalle").value) || "*";

    // En detalle: prioridad fecha→fecha + motivo detalle
    if (onDetalle) {
      return {
        q: state.q,
        motivo: state.motivoDetalle && state.motivoDetalle !== "*" ? state.motivoDetalle : "*",
        rango: "todas",
        fecha: "",
        desde: state.desde,
        hasta: state.hasta,
      };
    }
    return {
      q: state.q,
      motivo: state.motivo,
      rango: state.rango,
      fecha: state.fecha,
      desde: "",
      hasta: "",
    };
  }
  function current() {
    return syncFromDom();
  }
  function render(opts) {
    opts = opts || {};
    fillSelect($("f-motivo"), opts.motivos || [], "Todos los motivos");
    fillSelect($("f-motivo-detalle"), opts.motivos || [], "Todos los motivos");
    if ($("f-fecha") && !$("f-fecha").value) $("f-fecha").value = todayYmd();
    if ($("f-desde") && !$("f-desde").value) {
      var d = new Date();
      d.setDate(1);
      var mm = d.getMonth() + 1;
      var dd = d.getDate();
      $("f-desde").value = d.getFullYear() + "-" + (mm < 10 ? "0" : "") + mm + "-" + (dd < 10 ? "0" : "") + dd;
    }
    if ($("f-hasta") && !$("f-hasta").value) $("f-hasta").value = todayYmd();
    if (QBE.selects) {
      QBE.selects.refresh($("f-motivo"));
      QBE.selects.refresh($("f-rango"));
      QBE.selects.refresh($("f-motivo-detalle"));
    }
  }
  function bind(onChange) {
    if (QBE.selects) QBE.selects.init(document);
    ["f-motivo", "f-rango", "f-fecha", "f-desde", "f-hasta", "f-motivo-detalle"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("change", function () {
        syncFromDom();
        if (onChange) onChange(current());
      });
    });
    ["q", "q-table", "q-detalle"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("input", function () {
        var v = el.value;
        ["q", "q-table", "q-detalle"].forEach(function (oid) {
          var o = $(oid);
          if (o && o !== el) o.value = v;
        });
        syncFromDom();
        if (onChange) onChange(current());
      });
    });
    root.addEventListener("hashchange", function () {
      if (onChange) onChange(current());
    });
  }

  QBE.filters = { render: render, bind: bind, current: current };
})(typeof window !== "undefined" ? window : globalThis);
