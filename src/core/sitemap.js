class SitemapHandler {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async findSitemapUrl() {
    const possiblePaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap1.xml',
      '/sitemaps.xml'
    ];

    for (const path of possiblePaths) {
      try {
        const sitemapUrl = new URL(path, this.baseUrl).href;
        const response = await fetch(sitemapUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok && response.headers.get('content-type')?.includes('xml')) {
          return sitemapUrl;
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }

    // Try robots.txt
    try {
      const robotsUrl = new URL('/robots.txt', this.baseUrl).href;
      const response = await fetch(robotsUrl, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const text = await response.text();
        const sitemapMatch = text.match(/Sitemap:\s*(.+)/i);
        if (sitemapMatch) {
          return sitemapMatch[1].trim();
        }
      }
    } catch (error) {
      // robots.txt not found or error
    }

    return null;
  }

  async parseSitemap(sitemapUrl, returnFullData = false) {
    try {
      const response = await fetch(sitemapUrl, {
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xmlText = await response.text();
      const urls = [];
      const urlData = []; // Full data with metadata

      // Parse XML sitemap
      // Handle both regular sitemap and sitemap index
      if (xmlText.includes('<sitemapindex>')) {
        // Sitemap index - extract sitemap URLs
        const sitemapMatches = xmlText.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g);
        for (const match of sitemapMatches) {
          const sitemapBlock = match[1];
          const locMatch = sitemapBlock.match(/<loc>(.*?)<\/loc>/);
          if (locMatch) {
            const nestedSitemapUrl = locMatch[1];
            // Recursively parse nested sitemaps
            try {
              const nestedData = await this.parseSitemap(nestedSitemapUrl, returnFullData);
              if (returnFullData) {
                urlData.push(...nestedData);
              } else {
                urls.push(...nestedData);
              }
            } catch (error) {
              console.warn(`Failed to parse nested sitemap ${nestedSitemapUrl}: ${error.message}`);
            }
          }
        }
      } else {
        // Regular sitemap - extract URLs with metadata
        const urlMatches = xmlText.matchAll(/<url>([\s\S]*?)<\/url>/g);
        for (const match of urlMatches) {
          const urlBlock = match[1];
          const locMatch = urlBlock.match(/<loc>(.*?)<\/loc>/);
          if (locMatch) {
            const url = locMatch[1];
            
            if (returnFullData) {
              // Extract additional metadata
              const lastmodMatch = urlBlock.match(/<lastmod>(.*?)<\/lastmod>/);
              const changefreqMatch = urlBlock.match(/<changefreq>(.*?)<\/changefreq>/);
              const priorityMatch = urlBlock.match(/<priority>(.*?)<\/priority>/);
              
              urlData.push({
                url: url,
                lastmod: lastmodMatch ? lastmodMatch[1] : null,
                changefreq: changefreqMatch ? changefreqMatch[1] : null,
                priority: priorityMatch ? parseFloat(priorityMatch[1]) : null
              });
            } else {
              urls.push(url);
            }
          }
        }
      }

      return returnFullData ? urlData : urls;
    } catch (error) {
      throw new Error(`Failed to parse sitemap: ${error.message}`);
    }
  }

  async getUrls(includeMetadata = false) {
    const sitemapUrl = await this.findSitemapUrl();
    if (!sitemapUrl) {
      return [];
    }

    try {
      const data = await this.parseSitemap(sitemapUrl, includeMetadata);
      return data;
    } catch (error) {
      console.warn(`Sitemap parsing failed: ${error.message}`);
      return [];
    }
  }

  // Get full sitemap data with metadata
  async getFullSitemapData() {
    const sitemapUrl = await this.findSitemapUrl();
    if (!sitemapUrl) {
      return null;
    }

    try {
      const urlData = await this.parseSitemap(sitemapUrl, true);
      return {
        sitemapUrl: sitemapUrl,
        urls: urlData,
        totalUrls: urlData.length
      };
    } catch (error) {
      console.warn(`Sitemap parsing failed: ${error.message}`);
      return null;
    }
  }
}

export default SitemapHandler;

