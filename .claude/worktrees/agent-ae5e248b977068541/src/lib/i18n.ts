// i18n entry point — re-exports from per-domain tables under ./i18n/.
// Matches the soostori-desktop pattern: this file stays small; each
// domain (nav, pos, inv, rep, deb, set) lives in its own module.
export {
  translations,
  t,
  type Language,
  type TranslationKey,
} from './i18n/index'
export { default } from './i18n/index'
