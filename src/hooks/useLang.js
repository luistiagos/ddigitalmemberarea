import { useSearchParams } from 'react-router-dom';
import { TRANSLATIONS } from '@/pages/translations';

const LS_KEY = 'preferred_lang';

export function useLang() {
  const [searchParams] = useSearchParams();
  const fromUrl = searchParams.get('lang')?.toLowerCase();
  const fromStorage = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
  const raw = fromUrl || fromStorage || 'ptbr';
  const lang = TRANSLATIONS[raw] ? raw : 'ptbr';
  if (fromUrl && TRANSLATIONS[fromUrl] && fromUrl !== fromStorage) {
    try { localStorage.setItem(LS_KEY, fromUrl); } catch {}
  }
  return { lang, t: TRANSLATIONS[lang] };
}
