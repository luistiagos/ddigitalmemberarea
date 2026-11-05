// Ambiente de navegador (jsdom) para os testes que renderizam telas.
// Importar ANTES de react/testing-library: os imports ESM avaliam na ordem.
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://127.0.0.1/',
  pretendToBeVisual: true,
});
const { window } = dom;

const define = (name, value) =>
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

define('window', window);
define('document', window.document);
define('navigator', window.navigator);
define('localStorage', window.localStorage);
define('sessionStorage', window.sessionStorage);
for (const name of [
  'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Element', 'Node', 'Text',
  'DocumentFragment', 'Event', 'MouseEvent', 'KeyboardEvent', 'MutationObserver',
  'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
]) {
  if (window[name] !== undefined) {
    define(name, typeof window[name] === 'function' && /^[a-z]/.test(name) ? window[name].bind(window) : window[name]);
  }
}

// jsdom nao implementa IntersectionObserver (scroll infinito do catalogo).
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
define('IntersectionObserver', IntersectionObserverStub);
window.IntersectionObserver = IntersectionObserverStub;

define('IS_REACT_ACT_ENVIRONMENT', true);
