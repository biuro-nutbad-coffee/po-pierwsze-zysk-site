(function () {
  "use strict";

  window.PIERWSZE_ZYSK_SITE = window.PIERWSZE_ZYSK_SITE || {};
  var site = window.PIERWSZE_ZYSK_SITE;

  var consentStorageKey = site.cookieConsentStorageKey || "ppz_cookie_consent_v1";
  var attributionStorageKey = site.attributionStorageKey || "ppz_attribution_v1";
  var consentVersion = site.cookieConsentVersion || "2026-02-25";
  var gaMeasurementId = site.gaMeasurementId || "";
  var metaPixelId = site.metaPixelId || "";

  var gaLoaded = false;
  var metaLoaded = false;
  var pageViewTracked = false;

  var state = {
    necessary: true,
    analytics: false,
    marketing: false,
    version: consentVersion,
    updatedAt: null
  };

  function safeReadStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeWriteStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {}
  }

  function readStoredConsent() {
    var raw = safeReadStorage(consentStorageKey);
    if (!raw) return null;

    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      if (parsed.version !== consentVersion) return null;

      return {
        necessary: true,
        analytics: parsed.analytics === true,
        marketing: parsed.marketing === true,
        version: consentVersion,
        updatedAt: parsed.updatedAt || null
      };
    } catch (e) {
      return null;
    }
  }

  function persistConsent(next) {
    next.updatedAt = new Date().toISOString();
    next.version = consentVersion;
    safeWriteStorage(consentStorageKey, JSON.stringify(next));
  }

  function loadGaIfNeeded() {
    if (gaLoaded) return;
    if (typeof gaMeasurementId !== "string" || !/^G-[A-Z0-9]+$/.test(gaMeasurementId)) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    var ga = document.createElement("script");
    ga.async = true;
    ga.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gaMeasurementId);
    document.head.appendChild(ga);

    window.gtag("js", new Date());
    window.gtag("config", gaMeasurementId, { anonymize_ip: true });
    gaLoaded = true;
  }

  function updateGaConsent() {
    if (!gaLoaded || typeof window.gtag !== "function") return;
    window.gtag("consent", "update", {
      analytics_storage: state.analytics ? "granted" : "denied",
      ad_storage: state.marketing ? "granted" : "denied",
      ad_user_data: state.marketing ? "granted" : "denied",
      ad_personalization: state.marketing ? "granted" : "denied"
    });
  }

  function loadMetaIfNeeded() {
    if (metaLoaded) return;
    if (typeof metaPixelId !== "string" || !/^\d{8,20}$/.test(metaPixelId)) return;

    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq("init", metaPixelId);
    metaLoaded = true;
  }

  function updateMetaConsent() {
    if (!metaLoaded || typeof window.fbq !== "function") return;
    window.fbq("consent", state.marketing ? "grant" : "revoke");
    if (state.marketing && !pageViewTracked) {
      window.fbq("track", "PageView");
      pageViewTracked = true;
    }
  }

  function captureAttributionIfAllowed() {
    if (!state.analytics && !state.marketing) return;

    var params = new URLSearchParams(window.location.search || "");
    var fields = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "msclkid"];
    var updates = {};
    var hasAny = false;

    fields.forEach(function (f) {
      var v = params.get(f);
      if (typeof v === "string" && v.trim() !== "") {
        updates[f] = v.trim();
        hasAny = true;
      }
    });

    if (!hasAny) return;

    var current = {};
    try {
      var raw = safeReadStorage(attributionStorageKey);
      if (raw) current = JSON.parse(raw) || {};
    } catch (e) {
      current = {};
    }

    fields.forEach(function (f) {
      if (updates[f]) current[f] = updates[f];
    });

    if (!current.first_touch_at) current.first_touch_at = new Date().toISOString();
    current.last_touch_at = new Date().toISOString();
    if (!current.landing_page) current.landing_page = window.location.href || "";
    current.last_page = window.location.href || "";
    if (!current.referrer && document.referrer) current.referrer = document.referrer;

    safeWriteStorage(attributionStorageKey, JSON.stringify(current));
  }

  function applyConsent() {
    if (state.analytics) loadGaIfNeeded();
    updateGaConsent();

    if (state.marketing) loadMetaIfNeeded();
    updateMetaConsent();

    captureAttributionIfAllowed();
  }

  function emitConsentChanged() {
    try {
      window.dispatchEvent(new CustomEvent("ppz:consent-changed", { detail: { consent: state } }));
    } catch (e) {}
  }

  function setConsent(next) {
    state = {
      necessary: true,
      analytics: next.analytics === true,
      marketing: next.marketing === true,
      version: consentVersion,
      updatedAt: null
    };
    persistConsent(state);
    applyConsent();
    emitConsentChanged();
  }

  var stored = readStoredConsent();
  if (stored) state = stored;
  applyConsent();

  function createUi() {
    var style = document.createElement("style");
    style.textContent =
      ".ppz-cookie-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:90;max-width:920px;margin:0 auto;border:1px solid rgba(47,79,70,.95);border-radius:16px;background:rgba(15,30,26,.97);box-shadow:0 18px 36px rgba(0,0,0,.42);padding:14px 16px;color:#eaf4f0}" +
      ".ppz-cookie-title{margin:0 0 4px;font-size:1rem;font-weight:800}" +
      ".ppz-cookie-copy{margin:0;font-size:.9rem;line-height:1.45;color:#b8d0c8}" +
      ".ppz-cookie-copy a{color:#eaf4f0}" +
      ".ppz-cookie-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}" +
      ".ppz-cookie-btn{border:1px solid rgba(47,79,70,.95);border-radius:999px;padding:.55rem .95rem;background:#10241f;color:#eaf4f0;font:inherit;font-weight:700;cursor:pointer}" +
      ".ppz-cookie-btn:hover,.ppz-cookie-btn:focus-visible{border-color:#3ea687;outline:none}" +
      ".ppz-cookie-btn-primary{background:linear-gradient(135deg,#2f8f72,#3ea687);border-color:transparent;color:#fff}" +
      ".ppz-cookie-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:95}" +
      ".ppz-cookie-modal{position:fixed;left:16px;right:16px;top:50%;transform:translateY(-50%);max-width:620px;margin:0 auto;z-index:96;border:1px solid rgba(47,79,70,.95);border-radius:16px;background:rgba(15,30,26,.99);color:#eaf4f0;padding:16px}" +
      ".ppz-cookie-modal h2{margin:0 0 8px;font-size:1.2rem}" +
      ".ppz-cookie-modal p{margin:.25rem 0 0;color:#b8d0c8}" +
      ".ppz-cookie-opt{margin-top:12px;border:1px solid rgba(47,79,70,.9);border-radius:12px;background:rgba(20,42,36,.7);padding:10px 12px}" +
      ".ppz-cookie-opt label{display:flex;align-items:flex-start;gap:8px;font-weight:700}" +
      ".ppz-cookie-opt small{display:block;margin-top:4px;color:#b8d0c8;line-height:1.4}" +
      ".ppz-cookie-opt input[type='checkbox']{margin-top:2px;accent-color:#2f8f72}" +
      ".ppz-cookie-modal-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}" +
      ".ppz-hidden{display:none !important}" +
      "@media (min-width:760px){.ppz-cookie-banner{left:24px;right:24px;padding:16px 18px}}";
    document.head.appendChild(style);

    var banner = document.createElement("section");
    banner.className = "ppz-cookie-banner";
    banner.setAttribute("aria-label", "Baner cookies");
    banner.innerHTML =
      '<p class="ppz-cookie-title">Szanujemy Twoją prywatność</p>' +
      '<p class="ppz-cookie-copy">Używamy niezbędnych plików cookies oraz - za Twoją zgodą - analitycznych i marketingowych (GA4, Meta Pixel). Szczegóły w <a href="./polityka-prywatnosci.html">Polityce prywatności</a>.</p>' +
      '<div class="ppz-cookie-actions">' +
      '<button type="button" class="ppz-cookie-btn" data-cookie-reject>Ustaw tylko niezbędne</button>' +
      '<button type="button" class="ppz-cookie-btn" data-cookie-settings>Dostosuj</button>' +
      '<button type="button" class="ppz-cookie-btn ppz-cookie-btn-primary" data-cookie-accept-all>Akceptuj wszystkie</button>' +
      "</div>";

    var backdrop = document.createElement("div");
    backdrop.className = "ppz-cookie-backdrop ppz-hidden";
    backdrop.setAttribute("data-cookie-backdrop", "true");

    var modal = document.createElement("section");
    modal.className = "ppz-cookie-modal ppz-hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Ustawienia cookies");
    modal.innerHTML =
      "<h2>Ustawienia cookies</h2>" +
      "<p>Możesz wybrać, które typy cookies akceptujesz. Niezbędne są wymagane do działania strony.</p>" +
      '<div class="ppz-cookie-opt">' +
      "<label><input type=\"checkbox\" checked disabled> Niezbędne</label>" +
      "<small>Obsługa strony, bezpieczeństwo i zapis Twoich ustawień prywatności.</small>" +
      "</div>" +
      '<div class="ppz-cookie-opt">' +
      '<label><input type="checkbox" id="ppz-cookie-analytics"> Analityczne (GA4)</label>' +
      "<small>Pozwalają mierzyć ruch i skuteczność strony.</small>" +
      "</div>" +
      '<div class="ppz-cookie-opt">' +
      '<label><input type="checkbox" id="ppz-cookie-marketing"> Marketingowe (Meta Pixel)</label>' +
      "<small>Pozwalają mierzyć konwersje i skuteczność kampanii reklamowych.</small>" +
      "</div>" +
      '<div class="ppz-cookie-modal-actions">' +
      '<button type="button" class="ppz-cookie-btn" data-cookie-cancel>Anuluj</button>' +
      '<button type="button" class="ppz-cookie-btn" data-cookie-save>Zapisz wybór</button>' +
      '<button type="button" class="ppz-cookie-btn ppz-cookie-btn-primary" data-cookie-modal-accept-all>Akceptuj wszystkie</button>' +
      "</div>";

    document.body.appendChild(banner);
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    var analyticsInput = modal.querySelector("#ppz-cookie-analytics");
    var marketingInput = modal.querySelector("#ppz-cookie-marketing");

    function openModal() {
      analyticsInput.checked = state.analytics === true;
      marketingInput.checked = state.marketing === true;
      modal.classList.remove("ppz-hidden");
      backdrop.classList.remove("ppz-hidden");
    }

    function closeModal() {
      modal.classList.add("ppz-hidden");
      backdrop.classList.add("ppz-hidden");
    }

    function hideBanner() {
      banner.classList.add("ppz-hidden");
    }

    function showBanner() {
      banner.classList.remove("ppz-hidden");
    }

    banner.querySelector("[data-cookie-accept-all]").addEventListener("click", function () {
      setConsent({ analytics: true, marketing: true });
      hideBanner();
    });

    banner.querySelector("[data-cookie-reject]").addEventListener("click", function () {
      setConsent({ analytics: false, marketing: false });
      hideBanner();
    });

    banner.querySelector("[data-cookie-settings]").addEventListener("click", function () {
      openModal();
    });

    modal.querySelector("[data-cookie-save]").addEventListener("click", function () {
      setConsent({
        analytics: analyticsInput.checked === true,
        marketing: marketingInput.checked === true
      });
      closeModal();
      hideBanner();
    });

    modal.querySelector("[data-cookie-modal-accept-all]").addEventListener("click", function () {
      setConsent({ analytics: true, marketing: true });
      closeModal();
      hideBanner();
    });

    modal.querySelector("[data-cookie-cancel]").addEventListener("click", function () {
      closeModal();
    });

    backdrop.addEventListener("click", closeModal);

    document.querySelectorAll("[data-open-cookie-settings]").forEach(function (el) {
      el.addEventListener("click", function (event) {
        if (event) event.preventDefault();
        openModal();
      });
    });

    if (!stored) {
      showBanner();
    } else {
      hideBanner();
    }

    window.PPZConsent = window.PPZConsent || {};
    window.PPZConsent.openSettings = openModal;
    window.PPZConsent.showBanner = showBanner;
  }

  window.PPZConsent = window.PPZConsent || {};
  window.PPZConsent.hasConsent = function (type) {
    if (type === "analytics") return state.analytics === true;
    if (type === "marketing") return state.marketing === true;
    if (type === "necessary") return true;
    return false;
  };
  window.PPZConsent.getConsent = function () {
    return {
      necessary: true,
      analytics: state.analytics === true,
      marketing: state.marketing === true,
      version: consentVersion,
      updatedAt: state.updatedAt || null
    };
  };
  window.PPZConsent.setConsent = function (next) {
    setConsent(next || {});
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createUi);
  } else {
    createUi();
  }
})();
