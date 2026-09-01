/* ===========================================================
   Arkonyk — analytics & visitor-intel loader
   1. Google Analytics 4 with region-based Consent Mode v2
   2. Apollo.io website visitor tracking (company-level)
   3. RB2B person-level visitor identification (US traffic)

   All three trackers configured and live. =================== */
var ARKONYK_GA4_ID = "G-BWNLYB4BTZ";
var ARKONYK_APOLLO_APP_ID = "6a0e0019187e52001820a96c";
var ARKONYK_RB2B_KEY = "4N210HXQ7M6Z";

(function () {
  "use strict";

  // Never load anything off a local file or a preview host.
  var host = window.location.hostname;
  if (host !== "arkonyk.com" && host !== "www.arkonyk.com") return;

  /* Shared consent state.
     EEA/UK/CH visitors get nothing stored and no third-party trackers until
     they agree. Detection is timezone-based (Europe/*) — the same regions the
     GA4 consent defaults deny. A future consent banner upgrades them by
     calling Arkonyk.grantConsent(). */
  var stored = null;
  try { stored = localStorage.getItem("ark_consent"); } catch (e) {}
  var tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  var isEuropean = tz.indexOf("Europe/") === 0;
  // Global Privacy Control: the privacy policy commits to honouring it as a
  // request to disable non-essential analytics and visitor identification.
  var gpc = false;
  try { gpc = navigator.globalPrivacyControl === true; } catch (e) {}
  var trackingAllowed = stored === "granted" || (!isEuropean && stored !== "denied" && !gpc);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  /* ============================ Apollo ============================
     Company-level website visitor identification. Identifies the
     ORGANIZATION visiting (via IP/firmographic matching), not the person —
     contact-level tracking is disabled in the tracker configuration. */
  var apolloLoaded = false;
  function loadApollo() {
    if (apolloLoaded || !ARKONYK_APOLLO_APP_ID) return;
    apolloLoaded = true;
    var n = Math.random().toString(36).substring(7);
    var o = document.createElement("script");
    o.src = "https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache=" + n;
    o.async = true; o.defer = true;
    o.onload = function () {
      try { window.trackingFunctions.onLoad({ appId: ARKONYK_APOLLO_APP_ID }); } catch (e) {}
    };
    document.head.appendChild(o);
  }

  /* ============================ RB2B ============================
     Person-level visitor identification, US traffic only (RB2B geofences
     internally; we additionally gate it like every other tracker here).
     Loads nothing until ARKONYK_RB2B_KEY is set. */
  /* Loader below mirrors RB2B's own install snippet (Aug 2026: CloudFront
     ddwl4m2hdecbv, window.reb2b sentinel), wrapped in our gating. If RB2B
     reissues their snippet, update the URL/sentinel here to match. */
  var rb2bLoaded = false;
  function loadRB2B() {
    if (rb2bLoaded || !ARKONYK_RB2B_KEY) return;
    rb2bLoaded = true;
    if (window.reb2b) return;
    window.reb2b = { loaded: true };
    var sc = document.createElement("script");
    sc.async = true;
    sc.src = "https://ddwl4m2hdecbv.cloudfront.net/b/" + ARKONYK_RB2B_KEY + "/" + ARKONYK_RB2B_KEY + ".js.gz";
    var first = document.getElementsByTagName("script")[0];
    first.parentNode.insertBefore(sc, first);
  }

  /* ============================ GA4 ============================ */
  var ga4Active = ARKONYK_GA4_ID && ARKONYK_GA4_ID.indexOf("G-") === 0;
  if (ga4Active) {
    window.gtag = gtag;

    var EU = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU",
              "IS","IE","IT","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO",
              "SK","SI","ES","SE","GB","CH"];

    gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      functionality_storage: "denied",
      personalization_storage: "denied",
      security_storage: "granted",
      region: EU,
      wait_for_update: 500
    });

    gtag("consent", "default", {
      ad_storage: "denied",            // we do not run ads; keep these off everywhere
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted",
      functionality_storage: "granted",
      personalization_storage: "denied",
      security_storage: "granted"
    });

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ARKONYK_GA4_ID);
    document.head.appendChild(s);

    if (gpc && stored !== "granted") {
      gtag("consent", "update", { analytics_storage: "denied", functionality_storage: "denied" });
    }

    gtag("js", new Date());
    gtag("config", ARKONYK_GA4_ID, {
      anonymize_ip: true,
      allow_google_signals: false,      // no ad-personalization / cross-device audiences
      allow_ad_personalization_signals: false
    });
  }

  /* --- public hooks for a future consent control ------------------
     Wire the banner's Accept to grantConsent() and Decline to denyConsent().
     grantConsent also enables Apollo for European visitors. */
  window.Arkonyk = window.Arkonyk || {};
  window.Arkonyk.grantConsent = function () {
    if (window.gtag) gtag("consent", "update", {
      analytics_storage: "granted",
      functionality_storage: "granted"
    });
    try { localStorage.setItem("ark_consent", "granted"); } catch (e) {}
    loadApollo();
    loadRB2B();
  };
  window.Arkonyk.denyConsent = function () {
    if (window.gtag) gtag("consent", "update", {
      analytics_storage: "denied",
      functionality_storage: "denied"
    });
    try { localStorage.setItem("ark_consent", "denied"); } catch (e) {}
  };
  if (stored === "granted" && window.gtag) window.Arkonyk.grantConsent();

  /* --- EEA consent banner ------------------------------------------------
     Shown only to European visitors with no stored choice. Everyone else
     never sees it. GPC browsers are treated as an explicit opt-out and get
     no banner either. Self-contained (inline styles) so it works on every
     page that loads analytics.js, including the standalone benchmark. */
  if (isEuropean && stored === null && !gpc) {
    var renderBanner = function () {
      if (document.getElementById("ark-consent")) return;
      var bar = document.createElement("div");
      bar.id = "ark-consent";
      bar.setAttribute("role", "dialog");
      bar.setAttribute("aria-label", "Cookie and analytics consent");
      bar.style.cssText =
        "position:fixed;left:0;right:0;bottom:0;z-index:9999;" +
        "background:#121517;color:#f4f6f8;border-top:1px solid rgba(255,255,255,.14);" +
        "font:14px/1.5 Inter,system-ui,sans-serif;padding:16px 20px;" +
        "display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:center;" +
        "box-shadow:0 -10px 30px rgba(0,0,0,.35)";
      var txt = document.createElement("span");
      txt.style.cssText = "max-width:62ch";
      txt.innerHTML =
        'We use analytics cookies to understand how this site is used. ' +
        'See our <a href="privacy.html" style="color:#19e3e3">privacy policy</a>.';
      var mkBtn = function (label, primary) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.style.cssText =
          "font:600 14px Inter,system-ui,sans-serif;border-radius:8px;cursor:pointer;" +
          "padding:10px 18px;border:1px solid " +
          (primary ? "#19e3e3;background:#19e3e3;color:#042020"
                   : "rgba(255,255,255,.3);background:transparent;color:#f4f6f8");
        return b;
      };
      var accept = mkBtn("Accept", true);
      var decline = mkBtn("Decline", false);
      var close = function () { if (bar.parentNode) bar.parentNode.removeChild(bar); };
      accept.addEventListener("click", function () { window.Arkonyk.grantConsent(); close(); });
      decline.addEventListener("click", function () { window.Arkonyk.denyConsent(); close(); });
      bar.appendChild(txt); bar.appendChild(accept); bar.appendChild(decline);
      document.body.appendChild(bar);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", renderBanner);
    } else { renderBanner(); }
  }

  /* Tracker boot: everywhere except Europe-without-consent and GPC browsers. */
  if (trackingAllowed) { loadApollo(); loadRB2B(); }

  /* --- conversion events the site already cares about -------------------
     The calculator pushes its own calc_* events into dataLayer and they are
     forwarded automatically by gtag. These cover the rest of the site.     */
  if (ga4Active) document.addEventListener("DOMContentLoaded", function () {
    // Outbound clicks to the products we sell through
    document.querySelectorAll('a[href*="descriptors.com"], a[href*="whobilled.me"]').forEach(function (a) {
      a.addEventListener("click", function () {
        gtag("event", "outbound_click", {
          destination: a.hostname,
          page: window.location.pathname,
          link_text: (a.textContent || "").trim().slice(0, 60)
        });
      });
    });

    // Gated report — the lead moment
    var reportForm = document.querySelector('form[data-gate], #gate-form');
    if (reportForm) {
      reportForm.addEventListener("submit", function () {
        gtag("event", "generate_lead", { source: "confusing_charges_report" });
      });
    }

    // Contact form
    var contact = document.getElementById("contact-form");
    if (contact) {
      contact.addEventListener("submit", function () {
        gtag("event", "generate_lead", { source: "contact_form" });
      });
    }

    // Insights read-depth: fires once when a reader passes 75% of an article
    if (document.querySelector(".ins-body")) {
      var fired = false;
      window.addEventListener("scroll", function () {
        if (fired) return;
        var d = document.documentElement;
        var pct = (window.scrollY + window.innerHeight) / d.scrollHeight;
        if (pct > 0.75) {
          fired = true;
          gtag("event", "article_read", { page: window.location.pathname });
        }
      }, { passive: true });
    }
  });
})();

/* ============== First-party visit beacon (Descriptors platform) ==============
   Org-level network intel: the receiving server notes the visiting NETWORK's
   registered owner (ASN) and discards the IP — no cookies set, nothing stored
   in the browser. Honours the same consent rules as the trackers above
   (EEA/UK/CH opt-in, ark_consent, Global Privacy Control). */
(function () {
  "use strict";
  var host = window.location.hostname;
  if (host !== "arkonyk.com" && host !== "www.arkonyk.com") return;
  var stored = null;
  try { stored = localStorage.getItem("ark_consent"); } catch (e) {}
  var tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  var gpc = false;
  try { gpc = navigator.globalPrivacyControl === true; } catch (e) {}
  var allowed = stored === "granted" ||
    (tz.indexOf("Europe/") !== 0 && stored !== "denied" && !gpc);
  if (!allowed) return;
  try {
    navigator.sendBeacon("https://www.whobilled.me/api/wbm/visit",
      JSON.stringify({ site: host, path: window.location.pathname,
                       ref: document.referrer || null }));
  } catch (e) {}
})();
