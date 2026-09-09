// useTranslation — returns a t() bound to the current language.
// Language resolution is deliberately simple: in-memory default of 'en'.
// Replace this hook with one tied to app_settings when language switching ships.

import { useCallback, useMemo, useState } from 'react'
import { t as translate, type Language, type TranslationKey } from '../lib/i18n'

export interface UseTranslationResult {
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  language: Language
  setLanguage: (lang: Language) => void
}

export function useTranslation(initial: Language = 'en'): UseTranslationResult {
  const [language, setLanguage] = useState<Language>(initial)
  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(key, params, language),
    [language],
  )
  return useMemo(() => ({ t, language, setLanguage }), [t, language])
}
