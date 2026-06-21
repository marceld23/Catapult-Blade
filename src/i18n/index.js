// Lightweight i18n runtime for Catapult & Blade.
// - Auto-detects the language from the browser (navigator.language).
// - Persists the choice in localStorage.
// - t(key, params) looks up a string and interpolates {placeholders}.
// - applyTranslations(root) fills elements that carry data-i18n / data-i18n-html.
//
// To add a language: create src/i18n/<code>.js exporting a default object with the
// same keys as en.js, then register it in LOCALES below.

import de from './de.js';
import en from './en.js';

const LOCALES = { de, en };
const FALLBACK = 'en';
const STORAGE_KEY = 'catapultBladeLang';

const listeners = new Set();
let current = detectInitialLocale();

function detectInitialLocale() {
  // Explicit override via URL, e.g. ?lang=en (handy for deep links and screenshots).
  try {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (fromUrl && LOCALES[fromUrl]) return fromUrl;
  } catch (e) { /* ignore */ }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES[saved]) return saved;
  } catch (e) { /* ignore */ }

  const nav = (navigator.language || navigator.userLanguage || FALLBACK).toLowerCase();
  const short = nav.split('-')[0];
  if (LOCALES[short]) return short;
  return LOCALES.de ? 'de' : FALLBACK;
}

/** Available locale codes, e.g. ['de', 'en']. */
export function availableLocales() {
  return Object.keys(LOCALES);
}

/** Current locale code. */
export function getLocale() {
  return current;
}

/**
 * Translate a key. Missing keys fall back to the other language and finally to
 * the key itself, so nothing ever renders blank. `params` values replace
 * {placeholders} in the string.
 */
export function t(key, params) {
  let str = LOCALES[current]?.[key];
  if (str == null) str = LOCALES[FALLBACK]?.[key];
  if (str == null) str = key;
  if (params) {
    str = str.replace(/\{(\w+)\}/g, (m, name) =>
      (params[name] !== undefined && params[name] !== null) ? String(params[name]) : m);
  }
  return str;
}

/** Subscribe to locale changes. Returns an unsubscribe function. */
export function onLocaleChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Switch the active locale and notify listeners + the DOM. */
export function setLocale(code) {
  if (!LOCALES[code] || code === current) return;
  current = code;
  try { localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* ignore */ }
  document.documentElement.lang = code;
  applyTranslations();
  listeners.forEach(cb => { try { cb(code); } catch (e) { console.error(e); } });
}

/**
 * Fill every element under `root` that declares a translation key:
 *   <span data-i18n="menu.start"></span>           -> textContent
 *   <div  data-i18n-html="menu.intro"></div>        -> innerHTML (allows markup)
 *   <input data-i18n-attr="placeholder:form.name">  -> sets the named attribute(s)
 */
export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  root.querySelectorAll('[data-i18n-attr]').forEach(el => {
    el.getAttribute('data-i18n-attr').split(';').forEach(pair => {
      const [attr, key] = pair.split(':').map(s => s && s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}

// Reflect the initial locale on <html lang> as soon as the module loads.
document.documentElement.lang = current;
