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
    if (h === "#/dashboard" && QBE.campo) QBE.campo.ensure();
    if (h === "#/campo" && QBE.campo) QBE.campo.ensure();
    if (QBE.audit && route.last && route.last !== h) {
      var names = {
        "#/dashboard": "Dashboard",
        "#/detalle": "Detalle permisos",
        "#/campo": "Incidencia Campo",
        "#/movimientos": "Movimientos",
      };
      QBE.audit.add("Página", names[h] || h);
    }
    route.last = h;
  }
  function bind() {
    if (bind.done) return;
    bind.done = true;
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
    document.addEventListener(
      "click",
      function (e) {
        if (!e.target.closest || !e.target.closest("[data-logout]")) return;
        e.preventDefault();
        doLogout();
      },
      true
    );
    if ($("refresh-btn"))
      $("refresh-btn").addEventListener("click", function () {
        if (String(location.hash) === "#/campo" && QBE.campo && QBE.campo.reload) QBE.campo.reload();
        else if (QBE.app && QBE.app.reload) QBE.app.reload();
      });
    bindNotes();
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
    startDesk();
  }
  function start() {
    bind();
    if (!QBE.auth.require()) return;
    afterLogin();
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function entries() {
    var live = QBE.campo && QBE.campo.today ? QBE.campo.today() : [];
    return live.map(function (r) {
      return {
        nombre: r.trabajador || "Sin nombre",
        dni: r.dni || "",
        hora: r.hora || "—",
        tipo: r.incidencia || "Incidencia",
      };
    });
  }
  function syncNotes() {
    var list = entries();
    var badge = $("note-count");
    var ul = $("note-list");
    if (badge) {
      badge.textContent = String(list.length);
      badge.hidden = !list.length;
    }
    if (ul) {
      ul.innerHTML = list.length
        ? list
            .map(function (r) {
              return (
                "<li><div><strong>" + esc(r.nombre) + "</strong><small>" + esc(r.dni) +
                "</small></div><span>" + esc(r.hora) + "<em>" + esc(r.tipo) + "</em></span></li>"
              );
            })
            .join("")
        : '<li class="note-empty">Nadie ha entrado en este momento.</li>';
    }
    if (QBE.briefs && QBE.briefs.refresh) QBE.briefs.refresh();
    notifyDesk(list);
  }
  function bindNotes() {
    var btn = $("note-btn");
    var panel = $("note-panel");
    if (!btn || !panel || bindNotes.done) return;
    bindNotes.done = true;
    syncNotes();
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      panel.hidden = open;
      if (!open) syncNotes();
    });
    document.addEventListener("click", function (e) {
      if (!btn.contains(e.target) && !panel.contains(e.target)) {
        btn.setAttribute("aria-expanded", "false");
        panel.hidden = true;
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        btn.setAttribute("aria-expanded", "false");
        panel.hidden = true;
      }
    });
  }
  var lastNote = "";
  function notifyDesk(list) {
    if (document.getElementById("panel-login")) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    list = list || [];
    if (!list.length) {
      lastNote = "";
      return;
    }
    var sig = list
      .map(function (r) {
        return [r.nombre, r.dni, r.hora, r.tipo].join("|");
      })
      .join("~");
    if (sig === lastNote) return;
    lastNote = sig;
    var body = list
      .slice(0, 3)
      .map(function (r) {
        return r.nombre + " · " + (r.hora || "—") + (r.tipo ? " · " + r.tipo : "");
      })
      .join("\n");
    if (list.length > 3) body += "\n+" + (list.length - 3) + " más";
    try {
      var note = new Notification("Quién entró", {
        body: body,
        tag: "qbe-quien-entro",
        icon: new URL("assets/logo-qberries.png", location.href).href,
      });
      note.onclick = function () {
        window.focus();
        var btn = $("note-btn");
        var panel = $("note-panel");
        if (btn && panel) {
          btn.setAttribute("aria-expanded", "true");
          panel.hidden = false;
          syncNotes();
        }
      };
    } catch (err) {}
  }
  function startDesk() {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") return;
    if (Notification.permission !== "default") return;
    var ask = function () {
      Notification.requestPermission().catch(function () {});
    };
    ask();
    document.addEventListener("click", function () {
      if (Notification.permission === "default") ask();
    }, { once: true });
  }
  function stopDesk() {
    lastNote = "";
  }
  function doLogout() {
    stopDesk();
    if (QBE.auth) QBE.auth.logout();
    location.hash = "#/dashboard";
    location.reload();
  }
  QBE.notify = { sync: syncNotes };
  QBE.shell = { start: start, afterLogin: afterLogin, toast: toast };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(typeof window !== "undefined" ? window : globalThis);
