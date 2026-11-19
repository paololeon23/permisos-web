/* Normaliza filas del GET QU-GH-FR-16. Corrige desfase si la hoja insertó horaGuardado solo en encabezados. */
(function (root) {
  var QBE = root.QBE || (root.QBE = {});

  function fold(s) {
    var t = String(s == null ? "" : s).toLowerCase();
    try {
      t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    } catch (err) {
      t = t.replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i").replace(/ó/g, "o").replace(/ú/g, "u").replace(/ñ/g, "n");
    }
    return t.replace(/\s+/g, " ").trim();
  }
  function esSi(v) {
    var s = fold(v);
    return s === "si" || s === "true" || s === "1" || s === "ok" || v === true;
  }
  function isDniLike(v) {
    var d = String(v == null ? "" : v).replace(/\D/g, "");
    return d.length >= 7 && d.length <= 12;
  }
  function isDateJunk(v) {
    var s = String(v == null ? "" : v);
    if (/GMT|hora est|UTC| gre /i.test(s)) return true;
    if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(s)) return true;
    return false;
  }
  function isMotivoLike(v) {
    var f = fold(v);
    return (
      f === "salud" ||
      f === "personal" ||
      f.indexOf("personal") >= 0 ||
      f.indexOf("tarea") >= 0 ||
      f.indexOf("falta") >= 0 ||
      f.indexOf("justific") >= 0 ||
      f.indexOf("permiso") >= 0
    );
  }
  function isTimeLike(v) {
    var s = String(v == null ? "" : v).trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?(\s*[AP]M)?$/i.test(s)) return true;
    if (/\b\d{1,2}:\d{2}:\d{2}\b/.test(s) && isDateJunk(s)) return true;
    return false;
  }
  function pad2(n) {
    n = Number(n) || 0;
    return n < 10 ? "0" + n : String(n);
  }
  /** Convierte Date string / ISO / dd-mm a yyyy-MM-dd */
  function toIsoDay(v) {
    if (v == null || v === "" || v === "-") return "";
    if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime())) {
      return v.getFullYear() + "-" + pad2(v.getMonth() + 1) + "-" + pad2(v.getDate());
    }
    var s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    var pe = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    if (pe) return pe[3] + "-" + pad2(pe[2]) + "-" + pad2(pe[1]);
    // "Fri Nov 13 2026 00:00:00 GMT-0500..."
    var junk = Date.parse(s);
    if (!isNaN(junk)) {
      var d = new Date(junk);
      // Evitar fechas basura tipo 1899 (hora Excel)
      if (d.getFullYear() >= 2000 && d.getFullYear() <= 2100) {
        return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
      }
    }
    return "";
  }
  function fmtDate(ymd) {
    if (!ymd || ymd === "-") return "-";
    var s = String(ymd).trim();
    if (isDateJunk(s) || isTimeLike(s) && !/^\d{4}-\d{2}-\d{2}/.test(s) && !/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
      var isoTry = toIsoDay(s);
      if (!isoTry) return "-";
      s = isoTry;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return s;
    var iso = toIsoDay(s);
    var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return s || "-";
    return m[3] + "/" + m[2] + "/" + m[1];
  }
  function fmtTime(t) {
    if (!t || t === "-") return "-";
    var s = String(t).trim();
    // "03:00 PM"
    var ampm = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)$/i);
    if (ampm) {
      var h = Number(ampm[1]);
      var ap = ampm[4].toUpperCase();
      if (ap === "PM" && h < 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
      return pad2(h) + ":" + ampm[2] + (ampm[3] ? ":" + ampm[3] : "");
    }
    // Date junk con hora (Excel time → 1899)
    var tm = s.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
    if (tm && (isDateJunk(s) || /^\d{1,2}:\d{2}/.test(s))) {
      return pad2(tm[1]) + ":" + tm[2] + (tm[3] ? ":" + tm[3] : "");
    }
    if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 8);
    return s.slice(0, 8);
  }
  function splitNombre(full) {
    var parts = String(full || "")
      .replace(/,/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length >= 3) {
      return { apellidoPaterno: parts[0], apellidoMaterno: parts[1], nombres: parts.slice(2).join(" ") };
    }
    if (parts.length === 2) {
      return { apellidoPaterno: parts[0], apellidoMaterno: "", nombres: parts[1] };
    }
    return { apellidoPaterno: "", apellidoMaterno: "", nombres: String(full || "").trim() };
  }
  function fullName(r) {
    if (!r) return "";
    if (r.nombresCompletos) return String(r.nombresCompletos).trim();
    var bits = [r.apellidoPaterno, r.apellidoMaterno, r.nombres].filter(function (x) {
      return String(x || "").trim();
    });
    if (bits.length) return bits.join(" ").trim();
    return String(r.nombres || "").trim();
  }

  /**
   * Detecta desfase: encabezado tiene horaGuardado pero las filas viejas no.
   * Señales: horaGuardado parece DNI, puesto/cargo parece fecha, fIngreso parece motivo.
   */
  function isShifted(r) {
    if (!r) return false;
    var hg = r.horaGuardado;
    var cargo = r.cargo || r.puesto;
    var fi = r.fIngreso || r.fechaIngreso;
    var mot = r.motivo;
    var dni = r.dni;
    if (isDniLike(hg) && (isDateJunk(cargo) || isMotivoLike(fi) || isDateJunk(mot))) return true;
    if (isDniLike(hg) && !isDniLike(dni) && isMotivoLike(fi)) return true;
    if (isTimeLike(r.fechaSalida) && isDateJunk(mot)) return true;
    return false;
  }

  /** Reacomoda campos corridos +1 por horaGuardado fantasma */
  function unshiftRow(r) {
    return {
      id: r.id,
      fechaRegistro: r.fechaRegistro,
      horaRegistro: r.horaRegistro,
      horaGuardado: "",
      dni: r.horaGuardado,
      nombresCompletos: r.dni,
      nombres: r.dni,
      cargo: r.nombres || r.nombresCompletos,
      puesto: r.nombres || r.nombresCompletos,
      fIngreso: r.cargo || r.puesto,
      fechaIngreso: r.cargo || r.puesto,
      motivo: r.fIngreso || r.fechaIngreso,
      fechaSalida: r.motivo,
      horaSalida: r.fechaSalida || r.fechaDel,
      observacion: r.horaSalida,
      observaciones: r.horaSalida,
      responsable: r.observacion || r.observaciones,
      jefeDirecto: r.observacion || r.observaciones,
      dniResponsable: r.responsable || r.jefeDirecto,
      puestoResponsable: r.dniResponsable,
      carnetVerificado: r.puestoResponsable,
      carnetDniEscaneado: r.carnetVerificado,
      carnetVerificadoAt: r.carnetVerificadoAt || "",
      area: r.area || "",
      permiso: r.permiso || "X",
      suspension: r.suspension || "",
      amonestacion: r.amonestacion || "",
      descansoTemporal: r.descansoTemporal || "",
      licenciaCGH: r.licenciaCGH || "",
      licenciaSGH: r.licenciaSGH || "",
      licencia: r.licencia || "",
      otros: r.otros || "",
      cantidadDias: r.cantidadDias != null ? r.cantidadDias : 1,
      _shifted: true,
    };
  }

  /** Alinea respuesta del GET a campos limpios del panel / PDF */
  function normalize(r) {
    if (!r) return r;
    var src = isShifted(r) ? unshiftRow(r) : Object.assign({}, r);

    var nombreFull = String(src.nombresCompletos || src.nombres || "").trim();
    // Si aún quedó "OBRERO" como nombre y hay responsable con nombre real, no mezclar
    var parts = splitNombre(nombreFull);

    var fReg = toIsoDay(src.fechaRegistro) || toIsoDay(src.fecha) || "";
    var fSal = toIsoDay(src.fechaSalida) || fReg;
    var fIngIso = toIsoDay(src.fIngreso || src.fechaIngreso);
    var fIngPdf = fIngIso ? fmtDate(fIngIso) : isMotivoLike(src.fIngreso) ? "-" : fmtDate(src.fechaIngreso || src.fIngreso);

    var motivo = String(src.motivo || "").trim();
    if (isDateJunk(motivo)) motivo = "";
    if (!motivo && isMotivoLike(src.fIngreso)) motivo = String(src.fIngreso).trim();

    var horaSal = src.horaSalida;
    if (isDateJunk(horaSal) && !isTimeLike(horaSal)) horaSal = "";
    horaSal = fmtTime(horaSal);
    if (horaSal === "—" || !horaSal) horaSal = "-";

    var horaReg = fmtTime(src.horaRegistro);
    if (horaReg === "—" || isDateJunk(String(src.horaRegistro || "")) && !/\d{1,2}:\d{2}/.test(String(src.horaRegistro || ""))) {
      horaReg = "-";
    }

    var cargo = String(src.cargo || src.puesto || "").trim();
    if (isDateJunk(cargo) || isMotivoLike(cargo) || toIsoDay(cargo)) cargo = "";

    var out = {
      id: String(src.id || "").trim(),
      fechaRegistro: fReg,
      horaRegistro: horaReg,
      horaGuardado: src.horaGuardado || "",
      dni: (function () {
        var raw = String(src.dni || "").trim();
        var dig = raw.replace(/\D/g, "");
        return isDniLike(dig) ? dig : raw;
      })(),
      nombresCompletos: nombreFull,
      apellidoPaterno: parts.apellidoPaterno,
      apellidoMaterno: parts.apellidoMaterno,
      nombres: parts.nombres || nombreFull,
      area: String(src.area || "").trim(),
      cargo: cargo || String(src.puesto || "").trim(),
      puesto: cargo || String(src.puesto || "").trim(),
      fIngreso: fIngIso || "",
      fechaIngreso: fIngPdf,
      motivo: motivo,
      fechaSalida: fSal,
      fechaDel: fmtDate(fSal),
      fechaAl: fmtDate(fSal),
      fecha: fmtDate(fReg || fSal),
      horaIngreso: src.horaIngreso && src.horaIngreso !== "-" ? fmtTime(src.horaIngreso) : "-",
      horaSalida: horaSal,
      observacion: String(src.observacion || "").trim(),
      observaciones: String(src.observacion || src.observaciones || "PERMISO").trim() || "PERMISO",
      responsable: String(src.responsable || src.jefeDirecto || "").trim(),
      jefeDirecto: String(src.responsable || src.jefeDirecto || "").trim(),
      dniResponsable: String(src.dniResponsable || "").trim(),
      puestoResponsable: String(src.puestoResponsable || "").trim(),
      carnetVerificado: src.carnetVerificado,
      carnetDniEscaneado: src.carnetDniEscaneado || "",
      permiso: src.permiso || "X",
      suspension: src.suspension || "",
      amonestacion: src.amonestacion || "",
      descansoTemporal: src.descansoTemporal || "",
      licenciaCGH: src.licenciaCGH || "",
      licenciaSGH: src.licenciaSGH || "",
      licencia: src.licencia || "",
      otros: src.otros || "",
      cantidadDias: src.cantidadDias != null && src.cantidadDias !== "" ? src.cantidadDias : 1,
    };

    // Si observaciones quedó con un nombre (responsable) y no hay obs real
    if (out.observacion && isDniLike(out.dniResponsable) === false && fold(out.observacion) === fold(out.responsable)) {
      out.observaciones = "PERMISO";
      out.observacion = "";
    }
    if (!out.observacion) out.observaciones = "PERMISO";

    // dniResponsable no debe ser un puesto
    if (out.dniResponsable && !isDniLike(out.dniResponsable) && /supervisor|jefe|encargado/i.test(out.dniResponsable)) {
      if (!out.puestoResponsable) out.puestoResponsable = out.dniResponsable;
      out.dniResponsable = "";
    }
    // carnet
    if (String(out.carnetVerificado) === "SI" || String(out.carnetVerificado) === "NO") {
      /* ok */
    } else if (esSi(out.carnetVerificado)) {
      out.carnetVerificado = "SI";
    }

    return out;
  }
  function normalizeAll(rows) {
    return (rows || []).map(function (r, i) {
      var out = normalize(r);
      if (!out) return out;
      if (!out.id) {
        out.id =
          "R" +
          String(i + 1) +
          "-" +
          String(out.dni || "x") +
          "-" +
          String(out.fechaRegistro || out.fechaSalida || "") +
          "-" +
          String(out.horaSalida || out.horaRegistro || i);
      }
      out._uid = out.id;
      out.fila = out.fila || out.id;
      return out;
    });
  }
  function motivoBadge(motivo) {
    var f = fold(motivo);
    if (f.indexOf("salud") >= 0) return "salud";
    if (f.indexOf("personal") >= 0) return "personal";
    if (f.indexOf("tarea") >= 0) return "tarea";
    if (f.indexOf("falta") >= 0 || f.indexOf("justific") >= 0) return "falta";
    return "otro";
  }
  /* Estado visible del registro: "Incidencia" si el registro lo indica, si no "Pase de salida". */
  function tipoRegistro(r) {
    var t = fold([r.observaciones, r.observacion, r.motivo, r.permiso, r.tipo].join(" "));
    return t.indexOf("incid") >= 0 ? "Incidencia" : "Pase de salida";
  }
  function rowDay(r) {
    return toIsoDay(r.fechaRegistro) || toIsoDay(r.fechaSalida) || toIsoDay(r.fecha) || "";
  }
  function filterRows(rows, f) {
    f = f || {};
    var q = fold(f.q);
    var desde = f.desde ? String(f.desde).slice(0, 10) : "";
    var hasta = f.hasta ? String(f.hasta).slice(0, 10) : "";
    return (rows || []).filter(function (r) {
      if (!r) return false;
      if (f.motivo && f.motivo !== "*" && fold(r.motivo).indexOf(fold(f.motivo)) < 0) return false;
      if (f.rango === "dia" && f.fecha) {
        var day = String(f.fecha).slice(0, 10);
        var fr = toIsoDay(r.fechaRegistro);
        var fs = toIsoDay(r.fechaSalida);
        if (fr !== day && fs !== day) return false;
      }
      if (desde || hasta) {
        var d = rowDay(r);
        if (!d) return false;
        if (desde && d < desde) return false;
        if (hasta && d > hasta) return false;
      }
      if (!q) return true;
      var blob = fold(
        [r.dni, r.nombres, r.nombresCompletos, r.cargo, r.motivo, r.responsable, r.jefeDirecto, r.dniResponsable, r.observacion].join(" ")
      );
      return blob.indexOf(q) >= 0;
    });
  }
  function sortRecords(rows, key, dir) {
    var list = (rows || []).slice();
    dir = dir >= 0 ? 1 : -1;
    list.sort(function (a, b) {
      var va = a && a[key] != null ? a[key] : "";
      var vb = b && b[key] != null ? b[key] : "";
      if (key === "nombres") {
        va = fullName(a);
        vb = fullName(b);
      }
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return list;
  }
  function computeKpis(rows) {
    rows = rows || [];
    var personas = {};
    var salud = 0;
    var vb = 0;
    var ok = 0;
    rows.forEach(function (r) {
      if (r.dni) personas[String(r.dni)] = 1;
      if (/salud/i.test(String(r.motivo || ""))) salud += 1;
      if (String(r.responsable || "").trim() || String(r.dniResponsable || "").trim()) vb += 1;
      if (esSi(r.carnetVerificado) || (String(r.responsable || "").trim() && String(r.motivo || "").trim())) ok += 1;
    });
    return {
      total: rows.length,
      colaboradores: Object.keys(personas).length,
      salud: salud,
      vistoBueno: vb,
      carnetOk: ok,
    };
  }
  function motivosCount(rows) {
    var map = {};
    (rows || []).forEach(function (r) {
      var m = String(r.motivo || "Sin motivo").trim() || "Sin motivo";
      map[m] = (map[m] || 0) + 1;
    });
    return Object.keys(map)
      .map(function (k) {
        return { motivo: k, count: map[k] };
      })
      .sort(function (a, b) {
        return b.count - a.count;
      });
  }
  function optionsFrom(rows) {
    var motivos = {};
    (rows || []).forEach(function (r) {
      var m = String(r.motivo || "").trim();
      if (m) motivos[m] = 1;
    });
    return {
      motivos: Object.keys(motivos).sort(function (a, b) {
        return a.localeCompare(b, "es");
      }),
    };
  }

  QBE.data = {
    fold: fold,
    esSi: esSi,
    fmtDate: fmtDate,
    fmtTime: fmtTime,
    fullName: fullName,
    normalize: normalize,
    normalizeAll: normalizeAll,
    motivoBadge: motivoBadge,
    tipoRegistro: tipoRegistro,
    rowDay: rowDay,
    filterRows: filterRows,
    sortRecords: sortRecords,
    computeKpis: computeKpis,
    motivosCount: motivosCount,
    optionsFrom: optionsFrom,
  };
})(typeof window !== "undefined" ? window : globalThis);
