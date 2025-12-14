(function () {
  const supported = ["en", "pt", "fr"];

  function detectLanguage() {
    const saved = localStorage.getItem("lang");
    if (saved && supported.includes(saved)) return saved;

    const lang = (navigator.language || "en").toLowerCase();

    // Auto:
    // - pt-* => PT
    // - fr-* => FR
    // - sinon EN
    if (lang.startsWith("pt")) return "pt";
    if (lang.startsWith("fr")) return "fr";
    return "en";
  }

  function applyLanguage(lang) {
    const dict = window.TRANSLATIONS?.[lang];
    if (!dict) return;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key] !== undefined) el.innerText = dict[key];
    });

    // placeholders
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (dict[key] !== undefined) el.setAttribute("placeholder", dict[key]);
    });

    localStorage.setItem("lang", lang);
  }

  window.setLanguage = function (lang) {
    if (supported.includes(lang)) applyLanguage(lang);
  };

  document.addEventListener("DOMContentLoaded", () => {
    applyLanguage(detectLanguage());
  });
})();
