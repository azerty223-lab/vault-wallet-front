const TRANSLATIONS = {
  en: {
    'meta.description': 'Demo interface for a fictional digital wallet.',
    'common.back': 'Back',
    'common.help': 'Help',
    'home.title': 'Join 200M users who are securing their financial future',
    'home.termsPrefix': 'I have read and agree to the',
    'home.terms': 'Terms of Service',
    'home.termsJoiner': 'and the',
    'home.privacy': 'Privacy Notice',
    'home.existingWallet': 'I already have a wallet',
    'home.demoFeedback': 'Demo mode: no real wallet is created.',
    'import.title': 'Select your existing wallet',
    'import.visualTitle': 'Import a wallet',
    'import.walletListLabel': 'Available wallets',
    'import.otherWallet': 'Other mobile wallet or extension',
    'details.title': 'Import wallet details',
    'details.walletName': 'Wallet Name',
    'details.defaultWalletName': 'Main wallet',
    'details.clearWalletName': 'Clear wallet name',
    'details.walletNameHelper': 'You can edit this later',
    'details.descriptionLabel': 'Enter Secret Phrase / Private Key',
    'details.descriptionPlaceholder': 'Enter Secret Phrase / Private Key',
    'details.descriptionHelper': 'Secret Phrase is typically 12 (sometimes 18,24) words separated by single spaces. Private Key is a long alphanumeric code.',
    'details.import': 'Import',
  },
}

const SUPPORTED_LANGUAGES = new Set(['en'])
const DEFAULT_LANGUAGE = 'en'

function normalizeLanguage(lang) {
  return lang.toLowerCase().split('-')[0]
}

export function resolveLanguage() {
  const urlLang = new URLSearchParams(window.location.search).get('lang')
  const candidates = [
    urlLang,
    ...(navigator.languages?.length ? navigator.languages : [navigator.language]),
  ].filter(Boolean)

  for (const lang of candidates) {
    const normalized = normalizeLanguage(lang)
    if (SUPPORTED_LANGUAGES.has(normalized)) return normalized
  }

  return DEFAULT_LANGUAGE
}

export function translate(key, lang = DEFAULT_LANGUAGE) {
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS[DEFAULT_LANGUAGE][key] ?? key
}

export function applyTranslations(lang) {
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'

  document.querySelector('meta[name="description"]')?.setAttribute('content', translate('meta.description', lang))

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = translate(el.dataset.i18n, lang)
  })

  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    el.dataset.i18nAttr.split(';').forEach(entry => {
      const [attr, key] = entry.split(':').map(s => s.trim())
      if (attr && key) el.setAttribute(attr, translate(key, lang))
    })
  })
}
