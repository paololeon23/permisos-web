/* Inicio de sesión panel RR.HH. Clave local: Permisos2026 */
(function (root) {
  var QBE = root.QBE || (root.QBE = {});
  var KEY = "qbe.perm.panel";
  var session = null;

  function $(id) {
    return document.getElementById(id);
  }
  function fold(s) {
    return String(s || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }
  function localOk(usuario, clave) {
    var uOk = !usuario || fold(usuario) === fold(QBE.config.usuario);
    return uOk && String(clave) === String(QBE.config.clave);
  }
  function save(row) {
    session = row;
    try {
      sessionStorage.setItem(KEY, JSON.stringify(row));
    } catch (err) {}
  }
  function clear() {
    session = null;
    try {
      sessionStorage.removeItem(KEY);
    } catch (err) {}
  }
  function restore() {
    try {
      var raw = sessionStorage.getItem(KEY);
      session = raw ? JSON.parse(raw) : null;
      return !!(session && session.id);
    } catch (err) {
      session = null;
      return false;
    }
  }
  function login(usuario, clave) {
    // Misma clave que DEFAULT_API_TOKEN del code.gs (Permisos2026)
    return new Promise(function (resolve, reject) {
      if (!localOk(usuario, clave) && String(clave) !== String(QBE.config.token || QBE.config.clave)) {
        reject({ message: "Contraseña incorrecta" });
        return;
      }
      var row = { id: "USR-RH", usuario: QBE.config.usuario, nombre: "RR.HH.", rol: "rh" };
      save(row);
      resolve(row);
    });
  }
  function showGate() {
    if ($("panel-login")) return;
    var gate = document.createElement("div");
    gate.id = "panel-login";
    gate.className = "panel-login";
    gate.innerHTML =
      '<form class="panel-login-card" id="panel-login-form" autocomplete="off">' +
      '<img class="panel-login-brand" src="assets/logo-qberries.png" alt="QBerries" />' +
      '<p class="panel-login-kicker">QBerries · RR.HH.</p>' +
      "<h1>Iniciar sesión</h1>" +
      '<p class="panel-login-lead">Acceso al panel de permisos y pases de salida.</p>' +
      '<label>Usuario<input id="panel-user" name="usuario" required autocomplete="username" value="Administrador" readonly /></label>' +
      '<label>Clave<input id="panel-pass" type="password" name="clave" required autocomplete="current-password" placeholder="Permisos2026" /></label>' +
      '<p class="panel-login-err" id="panel-login-err" hidden></p>' +
      '<button type="submit" id="panel-login-btn"><span class="panel-login-spin" id="panel-login-spin" hidden></span><span id="panel-login-label">Iniciar sesión</span></button></form>';
    document.body.appendChild(gate);
    $("panel-login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var err = $("panel-login-err");
      var btn = $("panel-login-btn");
      var spin = $("panel-login-spin");
      var label = $("panel-login-label");
      btn.disabled = true;
      spin.hidden = false;
      err.hidden = true;
      login("Administrador", $("panel-pass").value)
        .then(function () {
          gate.remove();
          if (QBE.audit) QBE.audit.add("Inicio de sesión", "Acceso panel permisos RH");
          if (QBE.shell && QBE.shell.afterLogin) QBE.shell.afterLogin();
        })
        .catch(function (e2) {
          err.hidden = false;
          err.textContent = (e2 && e2.message) || "Usuario o clave incorrectos.";
          btn.disabled = false;
          spin.hidden = true;
          label.textContent = "Iniciar sesión";
        });
    });
    setTimeout(function () {
      var p = $("panel-pass");
      if (p) p.focus();
    }, 30);
  }
  function requireSession() {
    if (restore()) return true;
    showGate();
    return false;
  }

  QBE.auth = {
    login: login,
    logout: clear,
    session: function () {
      return session;
    },
    require: requireSession,
    showGate: showGate,
  };
})(typeof window !== "undefined" ? window : globalThis);
