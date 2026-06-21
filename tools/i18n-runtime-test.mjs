// Verifies the i18n runtime (t / applyTranslations / setLocale / onLocaleChange)
// against a tiny DOM shim. Catches interpolation, fallback and DOM-application bugs
// without needing a browser.
class El {
  constructor(tag) { this.tag = tag; this.attrs = {}; this.textContent = ''; this.innerHTML = ''; this.classList = new Set(); }
  getAttribute(n) { return this.attrs[n] ?? null; }
  setAttribute(n, v) { this.attrs[n] = v; }
}
const elements = [];
function mk(attrs) { const e = new El('div'); Object.assign(e.attrs, attrs); elements.push(e); return e; }

const scoreEl = mk({ 'data-i18n': 'hud.score' });        // note: param-less apply -> raw template
const introEl = mk({ 'data-i18n': 'menu.intro' });
const blockEl = mk({ 'data-i18n-html': 'touch.block' });

Object.defineProperty(globalThis, 'navigator', { value: { language: 'de-DE' }, configurable: true });
globalThis.localStorage = { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = String(v); } };
globalThis.document = {
  documentElement: {},
  querySelectorAll(sel) {
    const attr = sel.replace(/[\[\]]/g, '');
    return elements.filter(e => attr in e.attrs);
  }
};

const { t, setLocale, getLocale, applyTranslations, onLocaleChange, availableLocales } = await import('../src/i18n/index.js');

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; } else { fail++; console.log('  FAIL:', name); } };

check('detects de from navigator', getLocale() === 'de');
check('available locales', JSON.stringify(availableLocales().sort()) === '["de","en"]');
check('t interpolates (de)', t('hud.score', { score: 7 }) === 'Punkte: 7');
check('t plain key (de)', t('menu.start') === 'Spiel starten');
check('t missing key -> key name', t('does.not.exist') === 'does.not.exist');
check('t keeps unknown placeholder', t('hud.wave') === 'Welle: {wave}');

let fired = null;
onLocaleChange(code => { fired = code; });
setLocale('en');
check('setLocale switches', getLocale() === 'en');
check('listener fired', fired === 'en');
check('t interpolates (en)', t('hud.score', { score: 7 }) === 'Score: 7');
check('html lang updated', document.documentElement.lang === 'en');
check('applyTranslations set textContent', introEl.textContent.startsWith('You are a knight'));
check('applyTranslations set innerHTML (html)', blockEl.innerHTML === 'Hold<br>shield');

setLocale('de');
check('switch back to de', introEl.textContent.startsWith('Du bist ein Ritter'));

console.log(`\ni18n runtime test: ${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
