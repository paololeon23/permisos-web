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
    set("det-kpi-n", kpis.total);
    set("det-kpi-p", kpis.colaboradores);
    set("det-kpi-s", kpis.salud);
    set("det-kpi-v", kpis.vistoBueno);
    set("hr-perm", kpis.total);
    set("side-perm", kpis.total);
    last = {
      colaboradores: kpis.colaboradores || 0,
      salud: kpis.salud || 0,
      vistoBueno: kpis.vistoBueno || 0,
      carnetOk: kpis.carnetOk || 0,
    };
  }
  function fmtDay(iso) {
    var p = String(iso || "").split("-");
    return p.length === 3 ? p[2] + "/" + p[1] : "";
  }
  /** Gráfico de permisos por día (últimos 30 días con datos) y ranking de motivos. */
  function trend(rows) {
    rows = rows || [];
    var svg = document.getElementById("trend-svg");
    var axis = document.getElementById("trend-axis");
    var total = document.getElementById("trend-total");
    var list = document.getElementById("motivo-list");
    var byDay = {};
    rows.forEach(function (r) {
      var d = String(r.fechaRegistro || r.fechaSalida || "").slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) byDay[d] = (byDay[d] || 0) + 1;
    });
    var days = Object.keys(byDay).sort().slice(-30);
    if (total) total.textContent = rows.length ? fmtInt(rows.length) + " permisos" : "";
    if (svg) {
      var W = 640, H = 220, P = 18;
      if (!days.length) {
        svg.innerHTML = "";
        if (axis) axis.textContent = "Sin datos para el periodo.";
      } else {
        var max = 1;
        days.forEach(function (d) { if (byDay[d] > max) max = byDay[d]; });
        var n = days.length;
        var pts = days.map(function (d, i) {
          var x = n === 1 ? W / 2 : P + (i * (W - 2 * P)) / (n - 1);
          var y = H - P - (byDay[d] / max) * (H - 2 * P);
          return { x: x, y: y, d: d, v: byDay[d] };
        });
        var line = pts.map(function (p, i) { return (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1); }).join(" ");
        var area = line + " L" + pts[n - 1].x.toFixed(1) + " " + (H - P) + " L" + pts[0].x.toFixed(1) + " " + (H - P) + " Z";
        var dots = pts.map(function (p) {
          return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4" fill="#fff" stroke="#6b9b2d" stroke-width="2"><title>' +
            fmtDay(p.d) + ": " + p.v + "</title></circle>";
        }).join("");
        svg.innerHTML =
          '<line x1="' + P + '" x2="' + (W - P) + '" y1="' + (H - P) + '" y2="' + (H - P) + '" stroke="#e4eadc"/>' +
          '<path class="trend-area" d="' + area + '" fill="rgba(107,155,45,0.12)"/>' +
          '<path class="trend-line" d="' + line + '" fill="none" stroke="#6b9b2d" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
          '<circle class="trend-runner" r="5" fill="#c96b00"><animateMotion dur="6s" repeatCount="indefinite" path="' + line + '"/></circle>' +
          dots;
        var drawn = svg.querySelector(".trend-line");
        if (drawn && drawn.getTotalLength) {
          var len = drawn.getTotalLength();
          drawn.style.strokeDasharray = String(len);
          drawn.style.strokeDashoffset = String(len);
          requestAnimationFrame(function () {
            drawn.style.transition = "stroke-dashoffset 1.15s ease";
            drawn.style.strokeDashoffset = "0";
          });
        }
        if (axis) {
          var mid = pts[Math.floor((n - 1) / 2)];
          var midLabel = mid.d !== pts[0].d && mid.d !== pts[n - 1].d ? fmtDay(mid.d) : "";
          axis.innerHTML = "<span>" + fmtDay(pts[0].d) + "</span><span>" + midLabel + "</span><span>" + fmtDay(pts[n - 1].d) + "</span>";
        }
      }
    }
    if (list) {
      var motivos = (QBE.data && QBE.data.motivosCount ? QBE.data.motivosCount(rows) : []).slice(0, 6);
      if (!motivos.length) {
        list.innerHTML = '<li class="motivo-empty">Sin registros para el periodo.</li>';
      } else {
        var top = motivos[0].count || 1;
        var person =
          '<svg class="mini-person" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.2 19.2c.9-3.3 3.3-5 6.8-5s5.9 1.7 6.8 5"/></svg>';
        list.innerHTML = motivos.map(function (m) {
          var w = Math.round((m.count / top) * 100);
          return (
            "<li>" + person + "<span>" + String(m.motivo).replace(/&/g, "&amp;").replace(/</g, "&lt;") +
            '</span><div class="bar"><i data-w="' + w + '"></i></div><b>' + fmtInt(m.count) + "</b></li>"
          );
        }).join("");
        requestAnimationFrame(function () {
          var bars = list.querySelectorAll(".bar i");
          for (var i = 0; i < bars.length; i++) bars[i].style.width = (bars[i].getAttribute("data-w") || "0") + "%";
        });
      }
    }
  }
  function cloud(pct, note) {
    var card = document.getElementById("cloud-card");
    var num = document.getElementById("cloud-pct");
    var text = document.getElementById("cloud-note");
    var bar = document.getElementById("cloud-bar");
    var n = Math.max(0, Math.min(100, Number(pct) || 0));
    if (num) num.textContent = n + "%";
    if (text && note) text.textContent = note;
    if (bar) bar.style.width = n + "%";
    if (card) card.classList.toggle("is-done", n >= 100);
  }
  QBE.kpis = { render: render, fmtInt: fmtInt, trend: trend, cloud: cloud };
})(typeof window !== "undefined" ? window : globalThis);
