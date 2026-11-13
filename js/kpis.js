/* KPIs con iconos: colaboradores, salud, visto bueno, todo bien. */
(function (root) {
  var QBE = root.QBE || (root.QBE = {});
  var last = { colaboradores: 0, salud: 0, vistoBueno: 0, carnetOk: 0 };

  function fmtInt(n) {
    return Number(n || 0).toLocaleString("es-PE", { maximumFractionDigits: 0 });
  }
  function set(id, n) {
    var el = document.getElementById(id);
    if (el) el.textContent = fmtInt(n);
  }
  function render(kpis) {
    kpis = kpis || {};
    set("kpi-colab", kpis.colaboradores);
    set("kpi-salud", kpis.salud);
    set("kpi-vb", kpis.vistoBueno);
    set("kpi-ok", kpis.carnetOk);
    last = {
      colaboradores: kpis.colaboradores || 0,
      salud: kpis.salud || 0,
      vistoBueno: kpis.vistoBueno || 0,
      carnetOk: kpis.carnetOk || 0,
    };
  }
  QBE.kpis = { render: render, fmtInt: fmtInt };
})(typeof window !== "undefined" ? window : globalThis);
