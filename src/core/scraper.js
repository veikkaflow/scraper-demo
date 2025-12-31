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
  constructor(url, mode = 'default', useSitemap = false, maxPages = 0) {
    this.url = url;
    this.mode = mode;
    this.useSitemap = useSitemap; // Explicit flag to use sitemap
    this.maxPages = maxPages; // Maximum number of pages to scrape from sitemap
    this.modeInstance = this.createModeInstance(mode);
    this.sitemapHandler = new SitemapHandler(url);
    this.sitemapUsed = false;
    this.sitemapData = null;
  }

  createModeInstance(mode) {
    switch (mode) {
      case 'wordpress':
        return new WordPressMode();
      case 'wordpress2':
        return new BaseMode('wordpress2');
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
    // Multi-page scraping mode: use sitemap to scrape multiple pages
    if (this.useSitemap && this.maxPages > 0) {
      return await this.scrapeMultiplePages();
    }

    // Single page scraping mode (original behavior)
    let page = null;
    try {
      page = await browser.newPage();
      
      // Only use sitemap if explicitly requested (for metadata)
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

  async scrapeMultiplePages() {
    console.log(`[Scraper] scrapeMultiplePages() called - maxPages: ${this.maxPages}`);
    const sitemapData = await this.sitemapHandler.getFullSitemapData();
    console.log(`[Scraper] sitemapData received:`, {
      hasData: !!sitemapData,
      hasUrls: !!(sitemapData && sitemapData.urls),
      urlCount: sitemapData ? sitemapData.urls?.length : 0
    });
    
    if (!sitemapData || !sitemapData.urls || sitemapData.urls.length === 0) {
      // Fallback to single page scraping if no sitemap URLs found
      console.warn('[Scraper] ❌ No sitemap URLs found, falling back to single page scraping');
      // Temporarily disable multi-page mode to avoid recursion
      const originalMaxPages = this.maxPages;
      this.maxPages = 0;
      try {
        return await this.scrape();
      } finally {
        this.maxPages = originalMaxPages;
      }
    }

    this.sitemapUsed = true;
    this.sitemapData = sitemapData;

    // Get URLs from sitemap (limit by maxPages)
    const urls = sitemapData.urls
      .slice(0, this.maxPages)
      .map(item => typeof item === 'string' ? item : item.url)
      .filter(url => url); // Filter out any null/undefined URLs

    console.log(`Scraping ${urls.length} pages from sitemap`);

    const results = [];
    const failedUrls = [];
    let totalProducts = 0;

    // Scrape each URL
    for (const urlToScrape of urls) {
      let page = null;
      try {
        page = await browser.newPage();
        console.log(`Scraping URL: ${urlToScrape}`);
        
        await page.goto(urlToScrape, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await page.waitForTimeout(2000);

        const rawData = await this.modeInstance.extractData(page, urlToScrape);
        const cleanedData = DataCleaner.clean(rawData);

        results.push({
          url: urlToScrape,
          data: cleanedData
        });

        // Count products if available
        if (cleanedData.products && Array.isArray(cleanedData.products)) {
          totalProducts += cleanedData.products.length;
        }

      } catch (error) {
        console.error(`Failed to scrape ${urlToScrape}: ${error.message}`);
        failedUrls.push({
          url: urlToScrape,
          error: error.message
        });
      } finally {
        if (page) {
          await browser.closePage(page).catch(() => {
            // Ignore errors when closing
          });
        }
      }
    }

    // Extract colors and logos from first page
    const firstPageData = results.length > 0 ? results[0].data : null;
    const colors = firstPageData?.colors || null;
    const logos = firstPageData?.logos || null;

    // Remove colors and logos from each page's data for pages list
    const pages = results.map(result => {
      const pageData = { ...result.data };
      delete pageData.colors;
      delete pageData.logos;
      return {
        url: result.url,
        ...pageData
      };
    });

    return {
      colors: colors,
      logos: logos,
      pages: pages,
      sitemapUsed: this.sitemapUsed,
      sitemapData: this.sitemapData,
      pagesScraped: results.length,
      totalPages: sitemapData.urls ? sitemapData.urls.length : 0,
      totalProducts: totalProducts,
      failedUrls: failedUrls
    };
  }

  mergeResults(results) {
    if (results.length === 0) {
      return {};
    }

    const merged = {};

    // Fields that should only be taken from the first page
    const firstPageOnlyFields = ['colors', 'logos'];

    // Collect all keys from all results
    const allKeys = new Set();
    results.forEach(result => {
      if (result.data) {
        Object.keys(result.data).forEach(key => allKeys.add(key));
      }
    });

    // Merge each key
    allKeys.forEach(key => {
      // For colors and logos, only use first page
      if (firstPageOnlyFields.includes(key)) {
        const firstValue = results[0]?.data?.[key];
        if (firstValue !== null && firstValue !== undefined) {
          merged[key] = firstValue;
        }
        return;
      }

      const values = results
        .map(result => result.data?.[key])
        .filter(val => val !== null && val !== undefined);

      if (values.length === 0) {
        return;
      }

      // If first value is an array, merge all arrays
      if (Array.isArray(values[0])) {
        const mergedArray = [];
        values.forEach(arr => {
          if (Array.isArray(arr)) {
            mergedArray.push(...arr);
          }
        });
        if (mergedArray.length > 0) {
          merged[key] = mergedArray;
        }
      } else {
        // For non-array values, use first non-null value
        merged[key] = values[0];
      }
    });

    return merged;
  }
}

export default Scraper;

