const BOT_SIGNALS = [
  {
    reason: 'Automation flag detected',
    test: () => navigator.webdriver === true,
  },
  {
    reason: 'Headless browser user agent detected',
    test: () =>
      /HeadlessChrome|PhantomJS|SlimerJS|Puppeteer|Playwright|Selenium|WebDriver/i.test(
        navigator.userAgent,
      ),
  },
  {
    reason: 'Command-line or script client detected',
    test: () =>
      /bot|crawler|spider|curl|wget|python|scrapy|httpclient|axios|node-fetch|libwww|httpx/i.test(
        navigator.userAgent,
      ),
  },
  {
    reason: 'Browser language headers are missing',
    test: () => !navigator.languages || navigator.languages.length === 0,
  },
  {
    reason: 'Browser plugin surface is missing',
    test: () => {
      const isTouchDevice = navigator.maxTouchPoints > 0
      return !isTouchDevice && navigator.plugins && navigator.plugins.length === 0
    },
  },
]

export function getBotBlockReason() {
  for (const signal of BOT_SIGNALS) {
    try {
      if (signal.test()) return signal.reason
    } catch {
      return 'Browser verification failed'
    }
  }
  return ''
}
