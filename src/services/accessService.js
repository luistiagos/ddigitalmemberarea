/**
 * Serviço REST de Acesso e Catálogo da Área de Membros
 * Centraliza as requisições de direitos canônicos e manifesto de ROMs.
 */
import api from './api.js';
import axios from 'axios';

export const MANIFEST_API_URL = 'https://emuladores.pythonanywhere.com/api/catalog/manifest';

/**
 * Consulta os sistemas liberados para o usuário autenticado.
 * Utiliza o interceptor de Bearer Token em api.js.
 * @returns {Promise<{ success: boolean, systems: string[], email?: string, user_id?: number }>}
 */
export async function getUserEntitledSystems() {
  const response = await api.get('/api/app/user/systems');
  if (response.data && response.data.success) {
    return {
      success: true,
      systems: Array.isArray(response.data.systems) ? response.data.systems : [],
      email: response.data.email || '',
      user_id: response.data.user_id,
    };
  }
  return {
    success: false,
    systems: [],
  };
}

/**
 * Consulta o manifesto de jogos de um mnemônico/plataforma.
 * @param {string} mnemonic Mnemônico do sistema (ex: 'ps2', 'atomiswave', 'wii')
 * @returns {Promise<Array<object>>}
 */
export async function getPlatformManifest(mnemonic) {
  if (!mnemonic) return [];

  const payload = {
    mnemonicos: [
      {
        name: mnemonic,
      },
    ],
  };

  // Faz requisição POST para o manifesto
  const response = await axios.post(MANIFEST_API_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  if (response.data && Array.isArray(response.data.entries)) {
    return response.data.entries;
  }
  return [];
}

/**
 * Filtra a lista completa de plataformas retornando apenas as que o usuário possui direito.
 * @param {Array<object>} allPlatforms Lista de todas as 169 plataformas
 * @param {Array<string>} userSystems Lista de mnemônicos liberados do usuário
 * @returns {Array<object>}
 */
export function filterPlatformsByEntitlements(allPlatforms, userSystems) {
  if (!Array.isArray(allPlatforms) || !Array.isArray(userSystems)) {
    return [];
  }

  const normalized = userSystems.map((s) => String(s).toLowerCase().trim());
  const hasAll = normalized.includes('all') || normalized.includes('*');

  if (hasAll) {
    return allPlatforms;
  }

  const systemSet = new Set(normalized);

  return allPlatforms.filter((p) => {
    const pId = (p.id || '').toLowerCase();
    const pMnemonic = (p.mnemonic || '').toLowerCase();
    return systemSet.has(pId) || systemSet.has(pMnemonic);
  });
}
