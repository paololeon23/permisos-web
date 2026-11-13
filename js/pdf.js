/* PDF formal QU-GH-FR-16 — impresión fiable en la misma página (no iframe 0x0) */
(function (root) {
  var QBE = root.QBE || (root.QBE = {});
  var current = null;
  var prevTitle = "";

  function $(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function dash(v) {
    var s = String(v == null ? "" : v).trim();
    if (!s || s === "-") return "-";
    return s;
  }
  function logoSrc() {
    try {
      return new URL("assets/logo-qberries.png", root.location.href).href;
    } catch (err) {
      return "assets/logo-qberries.png";
    }
  }
  function mark(v) {
    var s = String(v == null ? "" : v).trim().toUpperCase();
    return s === "X" || s === "SI" || s === "SÍ" || s === "1" || s === "TRUE" ? "X" : "";
  }
  function motivosTexto(p) {
    var m = String((p && (p.motivo || p.motivos)) || "").trim();
    if (!m) return "PERMISO";
    return m.toUpperCase();
  }
  function obsTexto(p) {
    var o = String((p && (p.observacion || p.observaciones)) || "").trim();
    if (!o) return "PERMISO";
    return o.toUpperCase();
  }
  function splitNombre(p) {
    var full = QBE.data && QBE.data.fullName ? QBE.data.fullName(p) : String(p.nombresCompletos || p.nombres || "");
    if (p.apellidoPaterno || p.apellidoMaterno) {
      return {
        ap: dash(p.apellidoPaterno),
        am: dash(p.apellidoMaterno),
        nom: dash(p.nombres) !== "-" ? dash(p.nombres) : dash(full),
      };
    }
    var parts = String(full)
      .replace(/,/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length >= 3) return { ap: parts[0], am: parts[1], nom: parts.slice(2).join(" ") };
    if (parts.length === 2) return { ap: parts[0], am: "", nom: parts[1] };
    return { ap: "-", am: "-", nom: full || "-" };
  }
  function fechaForm(p) {
    if (QBE.data && QBE.data.fmtDate) {
      return QBE.data.fmtDate(p.fecha || p.fechaRegistro || p.fechaSalida || p.fechaDel);
    }
    return dash(p.fecha);
  }
  function fechaDel(p) {
    if (p.fechaDel && p.fechaDel !== "-") return dash(p.fechaDel);
    return fechaForm(p);
  }
  function fechaAl(p) {
    if (p.fechaAl && p.fechaAl !== "-") return dash(p.fechaAl);
    return fechaDel(p);
  }
  function horaIn(p) {
    var h = p.horaIngreso;
    if (h && h !== "-") return dash(h);
    return "-";
  }
  function horaOut(p) {
    var h = p.horaSalida;
    if (h && h !== "-") return dash(QBE.data && QBE.data.fmtTime ? QBE.data.fmtTime(h) : h);
    return "-";
  }
  function fileBase(p) {
    var dni = String((p && p.dni) || "sinDNI").replace(/\W+/g, "");
    var day = String((p && (p.fechaRegistro || p.fechaSalida || "")) || "")
      .slice(0, 10)
      .replace(/-/g, "");
    return "QU-GH-FR-16_" + dni + (day ? "_" + day : "");
  }

  /** Estilos de vista previa (modal) — sin tocar el tamaño del card */
  function formCss() {
    return [
      ".fr16{width:100%;max-width:190mm;margin:0 auto;border:1px solid #000;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif}",
      ".fr16-head{display:grid;grid-template-columns:42mm 1fr 48mm;border-bottom:1px solid #000;min-height:22mm}",
      ".fr16-logo{display:flex;align-items:center;justify-content:center;padding:2.5mm;border-right:1px solid #000}",
      ".fr16-logo img{max-width:34mm;max-height:15mm;object-fit:contain;display:block}",
      ".fr16-title{display:flex;align-items:center;justify-content:center;padding:2mm 3mm;text-align:center;border-right:1px solid #000}",
      ".fr16-title h1{margin:0;font-size:15pt;font-weight:700;letter-spacing:.02em;line-height:1.15}",
      ".fr16-meta{display:flex;flex-direction:column;justify-content:center;padding:2mm 2.5mm;font-size:8pt;line-height:1.4}",
      ".fr16-meta b{font-weight:700}",
      ".fr16 table{width:100%;border-collapse:collapse;table-layout:fixed;border-spacing:0}",
      ".fr16 th,.fr16 td{border:1px solid #000;padding:1.7mm 2mm;vertical-align:middle;font-size:9pt}",
      ".fr16 .lab{background:#d9d9d9;font-weight:700;text-align:center;font-size:8pt}",
      ".fr16 .val{background:#fff;font-weight:400;text-align:center;min-height:6mm}",
      ".fr16 .c{text-align:center}",
      ".fr16 .tipo{text-align:left;padding-left:2.5mm}",
      ".fr16 .chk{width:9mm;text-align:center;font-weight:700;font-size:11pt}",
      ".fr16 .lab-left{background:#d9d9d9;font-weight:700;text-align:left;width:32mm;font-size:8.5pt}",
      ".fr16 .motivos-cell{vertical-align:middle;text-align:center;font-weight:700;text-transform:uppercase;padding:3mm}",
      ".fr16-fecha{padding:2.5mm 3mm;font-size:10pt;border-bottom:1px solid #000;background:#fff}",
      ".fr16-fecha b{font-weight:700}",
      ".fr16-firmas{display:grid;grid-template-columns:1fr 1fr 1fr;min-height:38mm;",
      "background:#fff!important;background-image:none!important;background-color:#fff!important}",
      ".fr16-firma{display:flex;align-items:flex-end;justify-content:center;padding:0 4mm 4.5mm;text-align:center;font-size:9pt;font-weight:700;",
      "background:transparent!important;background-image:none!important}",
      ".fr16-firma span{display:block;border-top:1px solid #000;width:100%;max-width:48mm;padding-top:2mm;margin:0 auto;",
      "background:#fff!important;background-image:none!important}",
    ].join("");
  }

  /** Solo al imprimir/PDF: casi todo el ancho de la hoja (poco margen) */
  function printOnlyCss() {
    return [
      "*,*::before,*::after{box-sizing:border-box}",
      "@page{size:A4 portrait;margin:4mm}",
      "#fr16-print-root{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}",
      "#fr16-print-root .fr16{",
      "width:100%!important;max-width:none!important;margin:0!important;",
      "overflow:hidden;page-break-inside:avoid;break-inside:avoid}",
      "#fr16-print-root .fr16 table{width:100%!important}",
      "#fr16-print-root .fr16>table{border-left:0;border-right:0}",
      "#fr16-print-root .fr16>table tr>*:first-child{border-left:0}",
      "#fr16-print-root .fr16>table tr>*:last-child{border-right:0}",
      "#fr16-print-root .fr16,#fr16-print-root .fr16 *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}",
    ].join("");
  }

  /** CSS extra para descarga PDF (mismo ancho amplio) */
  function exportPdfCss() {
    return [
      "*,*::before,*::after{box-sizing:border-box}",
      ".fr16{width:100%!important;max-width:none!important;margin:0!important}",
      ".fr16 table{width:100%!important}",
      ".fr16>table{border-left:0;border-right:0}",
      ".fr16>table tr>*:first-child{border-left:0}",
      ".fr16>table tr>*:last-child{border-right:0}",
    ].join("");
  }

  function docHtml(p) {
    p = p || {};
    var nom = splitNombre(p);
    var permiso = mark(p.permiso) || "X";
    var susp = mark(p.suspension);
    var amon = mark(p.amonestacion);
    var desc = mark(p.descansoTemporal);
    var lcg = mark(p.licenciaCGH);
    var lsg = mark(p.licenciaSGH);
    var lic = mark(p.licencia);
    var otros = mark(p.otros);
    var dias = p.cantidadDias != null && p.cantidadDias !== "" ? p.cantidadDias : 1;
    var area = dash(p.area);
    var puesto = dash(p.puesto || p.cargo);
    var fIng = dash(p.fechaIngreso || (QBE.data && QBE.data.fmtDate ? QBE.data.fmtDate(p.fIngreso) : p.fIngreso));
    var logo = logoSrc();

    return (
      '<article class="fr16">' +
      '<header class="fr16-head">' +
      '<div class="fr16-logo"><img src="' +
      esc(logo) +
      '" alt="Q Berries"/></div>' +
      '<div class="fr16-title"><h1>INCIDENCIAS DEL PERSONAL</h1></div>' +
      '<div class="fr16-meta">' +
      "<div><b>Código:</b> QU-GH-FR-16</div>" +
      "<div><b>Versión:</b> 01</div>" +
      "<div><b>Fecha de aprobación:</b> 7-03-2025</div>" +
      "</div></header>" +
      "<table>" +
      "<tr>" +
      '<th class="lab" style="width:22%">APELLIDO PATERNO</th>' +
      '<th class="lab" style="width:22%">APELLIDO MATERNO</th>' +
      '<th class="lab" style="width:36%">NOMBRES</th>' +
      '<th class="lab" style="width:20%">D.N.I.</th>' +
      "</tr>" +
      "<tr>" +
      '<td class="val c">' +
      esc(nom.ap) +
      "</td>" +
      '<td class="val c">' +
      esc(nom.am) +
      "</td>" +
      '<td class="val c">' +
      esc(nom.nom) +
      "</td>" +
      '<td class="val c">' +
      esc(dash(p.dni)) +
      "</td>" +
      "</tr>" +
      "<tr>" +
      '<th class="lab" colspan="2">ÁREA</th>' +
      '<th class="lab">PUESTO</th>' +
      '<th class="lab">FECHA DE INGRESO</th>' +
      "</tr>" +
      "<tr>" +
      '<td class="val c" colspan="2">' +
      esc(area) +
      "</td>" +
      '<td class="val c">' +
      esc(puesto) +
      "</td>" +
      '<td class="val c">' +
      esc(fIng) +
      "</td>" +
      "</tr>" +
      "</table>" +
      "<table>" +
      "<tr>" +
      '<td class="tipo" style="width:28%">Suspensión</td>' +
      '<td class="chk">' +
      esc(susp) +
      "</td>" +
      '<td class="lab-left">Cantidad de Días</td>' +
      '<td class="val c" colspan="3">' +
      esc(dias) +
      "</td>" +
      "</tr>" +
      "<tr>" +
      '<td class="tipo">Amonestación</td>' +
      '<td class="chk">' +
      esc(amon) +
      "</td>" +
      '<td class="lab-left">Fechas</td>' +
      '<td class="val" colspan="3" style="text-align:left"><b>Del:</b> ' +
      esc(fechaDel(p)) +
      " &nbsp;&nbsp; <b>Al:</b> " +
      esc(fechaAl(p)) +
      "</td>" +
      "</tr>" +
      "<tr>" +
      '<td class="tipo">Permiso</td>' +
      '<td class="chk">' +
      esc(permiso) +
      "</td>" +
      '<td class="lab-left">Hora de Ingreso</td>' +
      '<td class="val c" style="width:14%">' +
      esc(horaIn(p)) +
      "</td>" +
      '<td class="lab-left" style="width:18%">Hora de Salida</td>' +
      '<td class="val c" style="width:14%">' +
      esc(horaOut(p)) +
      "</td>" +
      "</tr>" +
      "<tr>" +
      '<td class="tipo">Descanso Temporal</td>' +
      '<td class="chk">' +
      esc(desc) +
      "</td>" +
      '<td class="lab-left">Observaciones</td>' +
      '<td class="val" colspan="3" style="text-align:left">' +
      esc(obsTexto(p)) +
      "</td>" +
      "</tr>" +
      "<tr>" +
      '<td class="tipo">Licencia C.G.H.</td>' +
      '<td class="chk">' +
      esc(lcg) +
      "</td>" +
      '<td class="lab-left" rowspan="4">Motivos</td>' +
      '<td class="val motivos-cell" colspan="3" rowspan="4">' +
      esc(motivosTexto(p)) +
      "</td>" +
      "</tr>" +
      "<tr><td class=\"tipo\">Licencia S.G.H.</td><td class=\"chk\">" +
      esc(lsg) +
      "</td></tr>" +
      "<tr><td class=\"tipo\">Licencia</td><td class=\"chk\">" +
      esc(lic) +
      "</td></tr>" +
      "<tr><td class=\"tipo\">Otros</td><td class=\"chk\">" +
      esc(otros) +
      "</td></tr>" +
      "</table>" +
      '<div class="fr16-fecha"><b>FECHA:</b> ' +
      esc(fechaForm(p)) +
      "</div>" +
      '<div class="fr16-firmas" style="display:grid;grid-template-columns:1fr 1fr 1fr;min-height:38mm;background:#fff;background-image:none;background-color:#fff;">' +
      '<div class="fr16-firma" style="display:flex;align-items:flex-end;justify-content:center;padding:0 4mm 4.5mm;text-align:center;font-size:9pt;font-weight:700;background:transparent;background-image:none;">' +
      '<span style="display:block;border-top:1px solid #000;width:100%;max-width:48mm;padding-top:2mm;margin:0 auto;background:#fff;background-image:none;">FIRMA JEFE DIRECTO</span></div>' +
      '<div class="fr16-firma" style="display:flex;align-items:flex-end;justify-content:center;padding:0 4mm 4.5mm;text-align:center;font-size:9pt;font-weight:700;background:transparent;background-image:none;">' +
      '<span style="display:block;border-top:1px solid #000;width:100%;max-width:48mm;padding-top:2mm;margin:0 auto;background:#fff;background-image:none;">FIRMA TRABAJADOR</span></div>' +
      '<div class="fr16-firma" style="display:flex;align-items:flex-end;justify-content:center;padding:0 4mm 4.5mm;text-align:center;font-size:9pt;font-weight:700;background:transparent;background-image:none;">' +
      '<span style="display:block;border-top:1px solid #000;width:100%;max-width:48mm;padding-top:2mm;margin:0 auto;background:#fff;background-image:none;">V°B° GH</span></div>' +
      "</div></article>"
    );
  }

  function ensurePrintRoot() {
    var rootEl = $("fr16-print-root");
    if (rootEl) return rootEl;
    rootEl = document.createElement("div");
    rootEl.id = "fr16-print-root";
    rootEl.className = "fr16-print-root";
    rootEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(rootEl);
    return rootEl;
  }

  function cleanupPrint() {
    document.body.classList.remove("is-printing-fr16");
    var rootEl = $("fr16-print-root");
    if (rootEl) {
      rootEl.innerHTML = "";
      rootEl.setAttribute("aria-hidden", "true");
    }
    if (prevTitle) {
      document.title = prevTitle;
      prevTitle = "";
    }
  }

  function waitImages(container, done) {
    var imgs = container.querySelectorAll ? container.querySelectorAll("img") : [];
    imgs = Array.prototype.slice.call(imgs);
    if (!imgs.length) {
      done();
      return;
    }
    var left = imgs.length;
    var finished = false;
    var finish = function () {
      left -= 1;
      if (left <= 0 && !finished) {
        finished = true;
        done();
      }
    };
    imgs.forEach(function (img) {
      if (img.complete) finish();
      else {
        img.addEventListener("load", finish);
        img.addEventListener("error", finish);
      }
    });
    setTimeout(function () {
      if (!finished) {
        finished = true;
        done();
      }
    }, 900);
  }

  /** Asegura ancho completo al imprimir (sin achicar el modal de vista previa) */
  function fitPrintForm(rootEl) {
    try {
      var form = rootEl.querySelector(".fr16");
      if (!form) return;
      form.style.transform = "";
      form.style.maxWidth = "none";
      form.style.width = "100%";
      form.style.margin = "0";
    } catch (e) {}
  }

  /** Impresión correcta: oculta la app y muestra solo el FR-16 completo */
  function printHtml(inner, title) {
    try {
      var rootEl = ensurePrintRoot();
      rootEl.innerHTML =
        '<style id="fr16-inline-style">' + formCss() + printOnlyCss() + "</style>" + inner;
      rootEl.setAttribute("aria-hidden", "false");
      prevTitle = document.title;
      document.title = " ";
      document.body.classList.add("is-printing-fr16");

      var runPrint = function () {
        try {
          fitPrintForm(rootEl);
          root.print();
        } catch (err) {
          cleanupPrint();
          if (QBE.shell && QBE.shell.toast) QBE.shell.toast("No se pudo imprimir.", true);
        }
      };

      waitImages(rootEl, function () {
        setTimeout(runPrint, 120);
      });

      var done = function () {
        cleanupPrint();
        root.removeEventListener("afterprint", done);
      };
      root.addEventListener("afterprint", done);
      setTimeout(done, 60000);
      return true;
    } catch (err2) {
      cleanupPrint();
      if (QBE.shell && QBE.shell.toast) QBE.shell.toast("Error al imprimir.", true);
      return false;
    }
  }

  function triggerBlobDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    }, 4000);
  }

  /** Descarga archivo .pdf real (nunca HTML) */
  function downloadPdfFile(inner, filename) {
    var name = String(filename || "QU-GH-FR-16").replace(/\.pdf$/i, "") + ".pdf";
    if (typeof html2pdf === "undefined") {
      if (QBE.shell && QBE.shell.toast) {
        QBE.shell.toast("No se pudo cargar el generador PDF. Pruebe Imprimir → Guardar como PDF.", true);
      }
      return Promise.resolve(false);
    }

    var old = document.getElementById("fr16-pdf-export");
    if (old) {
      try {
        old.remove();
      } catch (e0) {}
    }

    var holder = document.createElement("div");
    holder.id = "fr16-pdf-export";
    holder.setAttribute("aria-hidden", "true");
    // Ancho útil A4 (~202mm) para que no quede “flotando” con márgenes laterales
    holder.style.cssText =
      "position:fixed;left:0;top:0;width:202mm;padding:0;margin:0;background:#fff;z-index:-1;opacity:0;pointer-events:none;";
    holder.innerHTML =
      "<style>" + formCss() + exportPdfCss() + "body,html{background:#fff}</style>" + inner;
    document.body.appendChild(holder);

    var target = holder.querySelector(".fr16") || holder;
    target.style.width = "100%";
    target.style.maxWidth = "none";
    target.style.margin = "0";
    var opt = {
      margin: [4, 4, 4, 4],
      filename: name,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: Math.ceil(202 * 3.7795),
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all"] },
    };

    function cleanup() {
      try {
        holder.remove();
      } catch (e) {}
    }

    return html2pdf()
      .set(opt)
      .from(target)
      .outputPdf("blob")
      .then(function (blob) {
        if (!blob || !(blob instanceof Blob) || blob.size < 100) {
          throw new Error("PDF vacío");
        }
        var pdfBlob = new Blob([blob], { type: "application/pdf" });
        triggerBlobDownload(pdfBlob, name);
        cleanup();
        return true;
      })
      .catch(function () {
        // Fallback: save() también genera .pdf (nunca HTML)
        return html2pdf()
          .set(opt)
          .from(target)
          .save()
          .then(function () {
            cleanup();
            return true;
          })
          .catch(function (err) {
            cleanup();
            if (QBE.shell && QBE.shell.toast) {
              QBE.shell.toast(
                "No se pudo generar el PDF. Use Imprimir → Guardar como PDF.",
                true
              );
            }
            return false;
          });
      });
  }

  function open(row) {
    if (!row) {
      if (QBE.shell && QBE.shell.toast) QBE.shell.toast("No se encontró el permiso.", true);
      return false;
    }
    current = row;
    var modal = $("pdf-preview");
    var body = $("pdf-body");
    if (!modal || !body) {
      if (QBE.shell && QBE.shell.toast) QBE.shell.toast("Vista PDF no disponible.", true);
      return false;
    }
    body.innerHTML = "<style>" + formCss() + "</style>" + docHtml(row);
    modal.hidden = false;
    modal.removeAttribute("hidden");
    if (QBE.audit) QBE.audit.add("Abrir PDF FR-16", (row.dni || "") + " · " + (QBE.data.fullName(row) || ""));
    return true;
  }
  function close() {
    var modal = $("pdf-preview");
    if (modal) modal.hidden = true;
    current = null;
  }
  function printCurrent() {
    if (!current) {
      if (QBE.shell && QBE.shell.toast) QBE.shell.toast("Abra un permiso primero.", true);
      return;
    }
    // Cierra modal para que no interfiera con la impresión
    var modal = $("pdf-preview");
    if (modal) modal.hidden = true;
    printHtml(docHtml(current), "INCIDENCIAS DEL PERSONAL");
    if (QBE.shell && QBE.shell.toast) {
      QBE.shell.toast("Imprimiendo completo… En el diálogo: Márgenes = Predeterminados y sin encabezados/pies.");
    }
    if (QBE.audit) QBE.audit.add("Imprimir PDF FR-16", current.dni || "");
  }
  function downloadCurrent() {
    if (!current) {
      if (QBE.shell && QBE.shell.toast) QBE.shell.toast("Abra un permiso primero.", true);
      return;
    }
    var name = fileBase(current);
    var html = docHtml(current);
    var btn = $("pdf-download");
    if (btn) btn.disabled = true;
    if (QBE.shell && QBE.shell.toast) QBE.shell.toast("Generando PDF…");
    if (QBE.audit) QBE.audit.add("Descargar PDF FR-16", current.dni || "");
    downloadPdfFile(html, name)
      .then(function (ok) {
        if (btn) btn.disabled = false;
        if (ok && QBE.shell && QBE.shell.toast) {
          QBE.shell.toast("PDF listo · " + name + ".pdf");
        }
      })
      .catch(function () {
        if (btn) btn.disabled = false;
      });
  }
  function printList(rows) {
    rows = rows || [];
    if (!rows.length) {
      if (QBE.shell && QBE.shell.toast) QBE.shell.toast("No hay permisos para imprimir.", true);
      return;
    }
    var html = rows
      .map(function (r, i) {
        return (
          '<div class="fr16-page"' +
          (i < rows.length - 1 ? ' style="page-break-after:always"' : "") +
          ">" +
          docHtml(r) +
          "</div>"
        );
      })
      .join("");
    printHtml(html, "INCIDENCIAS DEL PERSONAL");
    if (QBE.shell && QBE.shell.toast) QBE.shell.toast("Imprimiendo lista (" + rows.length + ")…");
    if (QBE.audit) QBE.audit.add("PDF lista FR-16", rows.length + " registros");
  }
  function bind() {
    if ($("pdf-close")) $("pdf-close").addEventListener("click", close);
    if ($("pdf-cancel")) $("pdf-cancel").addEventListener("click", close);
    if ($("pdf-print")) $("pdf-print").addEventListener("click", printCurrent);
    if ($("pdf-download")) $("pdf-download").addEventListener("click", downloadCurrent);
  }

  QBE.pdf = {
    open: open,
    close: close,
    printList: printList,
    printCurrent: printCurrent,
    downloadCurrent: downloadCurrent,
    bind: bind,
    docHtml: docHtml,
  };
})(typeof window !== "undefined" ? window : globalThis);
