import puppeteer from 'puppeteer';

class Browser {
  constructor() {
    this.browser = null;
  }

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async newPage() {
    const browser = await this.init();
    const page = await browser.newPage();
    
    // Set reasonable timeouts
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    return page;
  }

  async closePage(page) {
    if (page) {
      try {
        await page.close();
      } catch (error) {
        // Ignore errors when closing
      }
    }
  }

  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        // Ignore errors
      }
      this.browser = null;
    }
  }
}

// Singleton instance
const browserInstance = new Browser();

export default browserInstance;

