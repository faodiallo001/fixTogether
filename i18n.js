(function () {
  "use strict";

  // -----------------------------
  // CONFIG
  // -----------------------------
  const DEFAULT_LANG = "en";
  const SUPPORTED = ["en", "fr", "pt"];
  const STORAGE_KEY = "ft_lang";

  // -----------------------------
  // HELPERS
  // -----------------------------
  function safeLower(s) {
    return (s || "").toString().trim().toLowerCase();
  }

  function normalizeLang(lang) {
    const l = safeLower(lang);

    // accepter fr-FR, pt-BR, en-US, etc.
    if (l.startsWith("fr")) return "fr";
    if (l.startsWith("pt")) return "pt";
    if (l.startsWith("en")) return "en";

    // sinon si exact match
    if (SUPPORTED.includes(l)) return l;

    return null;
  }

  function getQueryLang() {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("lang");
      return normalizeLang(q);
    } catch {
      return null;
    }
  }

  function getStoredLang() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return normalizeLang(s);
    } catch {
      return null;
    }
  }

  function getNavigatorLang() {
    try {
      const nav = navigator.languages && navigator.languages.length
        ? navigator.languages[0]
        : navigator.language;
      return normalizeLang(nav);
    } catch {
      return null;
    }
  }

  function chooseLang() {
    // 1) ?lang=fr
    const q = getQueryLang();
    if (q) return q;

    // 2) localStorage
    const st = getStoredLang();
    if (st) return st;

    // 3) navigateur
    const nv = getNavigatorLang();
    if (nv) return nv;

    return DEFAULT_LANG;
  }

  function getDict(lang) {
    const all = window.TRANSLATIONS || {};
    return all[lang] || all[DEFAULT_LANG] || {};
  }

  function t(lang, key) {
    const dict = getDict(lang);
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];

    // fallback : essayer la langue par défaut
    const fallback = getDict(DEFAULT_LANG);
    if (Object.prototype.hasOwnProperty.call(fallback, key)) return fallback[key];

    // si la clé n'existe pas, retourner la clé (utile pour debug)
    return key;
  }

  // -----------------------------
  // APPLY TRANSLATIONS
  // -----------------------------
  function applyTranslations(lang) {
    // Mettre un indicateur sur le HTML (utile si tu veux des styles par langue)
    try {
      document.documentElement.setAttribute("lang", lang);
      document.documentElement.setAttribute("data-lang", lang);
    } catch {}

    // 1) Texte simple
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = t(lang, key);
    });

    // 2) HTML (innerHTML)
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (!key) return;
      el.innerHTML = t(lang, key);
    });

    // 3) Placeholder
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      el.setAttribute("placeholder", t(lang, key));
    });

    // 4) Value (boutons / inputs)
    document.querySelectorAll("[data-i18n-value]").forEach((el) => {
      const key = el.getAttribute("data-i18n-value");
      if (!key) return;
      el.value = t(lang, key);
    });

    // 5) Options de select (option par option)
    // Utilisation : <option data-i18n-option="fix_goal_1"></option>
    document.querySelectorAll("option[data-i18n-option]").forEach((opt) => {
      const key = opt.getAttribute("data-i18n-option");
      if (!key) return;
      opt.textContent = t(lang, key);
    });

    // 6) Title de page (optionnel)
    // Utilisation : <title data-i18n="page_title_x"></title>
    // (déjà couvert par data-i18n si tu le mets)
  }

  // -----------------------------
  // PUBLIC API
  // -----------------------------
  function setLang(lang) {
    const n = normalizeLang(lang) || DEFAULT_LANG;

    // stocker
    try {
      localStorage.setItem(STORAGE_KEY, n);
    } catch {}

    // appliquer
    applyTranslations(n);

    // exposer globalement (au cas où)
    window.__FT_LANG__ = n;

    return n;
  }

  function initI18n() {
    const lang = chooseLang();
    setLang(lang);
  }

  // -----------------------------
  // INIT
  // -----------------------------
  // Attendre DOM prêt
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initI18n);
  } else {
    initI18n();
  }

  // Expose
  window.setLang = setLang;
})();

