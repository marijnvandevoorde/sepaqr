/*
 * SEPA QR-code generator — volledig client-side.
 * Bouwt een EPC069-12 payload (SEPA Credit Transfer) en rendert die als QR-code.
 * Geen netwerkverkeer, geen tracking. Alles draait lokaal in de browser.
 */
(function () {
  "use strict";

  var els = {
    form: document.getElementById("form"),
    name: document.getElementById("name"),
    iban: document.getElementById("iban"),
    bic: document.getElementById("bic"),
    amount: document.getElementById("amount"),
    comm: document.getElementById("comm"),
    qr: document.getElementById("qr"),
    status: document.getElementById("status"),
    payload: document.getElementById("payload"),
    download: document.getElementById("download"),
    reset: document.getElementById("reset")
  };

  var lastPng = null; // data-URL van de laatst gegenereerde QR

  // ---- Validatie-helpers -------------------------------------------------

  function cleanIban(v) {
    return (v || "").replace(/\s+/g, "").toUpperCase();
  }

  // IBAN mod-97 controle (ISO 7064).
  function ibanValid(iban) {
    iban = cleanIban(iban);
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(iban)) return false;
    var rearranged = iban.slice(4) + iban.slice(0, 4);
    var expanded = "";
    for (var i = 0; i < rearranged.length; i++) {
      var c = rearranged.charAt(i);
      expanded += (c >= "A" && c <= "Z") ? (c.charCodeAt(0) - 55).toString() : c;
    }
    // mod-97 in stukken om grote getallen te vermijden
    var remainder = 0;
    for (var j = 0; j < expanded.length; j += 7) {
      remainder = parseInt(remainder + expanded.substr(j, 7), 10) % 97;
    }
    return remainder === 1;
  }

  function formatIban(iban) {
    return cleanIban(iban).replace(/(.{4})/g, "$1 ").trim();
  }

  // Bedrag: accepteer "25", "25,00", "25.00" -> normaliseer naar punt.
  // Geldig EPC-bereik: 0.01 .. 999999999.99 EUR.
  function parseAmount(v) {
    v = (v || "").trim();
    if (v === "") return { ok: true, value: null };
    var norm = v.replace(/\s/g, "").replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(norm)) return { ok: false };
    var num = parseFloat(norm);
    if (isNaN(num) || num < 0.01 || num > 999999999.99) return { ok: false };
    return { ok: true, value: num.toFixed(2) };
  }

  // Belgische gestructureerde mededeling: +++123/4567/89012+++ met mod-97 check.
  function structuredValid(v) {
    var digits = (v || "").replace(/[^\d]/g, "");
    if (digits.length !== 12) return false;
    var base = parseInt(digits.slice(0, 10), 10);
    var check = parseInt(digits.slice(10), 10);
    var mod = base % 97;
    if (mod === 0) mod = 97;
    return mod === check;
  }

  function formatStructured(v) {
    var d = (v || "").replace(/[^\d]/g, "");
    if (d.length !== 12) return v;
    return "+++" + d.slice(0, 3) + "/" + d.slice(3, 7) + "/" + d.slice(7) + "+++";
  }

  // ---- Payload opbouwen --------------------------------------------------

  function byteLength(str) {
    return new TextEncoder().encode(str).length;
  }

  function commType() {
    var checked = els.form.querySelector('input[name="commtype"]:checked');
    return checked ? checked.value : "unstructured";
  }

  function build() {
    var errors = [];
    var name = els.name.value.trim();
    var iban = cleanIban(els.iban.value);
    var bic = els.bic.value.trim().toUpperCase();
    var amountRes = parseAmount(els.amount.value);
    var comm = els.comm.value.trim();
    var ctype = commType();

    // veld-hints
    setHint("name", name ? "" : "");
    field(els.name, name.length > 0);

    var ibanOk = ibanValid(iban);
    field(els.iban, els.iban.value.trim() === "" ? null : ibanOk);
    setHint("iban", els.iban.value.trim() === "" ? "" : (ibanOk ? "✓ geldig (" + formatIban(iban) + ")" : "Ongeldige IBAN"), !ibanOk && els.iban.value.trim() !== "");

    var bicOk = bic === "" || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic);
    field(els.bic, bic === "" ? null : bicOk);
    setHint("bic", bic === "" ? "" : (bicOk ? "" : "Ongeldige BIC"), !bicOk);

    field(els.amount, els.amount.value.trim() === "" ? null : amountRes.ok);
    setHint("amount", els.amount.value.trim() === "" ? "Leeg = betaler vult zelf in" : (amountRes.ok ? "€ " + amountRes.value : "Ongeldig bedrag"), !amountRes.ok && els.amount.value.trim() !== "");

    var commOk = true;
    if (ctype === "structured" && comm !== "") {
      commOk = structuredValid(comm);
      setHint("comm", commOk ? "✓ " + formatStructured(comm) : "Ongeldige gestructureerde mededeling (12 cijfers, mod-97)", !commOk);
    } else {
      setHint("comm", "");
    }
    field(els.comm, comm === "" || ctype === "unstructured" ? null : commOk);

    // verplichte velden / blokkerende fouten
    if (!name) errors.push("Naam ontbreekt");
    if (!iban) errors.push("IBAN ontbreekt");
    else if (!ibanOk) errors.push("IBAN ongeldig");
    if (!bicOk) errors.push("BIC ongeldig");
    if (!amountRes.ok) errors.push("Bedrag ongeldig");
    if (ctype === "structured" && comm !== "" && !commOk) errors.push("Mededeling ongeldig");
    if (name && byteLength(name) > 70) errors.push("Naam te lang (max 70 tekens)");
    if (comm && byteLength(comm) > 140) errors.push("Mededeling te lang");

    if (errors.length) {
      return { ok: false, errors: errors };
    }

    // EPC069-12 velden (versie 002, UTF-8)
    var structured = ctype === "structured" ? comm : "";
    var unstructured = ctype === "unstructured" ? comm : "";

    var lines = [
      "BCD",          // Service Tag
      "002",          // Versie
      "1",            // Character set: 1 = UTF-8
      "SCT",          // Identificatie: SEPA Credit Transfer
      bic,            // BIC (optioneel in v2)
      name,           // Naam begunstigde
      iban,           // IBAN
      amountRes.value ? "EUR" + amountRes.value : "", // Bedrag
      "",             // Purpose (niet gebruikt)
      structured,     // Gestructureerde mededeling
      unstructured,   // Vrije mededeling
      ""              // Begunstigde -> opdrachtgever info
    ];

    // Trailing lege velden mogen weg.
    while (lines.length > 6 && lines[lines.length - 1] === "") lines.pop();

    var payload = lines.join("\n");
    if (byteLength(payload) > 331) {
      return { ok: false, errors: ["Inhoud te lang voor een SEPA QR-code (max 331 bytes)"] };
    }
    return { ok: true, payload: payload };
  }

  // ---- UI-helpers --------------------------------------------------------

  function field(input, state) {
    input.classList.remove("valid", "invalid");
    if (state === true) input.classList.add("valid");
    else if (state === false) input.classList.add("invalid");
  }

  function setHint(key, text, isError) {
    var el = els.form.querySelector('[data-hint="' + key + '"]');
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("error", !!isError);
  }

  function setStatus(text, cls) {
    els.status.textContent = text || "";
    els.status.className = "status" + (cls ? " " + cls : "");
  }

  // ---- QR renderen -------------------------------------------------------

  function render() {
    var res = build();

    if (!res.ok) {
      els.qr.innerHTML = "Vul de gegevens in om een QR-code te genereren";
      els.qr.classList.add("empty");
      els.payload.textContent = "";
      els.download.disabled = true;
      lastPng = null;
      setStatus(res.errors[0] || "", res.errors.length ? "error" : "");
      return;
    }

    // EPC vereist error-correction level M.
    var qr = qrcode(0, "M"); // type 0 = automatisch passende versie
    qr.addData(res.payload, "Byte");
    qr.make();

    var cell = 6;
    var img = qr.createImgTag(cell, 0);
    els.qr.innerHTML = img;
    els.qr.classList.remove("empty");
    els.payload.textContent = res.payload;
    setStatus("QR-code klaar — scan met je bank-app", "ok");

    // PNG voor download genereren via canvas.
    lastPng = toPng(qr, 10, 16);
    els.download.disabled = false;
  }

  function toPng(qr, cell, margin) {
    var count = qr.getModuleCount();
    var size = count * cell + margin * 2;
    var canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#000000";
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(margin + c * cell, margin + r * cell, cell, cell);
        }
      }
    }
    return canvas.toDataURL("image/png");
  }

  // ---- Events ------------------------------------------------------------

  els.form.addEventListener("input", render);
  els.form.addEventListener("change", render);

  els.download.addEventListener("click", function () {
    if (!lastPng) return;
    var a = document.createElement("a");
    a.href = lastPng;
    var name = (els.name.value.trim() || "sepa").replace(/[^\w\-]+/g, "_").slice(0, 40);
    a.download = "sepa-qr-" + name + ".png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  els.reset.addEventListener("click", function () {
    els.form.reset();
    render();
  });

  // Eerste render
  render();
})();
