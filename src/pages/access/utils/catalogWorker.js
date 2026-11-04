/**
 * Web Worker para agrupamento e deduplicação de catálogo em segundo plano.
 * Impede o congelamento da thread de interface em acervos grandes (ex: PS2 com 19 mil itens).
 */
import { processAndGroupEntries } from './catalogProcessor.js';

self.onmessage = (e) => {
  const { id, entries, platform } = e.data || {};
  try {
    const grouped = processAndGroupEntries(entries || [], platform);
    self.postMessage({ id, success: true, grouped });
  } catch (err) {
    self.postMessage({ id, success: false, error: err?.message || String(err) });
  }
};

