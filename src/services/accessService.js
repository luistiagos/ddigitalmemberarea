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
 * Monta o payload da requisição de manifesto sem restringir colunas `infos`,
 * garantindo que o backend retorne todos os metadados enriquecidos (incluindo `name`).
 * @param {string} mnemonic
 * @returns {{ mnemonicos: Array<{ name: string }> }}
 */
export function buildManifestPayload(mnemonic) {
  return {
    mnemonicos: [
      {
        name: mnemonic,
      },
    ],
  };
}

/**
 * Consulta o manifesto de jogos de um mnemônico/plataforma.
 * @param {string} mnemonic Mnemônico do sistema (ex: 'ps2', 'atomiswave', 'wii')
 * @returns {Promise<Array<object>>}
 */
export async function getPlatformManifest(mnemonic) {
  if (!mnemonic) return [];

  const payload = buildManifestPayload(mnemonic);

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
 * Verifica se o usuário possui direito a uma plataforma específica.
 * Fonte única do guard de direito por plataforma (id ou mnemonic, case-insensitive, all/*).
 * @param {{ id?: string, mnemonic?: string } | null | undefined} platform
 * @param {Array<string>} userSystems
 * @returns {boolean}
 */
export function isPlatformEntitled(platform, userSystems) {
  if (!platform || !Array.isArray(userSystems)) {
    return false;
  }
  const normalized = userSystems.map((s) => String(s).toLowerCase().trim());
  if (normalized.includes('all') || normalized.includes('*')) {
    return true;
  }
  const pId = String(platform.id || '').toLowerCase().trim();
  const pMnemonic = String(platform.mnemonic || '').toLowerCase().trim();
  return (pId !== '' && normalized.includes(pId)) || (pMnemonic !== '' && normalized.includes(pMnemonic));
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
  return allPlatforms.filter((p) => isPlatformEntitled(p, userSystems));
}

/**
 * Classifica o resultado (ou erro) da consulta de direitos para uma plataforma.
 * @param {{ data?: { success?: boolean, systems?: string[] } | null, error?: any, platform?: { id?: string, mnemonic?: string } | null }} params
 * @returns {'authorized' | 'denied' | 'error' | 'login'}
 */
export function classifyEntitlementResult({ data = null, error = null, platform = null } = {}) {
  if (error) {
    if (error?.response?.status === 401) {
      return 'login';
    }
    return 'error';
  }
  if (!data || data.success !== true) {
    return 'error';
  }
  if (!platform) {
    return 'denied';
  }
  return isPlatformEntitled(platform, data.systems || []) ? 'authorized' : 'denied';
}
