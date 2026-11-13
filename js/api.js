/* GET/POST al code.gs real: siempre envía token = Permisos2026. */
(function (root) {
  var QBE = root.QBE || (root.QBE = {});

  function apiUrl() {
    return String((QBE.config && QBE.config.apiUrl) || "").trim();
  }
  function token() {
    return String((QBE.config && (QBE.config.token || QBE.config.clave)) || "Permisos2026");
  }
  function online() {
    try {
      if (navigator && navigator.onLine === false) return false;
    } catch (err) {}
    return true;
  }
  function fetchJson(url, timeout) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, timeout || 25000);
    return fetch(url, { method: "GET", cache: "no-store", redirect: "follow", signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) {
        return res.text().then(function (t) {
          var data = null;
          try {
            data = t ? JSON.parse(t) : null;
          } catch (err) {}
          if (!res.ok) throw { status: res.status, message: "No se pudo leer los permisos." };
          return data;
        });
      })
      .finally(function () {
        clearTimeout(timer);
      });
  }
  function post(action, extra) {
    var url = apiUrl();
    if (!url) return Promise.reject({ message: "Falta configurar la URL del Apps Script." });
    var body = Object.assign(
      {
        action: action,
        token: token(),
        password: token(),
      },
      extra || {}
    );
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, QBE.config.timeoutMs || 25000);
    return fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      cache: "no-store",
      redirect: "follow",
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (res) {
        return res.text().then(function (t) {
          var data = null;
          try {
            data = t ? JSON.parse(t) : null;
          } catch (err) {}
          if (!res.ok || (data && data.ok === false)) {
            throw { message: (data && data.message) || "No se pudo completar.", code: data && data.code };
          }
          return data;
        });
      })
      .finally(function () {
        clearTimeout(timer);
      });
  }
  function login(payload) {
    // El code.gs no tiene action login: valida clave local = token API
    var clave = String((payload && payload.clave) || "");
    return new Promise(function (resolve, reject) {
      if (clave !== token()) {
        reject({ message: "Contraseña incorrecta", code: "UNAUTHORIZED" });
        return;
      }
      resolve({
        ok: true,
        data: { id: "USR-RH", usuario: "Administrador", nombre: "RR.HH.", rol: "rh" },
      });
    });
  }
  function normalizePack(data) {
    if (!data || data.ok === false) {
      throw { message: (data && data.message) || "El servidor no devolvió permisos.", code: data && data.code };
    }
    var rows = data.data || data.records || [];
    if (!Array.isArray(rows)) rows = [];
    data.data = rows;
    data.records = rows;
    data.total = data.count != null ? data.count : rows.length;
    return data;
  }
  function loadPermisos(params) {
    var url = apiUrl();
    if (!url || !online()) return Promise.resolve(null);
    params = params || {};
    var qs = new URLSearchParams();
    qs.set("action", "listarPermisos");
    qs.set("token", token());
    qs.set("_", String(Date.now()));
    if (params.todas) qs.set("todas", "1");
    if (params.fecha) qs.set("fecha", params.fecha);
    if (params.limit) qs.set("limit", String(params.limit));
    var sep = url.indexOf("?") >= 0 ? "&" : "?";
    return fetchJson(url + sep + qs.toString(), QBE.config.timeoutMs)
      .then(normalizePack)
      .catch(function (err) {
        // Fallback POST (mismo token)
        return post("listarPermisos", {
          todas: params.todas ? "1" : "",
          fecha: params.fecha || "",
          limit: params.limit || "",
        }).then(normalizePack).catch(function (err2) {
          throw err2.message ? err2 : err;
        });
      });
  }
  function ping() {
    var url = apiUrl();
    if (!url) return Promise.resolve(null);
    var sep = url.indexOf("?") >= 0 ? "&" : "?";
    return fetchJson(url + sep + "action=ping&token=" + encodeURIComponent(token()) + "&_=" + Date.now(), 15000);
  }

  QBE.api = { url: apiUrl, token: token, loadPermisos: loadPermisos, login: login, ping: ping, online: online };
})(typeof window !== "undefined" ? window : globalThis);
