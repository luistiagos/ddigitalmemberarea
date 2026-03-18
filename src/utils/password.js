/**
 * Utilitários de força de senha — compartilhados entre SetPassword e ResetPassword.
 */

/**
 * Calcula a força da senha (0–4).
 * +1 ponto para cada critério atendido:
 *   - mínimo 8 caracteres
 *   - letra maiúscula
 *   - número
 *   - caractere especial
 */
export function calcStrength(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

export const STRENGTH_LABELS = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];

export const STRENGTH_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-green-400',
  'bg-green-500',
];
