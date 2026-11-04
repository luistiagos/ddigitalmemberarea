/**
 * Web Worker para agrupamento e deduplicação de catálogo em segundo plano.
 * Impede o congelamento da thread de interface em acervos grandes (ex: PS2 com 19 mil itens).
 */
import { processAndGroupEntries } from './catalogProcessor.js';

self.onmessage = (e) => {
  try {
    if (!e || !e.data) {
      throw new Error('Mensagem vazia ou inválida');
    }
    const { id, entries, platform } = e.data;
    const grouped = processAndGroupEntries(entries || [], platform);
    self.postMessage({ id, success: true, grouped });
  } catch (err) {
    self.postMessage({ id: e?.data?.id, success: false, error: err?.message || String(err) });
  }
};

