/*
 * Google Tag Manager behind a cookie banner, with Google Consent Mode v2.
 * Load it synchronously, early in <head>:  <script src="consent.js"></script>
 * Anything with [data-consent-open] reopens the banner ("Cookie-instellingen").
 *
 * - GTM_ID below is the only place the container ID lives. Empty = nothing loads.
 * - Every consent type defaults to 'denied' before GTM loads. Accept grants
 *   analytics_storage only; the ad_* types always stay denied.
 * - The choice is kept in localStorage ('sv-consent'); Reject removes GA cookies.
 * - Payment data stays in the browser: the app keeps no state in the URL, and the
 *   query string and hash are stripped below before GTM can read the URL, so
 *   page_location never carries an IBAN, name or amount.
 */
(function () {
  "use strict";

  var GTM_ID = "GTM-MVXMG87D";
  var KEY = "sv-consent";
  var PRIVACY_URL = "/privacy";

  if (!GTM_ID) return;

  // Strip ?query and #hash before GA sees the URL (page_location, page_referrer
  // on the next page). The app never uses either, so this changes nothing for it.
  if ((location.search || location.hash) && window.history && history.replaceState) {
    try { history.replaceState(null, "", location.pathname); } catch (e) {}
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  var gtag = window.gtag;

  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "denied",
    wait_for_update: 500
  });

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  if (read() === "granted") gtag("consent", "update", { analytics_storage: "granted" });

  (function (w, d, s, l, i) {
    w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var f = d.getElementsByTagName(s)[0], j = d.createElement(s);
    j.async = true;
    j.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(i);
    f.parentNode.insertBefore(j, f);
  })(window, document, "script", "dataLayer", GTM_ID);

  // GA sets its cookies on the registrable domain (.small-victories.co), so try
  // every parent domain of this host, not just the host itself.
  function clearGaCookies() {
    var parts = location.hostname.split(".");
    var domains = [""];
    for (var k = 0; k < parts.length - 1; k++) {
      var dom = parts.slice(k).join(".");
      domains.push("; domain=" + dom, "; domain=." + dom);
    }
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (name === "_ga" || name.indexOf("_ga_") === 0 || name === "_gid") {
        domains.forEach(function (d) {
          document.cookie = name + "=; Max-Age=0; path=/" + d;
        });
      }
    });
  }

  function build() {
    var banner = document.createElement("section");
    banner.className = "consent";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-labelledby", "consent-title");
    banner.hidden = true;
    banner.innerHTML =
      '<div class="consent__inner">' +
      '<h2 id="consent-title">Cookies?</h2>' +
      "<p>Mag ik Google Analytics gebruiken om bezoeken te tellen? Dat zet cookies, en alleen als je ja zegt. " +
      "Je betaalgegevens blijven altijd in je browser. Meer in de <a></a>.</p>" +
      '<div class="consent__actions">' +
      '<button type="button" class="btn btn--ghost" data-consent="granted">Accepteren</button>' +
      '<button type="button" class="btn btn--ghost" data-consent="denied">Weigeren</button>' +
      "</div></div>";
    var link = banner.querySelector("a");
    link.href = PRIVACY_URL;
    link.textContent = "privacyverklaring";

    banner.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-consent]");
      if (!btn) return;
      var value = btn.getAttribute("data-consent");
      write(value);
      gtag("consent", "update", { analytics_storage: value });
      if (value === "denied") clearGaCookies();
      banner.hidden = true;
    });
    document.body.appendChild(banner);
    return banner;
  }

  function init() {
    var banner = build();
    var stored = read();
    if (stored !== "granted" && stored !== "denied") banner.hidden = false;
    document.addEventListener("click", function (e) {
      if (!e.target.closest("[data-consent-open]")) return;
      e.preventDefault();
      banner.hidden = false;
      banner.querySelector("button").focus();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
