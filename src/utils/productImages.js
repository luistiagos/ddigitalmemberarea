/**
 * Retorna a URL da imagem de capa do produto/pacote.
 * Caso o produto venha com imagem vazia ou nula do backend (ex: id 1000003 - Sega Saturn),
 * aplica fallbacks temáticos de acordo com o nome/plataforma do produto.
 */
export function getEffectiveProductImage(title, image) {
  if (image && typeof image === 'string' && image.trim().length > 0) {
    return image.trim();
  }
  const t = (title || '').toLowerCase();
  if (t.includes('saturn')) {
    return 'https://emulators.digitalstoregames.com/52emul/checkout2/images/saturnbox.webp';
  }
  if (t.includes('switch')) {
    return 'https://emulators.digitalstoregames.com/52emul/checkout2/images/switchbox.webp';
  }
  if (t.includes('xbox 360') || t.includes('xbox360')) {
    return 'https://emulators.digitalstoregames.com/52emul/checkout2/images/xbox360.webp';
  }
  if (t.includes('xbox')) {
    return 'https://emulators.digitalstoregames.com/52emul/checkout2/images/xboxclassicbox.webp';
  }
  if (t.includes('ps1') || t.includes('ps2') || t.includes('ps3') || t.includes('psp') || t.includes('playstation') || t.includes('psx')) {
    return 'https://emulators.digitalstoregames.com/ps2/checkout2/images/ps1ps3psp.webp';
  }
  if (t.includes('nintendo') || t.includes('snes') || t.includes('nes') || t.includes('game boy') || t.includes('n64')) {
    return 'https://emulators.digitalstoregames.com/ps2/checkout2/images/nintendocollection.webp';
  }
  if (t.includes('arcade') || t.includes('mame') || t.includes('neogeo') || t.includes('cps')) {
    return 'https://emulators.digitalstoregames.com/images/arcade.png';
  }
  if (t.includes('vita')) {
    return 'https://emulators.digitalstoregames.com/images/psvita.png';
  }
  return 'https://emulators.digitalstoregames.com/images/multigames.png';
}
