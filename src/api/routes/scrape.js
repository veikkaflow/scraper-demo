import express from 'express';
import Scraper from '../../core/scraper.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { url, mode, useSitemap, maxPages } = req.body;

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

    // Validate maxPages if provided
    let validatedMaxPages = 10; // Default value
    if (maxPages !== undefined) {
      const maxPagesNum = parseInt(maxPages, 10);
      if (isNaN(maxPagesNum) || maxPagesNum < 1) {
        return res.status(400).json({
          success: false,
          error: 'maxPages must be a positive integer',
          code: 'INVALID_MAX_PAGES'
        });
      }
      if (maxPagesNum > 100) {
        return res.status(400).json({
          success: false,
          error: 'maxPages cannot exceed 100',
          code: 'MAX_PAGES_EXCEEDED'
        });
      }
      validatedMaxPages = maxPagesNum;
    }

    // Initialize scraper
    const scraper = new Scraper(url, mode, useSitemap === true, validatedMaxPages);
    
    // Execute scraping
    const result = await scraper.scrape();

    // Check if this is multi-page scraping (has pages array)
    const isMultiPage = result.pages !== undefined;

    const response = {
      success: true,
      metadata: {
        mode: mode,
        url: url,
        sitemapUsed: result.sitemapUsed || false,
        timestamp: new Date().toISOString()
      }
    };

    if (isMultiPage) {
      // Multi-page scraping: use colors, logos, and pages structure
      response.colors = result.colors;
      response.logos = result.logos;
      response.pages = result.pages;
      
      // Include multi-page metadata
      if (result.pagesScraped !== undefined) {
        response.metadata.pagesScraped = result.pagesScraped;
        response.metadata.totalPages = result.totalPages || 0;
        response.metadata.totalProducts = result.totalProducts || 0;
        response.metadata.failedUrls = result.failedUrls || [];
      }
    } else {
      // Single-page scraping: use data structure (no changes)
      response.data = result.data;
    }

    res.json(response);

  } catch (error) {
    next(error);
  }
});

export default router;

