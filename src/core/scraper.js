import browser from './browser.js';
import SitemapHandler from './sitemap.js';
import BaseMode from '../modes/base-mode.js';
import WordPressMode from '../modes/wordpress-mode.js';
import DataflowVkMode from '../modes/dataflow-vk-mode.js';
import DataflowTravelMode from '../modes/dataflow-travel-mode.js';
import DataCleaner from '../utils/data-cleaner.js';
import ChatbotMode from '../modes/chatbot-mode.js';
import DataflowSitesMode from '../modes/dataflow-sites-mode.js';
import SitemapMode from '../modes/sitemap-mode.js';

class Scraper {
  constructor(url, mode = 'default', useSitemap = false) {
    this.url = url;
    this.mode = mode;
    this.useSitemap = useSitemap; // Explicit flag to use sitemap
    this.modeInstance = this.createModeInstance(mode);
    this.sitemapHandler = new SitemapHandler(url);
    this.sitemapUsed = false;
    this.sitemapData = null;
  }

  createModeInstance(mode) {
    switch (mode) {
      case 'wordpress':
        return new WordPressMode();
      case 'dataflow-vk':
        return new DataflowVkMode();
      case 'dataflow-travel':
        return new DataflowTravelMode();
      case 'default':
        return new BaseMode('default');
      case 'chatbot':
        return new ChatbotMode();
      case 'dataflow-sites':
        return new DataflowSitesMode();
      case 'sitemap':
        return new SitemapMode();
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }
  }

  async scrape() {
    let page = null;
    try {
      page = await browser.newPage();
      
      // Only use sitemap if explicitly requested
      if (this.useSitemap) {
        const sitemapData = await this.sitemapHandler.getFullSitemapData();
        if (sitemapData && sitemapData.urls.length > 0) {
          this.sitemapUsed = true;
          this.sitemapData = sitemapData;
        }
      }

      // Always scrape the original URL
      const mainUrl = this.url;
      console.log(`Scraping URL: ${mainUrl}`);
      
      // Navigate to page
      await page.goto(mainUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait a bit for dynamic content
      await page.waitForTimeout(2000);

      // Extract data using mode-specific logic
      const rawData = await this.modeInstance.extractData(page, mainUrl);

      // Clean and process data
      const cleanedData = DataCleaner.clean(rawData);

      return {
        data: cleanedData,
        sitemapUsed: this.sitemapUsed,
        sitemapData: this.sitemapData || null
      };

    } catch (error) {
      throw new Error(`Scraping failed: ${error.message}`);
    } finally {
      if (page) {
        await browser.closePage(page).catch(() => {
          // Ignore errors when closing
        });
      }
    }
  }
}

export default Scraper;

