/* Select formal propio: lista estilizada (reemplaza el menú nativo). */
(function (root) {
  var QBE = root.QBE || (root.QBE = {});

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function closeAll(except) {
    document.querySelectorAll(".qbe-select.is-open").forEach(function (wrap) {
      if (except && wrap === except) return;
      wrap.classList.remove("is-open");
      var list = wrap.querySelector(".qbe-select-list");
      if (list) list.hidden = true;
      var btn = wrap.querySelector(".qbe-select-btn");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }
  function syncLabel(wrap) {
    var sel = wrap._select;
    var label = wrap.querySelector(".qbe-select-label");
    if (!sel || !label) return;
    var opt = sel.options[sel.selectedIndex];
    label.textContent = opt ? opt.textContent : "";
  }
  function paintList(wrap) {
    var sel = wrap._select;
    var list = wrap.querySelector(".qbe-select-list");
    if (!sel || !list) return;
    var html = "";
    var i;
    for (i = 0; i < sel.options.length; i += 1) {
      var o = sel.options[i];
      var active = i === sel.selectedIndex ? " is-active" : "";
      html +=
        '<li><button type="button" role="option" data-idx="' +
        i +
        '" class="' +
        active.trim() +
        '" aria-selected="' +
        (i === sel.selectedIndex ? "true" : "false") +
        '">' +
        esc(o.textContent) +
        "</button></li>";
    }
    list.innerHTML = html;
  }
  function enhance(sel) {
    if (!sel || sel.tagName !== "SELECT" || sel._qbeSelect) return;
    if (sel.closest(".qbe-select")) return;
    if (sel.classList.contains("pager-select") || sel.hasAttribute("data-page-size")) return;

    var wrap = document.createElement("div");
    wrap.className = "qbe-select";
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add("qbe-select-native");
    sel._qbeSelect = wrap;
    wrap._select = sel;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "qbe-select-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML =
      '<span class="qbe-select-label"></span>' +
      '<svg class="qbe-select-caret" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>";

    var list = document.createElement("ul");
    list.className = "qbe-select-list";
    list.setAttribute("role", "listbox");
    list.hidden = true;

    wrap.appendChild(btn);
    wrap.appendChild(list);

    syncLabel(wrap);
    paintList(wrap);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = wrap.classList.contains("is-open");
      closeAll();
      if (!open) {
        paintList(wrap);
        wrap.classList.add("is-open");
        list.hidden = false;
        btn.setAttribute("aria-expanded", "true");
      }
    });

    list.addEventListener("click", function (e) {
      var item = e.target.closest("button[data-idx]");
      if (!item) return;
      var idx = Number(item.getAttribute("data-idx"));
      if (!isFinite(idx)) return;
      sel.selectedIndex = idx;
      syncLabel(wrap);
      paintList(wrap);
      closeAll();
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });

    sel.addEventListener("change", function () {
      syncLabel(wrap);
      paintList(wrap);
    });
  }
  function refresh(sel) {
    if (!sel) return;
    if (!sel._qbeSelect) {
      enhance(sel);
      return;
    }
    syncLabel(sel._qbeSelect);
    paintList(sel._qbeSelect);
  }
  function init(rootEl) {
    (rootEl || document).querySelectorAll("select").forEach(enhance);
  }
  if (!document._qbeSelectDocBound) {
    document._qbeSelectDocBound = true;
    document.addEventListener("click", function () {
      closeAll();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll();
    });
  }

  QBE.selects = { init: init, enhance: enhance, refresh: refresh };
})(typeof window !== "undefined" ? window : globalThis);
