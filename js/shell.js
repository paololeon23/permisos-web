/* Sidebar, menú, cuenta y rutas del panel permisos RH. */
(function (root) {
  var QBE = root.QBE || (root.QBE = {});
  var booted = false;

  function $(id) {
    return document.getElementById(id);
  }
  function toast(msg, bad) {
    var el = $("toast");
    if (!el) return;
    el.textContent = msg;
    el.className = "toast" + (bad ? " is-bad" : "");
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () {
      el.hidden = true;
    }, 2800);
  }
  function closeMenu() {
    var side = $("sidebar");
    var back = $("backdrop");
    if (side) side.classList.remove("open");
    if (back) back.classList.remove("show");
  }
  function paintUser() {
    var s = QBE.auth.session() || {};
    var name = s.nombre || s.usuario || "RR.HH.";
    ["hello-name", "hello-menu-name"].forEach(function (id) {
      var el = $(id);
      if (el) el.textContent = name;
    });
  }
  function route() {
    var h = String(location.hash || "#/dashboard");
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.classList.toggle("on", a.getAttribute("href") === h || (h === "#/dashboard" && a.getAttribute("href") === "#/dashboard"));
    });
    document.querySelectorAll(".page").forEach(function (p) {
      var id = "#/" + p.getAttribute("data-page");
      p.classList.toggle("on", id === h || (h === "#/dashboard" && p.getAttribute("data-page") === "dashboard"));
    });
    closeMenu();
    if (h === "#/movimientos" && QBE.audit) {
      QBE.audit.bind();
      QBE.audit.render();
    }
    if (QBE.audit && route.last && route.last !== h) {
      var names = {
        "#/dashboard": "Dashboard",
        "#/detalle": "Detalle permisos",
        "#/movimientos": "Movimientos",
      };
      QBE.audit.add("Página", names[h] || h);
    }
    route.last = h;
  }
  function bind() {
    if ($("menu"))
      $("menu").addEventListener("click", function () {
        $("sidebar").classList.toggle("open");
        $("backdrop").classList.toggle("show");
      });
    if ($("backdrop")) $("backdrop").addEventListener("click", closeMenu);
    var hello = $("hello-btn");
    var menu = $("hello-menu");
    if (hello && menu) {
      hello.addEventListener("click", function () {
        var open = hello.getAttribute("aria-expanded") === "true";
        hello.setAttribute("aria-expanded", open ? "false" : "true");
        menu.hidden = open;
      });
      document.addEventListener("click", function (e) {
        if (!hello.contains(e.target) && !menu.contains(e.target)) {
          hello.setAttribute("aria-expanded", "false");
          menu.hidden = true;
        }
      });
    }
    if ($("logout-btn"))
      $("logout-btn").addEventListener("click", function () {
        QBE.auth.logout();
        location.hash = "#/dashboard";
        location.reload();
      });
    if ($("refresh-btn"))
      $("refresh-btn").addEventListener("click", function () {
        if (QBE.app && QBE.app.reload) QBE.app.reload();
      });
    root.addEventListener("hashchange", route);
  }
  function afterLogin() {
    paintUser();
    if (!booted) {
      booted = true;
      bind();
      if (QBE.app && QBE.app.boot) QBE.app.boot();
    } else if (QBE.app && QBE.app.reload) {
      QBE.app.reload();
    }
    route();
  }
  function start() {
    bind();
    if (!QBE.auth.require()) return;
    afterLogin();
  }

  QBE.shell = { start: start, afterLogin: afterLogin, toast: toast };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(typeof window !== "undefined" ? window : globalThis);
