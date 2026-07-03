import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TRANSLATIONS } from '@/pages/translations';
import api from '@/services/api';

const LS_KEY = 'preferred_lang';

export function useLang() {
  const [searchParams] = useSearchParams();
  const fromUrl = searchParams.get('lang')?.toLowerCase();

  // Initialize language from URL, local storage, or fallback to 'ptbr'
  const [currentLang, setCurrentLang] = useState(() => {
    const fromStorage = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    const raw = fromUrl || fromStorage || 'ptbr';
    return TRANSLATIONS[raw] ? raw : 'ptbr';
  });

  // Keep state and localStorage in sync if URL contains a valid 'lang' parameter
  useEffect(() => {
    if (fromUrl && TRANSLATIONS[fromUrl]) {
      setCurrentLang(fromUrl);
      try {
        localStorage.setItem(LS_KEY, fromUrl);
      } catch {}
    }
  }, [fromUrl]);

  // If no language is explicitly set (neither via URL nor local storage), detect using backend GeoIP
  useEffect(() => {
    const fromStorage = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    if (!fromUrl && !fromStorage) {
      api.get('/auth/detect-lang')
        .then(({ data }) => {
          if (data && data.lang && TRANSLATIONS[data.lang]) {
            setCurrentLang(data.lang);
            try {
              localStorage.setItem(LS_KEY, data.lang);
            } catch {}
          }
        })
        .catch(() => {
          // Fall back silently to default 'ptbr'
        });
    }
  }, [fromUrl]);

  return { lang: currentLang, t: TRANSLATIONS[currentLang] };
}
