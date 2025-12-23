import express from 'express';
import Scraper from '../../core/scraper.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { url, mode, useSitemap } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
        code: 'MISSING_URL'
      });
    }

    // Validate mode
    if (!mode) {
      return res.status(400).json({
        success: false,
        error: 'Mode parameter is required',
        code: 'MISSING_MODE'
      });
    }

    // Validate URL format
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
        code: 'INVALID_URL'
      });
    }

    // Initialize scraper
    const scraper = new Scraper(url, mode, useSitemap === true);
    
    // Execute scraping
    const result = await scraper.scrape();

    const response = {
      success: true,
      data: result.data,
      metadata: {
        mode: mode,
        url: url,
        sitemapUsed: result.sitemapUsed || false,
        timestamp: new Date().toISOString()
      }
    };

    // Include sitemap data if available
    if (result.sitemapData) {
      response.sitemapData = result.sitemapData;
    }

    res.json(response);

  } catch (error) {
    next(error);
  }
});

export default router;

