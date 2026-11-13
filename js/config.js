/* QBerries Permisos RH — API + token = Permisos2026 (igual que code.gs). */
(function (root) {
  var DEFAULT_API =
    "https://script.google.com/macros/s/AKfycbwewS3UBCCOVaGFXgJykDX8uEoEWPgDxJwPzvZc3XlBpxCto8XYnASwG4WWlXhssqd3/exec";
  var stored = "";
  try {
    stored = String((root.localStorage && root.localStorage.getItem("qbe.perm.apiUrl")) || "");
  } catch (err) {
    stored = "";
  }
  var meta = typeof document !== "undefined" ? document.querySelector('meta[name="qberries-api"]') : null;
  var fromMeta = meta ? String(meta.getAttribute("content") || "").trim() : "";

  root.QBE = root.QBE || {};
  var apiUrl = String(root.QBE_API_URL || fromMeta || stored || DEFAULT_API).trim();
  if (apiUrl && root.localStorage) {
    try {
      root.localStorage.setItem("qbe.perm.apiUrl", apiUrl);
    } catch (err2) {}
  }
  root.QBE.config = {
    apiUrl: apiUrl,
    timeoutMs: 45000,
    retries: 1,
    empresa: "QBerries",
    pageSize: 20,
    cacheKey: "qbe.perm.pack",
    tz: "America/Lima",
    usuario: "Administrador",
    clave: "Permisos2026",
    token: "Permisos2026",
  };
})(typeof window !== "undefined" ? window : globalThis);
