// Aggregates per-domain translation tables into a single record.
import { nav } from './nav'
import { pos } from './pos'
import { inv } from './inv'
import { rep } from './rep'
import { deb } from './deb'
import { set } from './set'

export type Language = 'en' | 'sw'
type StringTable = Record<string, string>

export const translations: Record<Language, StringTable> = {
  en: { ...nav.en, ...pos.en, ...inv.en, ...rep.en, ...deb.en, ...set.en },
  sw: { ...nav.sw, ...pos.sw, ...inv.sw, ...rep.sw, ...deb.sw, ...set.sw },
}

export type TranslationKey = keyof typeof translations.en

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : `{${key}}`,
  )
}

export function t(
  key: TranslationKey,
  params?: Record<string, string | number>,
  language: Language = 'en',
): string {
  const value = translations[language][key] ?? translations.en[key] ?? key
  return interpolate(value, params)
}

export default t
