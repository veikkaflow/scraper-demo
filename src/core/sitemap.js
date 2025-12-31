class SitemapHandler {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async findSitemapUrl() {
    console.log(`[Sitemap] Starting sitemap search for base URL: ${this.baseUrl}`);
    const possiblePaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap1.xml',
      '/sitemaps.xml'
    ];

    for (const path of possiblePaths) {
      try {
        const sitemapUrl = new URL(path, this.baseUrl).href;
        console.log(`[Sitemap] Trying path: ${sitemapUrl}`);
        
        // Try HEAD first (faster)
        try {
          console.log(`[Sitemap] Attempting HEAD request for ${sitemapUrl}`);
          const headResponse = await fetch(sitemapUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          
          console.log(`[Sitemap] HEAD response status: ${headResponse.status}, ok: ${headResponse.ok}`);
          
          if (headResponse.ok) {
            const contentType = headResponse.headers.get('content-type') || '';
            console.log(`[Sitemap] HEAD content-type: ${contentType}`);
            // Accept various XML content types
            if (contentType.includes('xml') || contentType.includes('text/plain')) {
              console.log(`[Sitemap] ✅ Found sitemap via HEAD: ${sitemapUrl}`);
              return sitemapUrl;
            }
            console.log(`[Sitemap] HEAD content-type doesn't match, trying GET...`);
            // HEAD succeeded but content-type didn't match - need to check content with GET
          }
        } catch (headError) {
          // HEAD failed, will try GET instead
          console.log(`[Sitemap] HEAD request failed for ${sitemapUrl}: ${headError.message}`);
        }

        // If HEAD didn't confirm sitemap (failed or wrong content-type), try GET and check content
        try {
          console.log(`[Sitemap] Attempting GET request for ${sitemapUrl}`);
          const getResponse = await fetch(sitemapUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(10000)
          });
          
          console.log(`[Sitemap] GET response status: ${getResponse.status}, ok: ${getResponse.ok}`);
          
          if (getResponse.ok) {
            const contentType = getResponse.headers.get('content-type') || '';
            console.log(`[Sitemap] GET content-type: ${contentType}`);
            
            const text = await getResponse.text();
            console.log(`[Sitemap] GET response length: ${text.length} characters`);
            console.log(`[Sitemap] GET response preview (first 200 chars): ${text.substring(0, 200)}`);
            
            // Check if it's actually XML content (sitemap or sitemap index)
            // Prioritize content check over content-type, as some servers return wrong content-type
            const hasSitemapIndex = text.includes('<sitemapindex>');
            const hasUrlset = text.includes('<urlset>');
            const hasXmlDecl = text.includes('<?xml');
            const hasSitemapTag = text.trim().startsWith('<') && text.includes('sitemap');
            
            console.log(`[Sitemap] XML content checks:`, {
              hasSitemapIndex,
              hasUrlset,
              hasXmlDecl,
              hasSitemapTag
            });
            
            const isXmlContent = hasSitemapIndex || hasUrlset || hasXmlDecl || hasSitemapTag;
            
            if (isXmlContent) {
              console.log(`[Sitemap] ✅ Found sitemap via GET: ${sitemapUrl}`);
              return sitemapUrl;
            } else {
              console.log(`[Sitemap] ❌ GET response for ${sitemapUrl} is not XML content (status: ${getResponse.status}, content-type: ${contentType})`);
            }
          } else {
            console.log(`[Sitemap] ❌ GET request failed for ${sitemapUrl}: HTTP ${getResponse.status}`);
          }
        } catch (getError) {
          console.log(`[Sitemap] ❌ GET request error for ${sitemapUrl}: ${getError.message}`);
          // Continue to next path
        }
      } catch (error) {
        console.log(`[Sitemap] ❌ Error processing path ${path}: ${error.message}`);
        // Continue to next path
        continue;
      }
    }

    // Try robots.txt
    console.log(`[Sitemap] Trying robots.txt...`);
    try {
      const robotsUrl = new URL('/robots.txt', this.baseUrl).href;
      console.log(`[Sitemap] Fetching robots.txt from: ${robotsUrl}`);
      const response = await fetch(robotsUrl, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const text = await response.text();
        console.log(`[Sitemap] robots.txt content length: ${text.length} characters`);
        // Match both "Sitemap:" and "Sitemap: " patterns
        const sitemapMatches = text.matchAll(/Sitemap:\s*(.+)/gi);
        let matchCount = 0;
        for (const match of sitemapMatches) {
          matchCount++;
          const sitemapUrl = match[1].trim();
          console.log(`[Sitemap] Found sitemap in robots.txt: ${sitemapUrl}`);
          // Validate that it's a valid URL
          try {
            new URL(sitemapUrl);
            console.log(`[Sitemap] ✅ Found sitemap via robots.txt: ${sitemapUrl}`);
            return sitemapUrl;
          } catch (urlError) {
            console.log(`[Sitemap] Invalid URL in robots.txt: ${sitemapUrl}`);
            // Invalid URL, try next match
            continue;
          }
        }
        if (matchCount === 0) {
          console.log(`[Sitemap] No sitemap entries found in robots.txt`);
        }
      } else {
        console.log(`[Sitemap] robots.txt not found: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`[Sitemap] Error fetching robots.txt: ${error.message}`);
    }

    console.log(`[Sitemap] ❌ No sitemap found for ${this.baseUrl}`);
    return null;
  }

  async parseSitemap(sitemapUrl, returnFullData = false) {
    console.log(`[Sitemap] parseSitemap() called for: ${sitemapUrl}, returnFullData: ${returnFullData}`);
    try {
      const response = await fetch(sitemapUrl, {
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xmlText = await response.text();
      console.log(`[Sitemap] Fetched XML, length: ${xmlText.length} characters`);
      console.log(`[Sitemap] XML preview (first 500 chars): ${xmlText.substring(0, 500)}`);
      
      const urls = [];
      const urlData = []; // Full data with metadata

      // Parse XML sitemap
      // Handle both regular sitemap and sitemap index
      // Check for sitemap index (case-insensitive and with whitespace)
      const hasSitemapIndexRegex = /<sitemapindex/i.test(xmlText);
      const hasSitemapIndexIncludes = xmlText.includes('<sitemapindex>');
      const hasSitemapIndexCamelCase = xmlText.includes('<sitemapIndex>');
      const hasSitemapIndex = hasSitemapIndexRegex || hasSitemapIndexIncludes || hasSitemapIndexCamelCase;
      
      console.log(`[Sitemap] Sitemap index detection:`, {
        regex: hasSitemapIndexRegex,
        includes: hasSitemapIndexIncludes,
        camelCase: hasSitemapIndexCamelCase,
        final: hasSitemapIndex
      });
      
      if (hasSitemapIndex) {
        console.log(`[Sitemap] Detected sitemap index, parsing nested sitemaps...`);
        // Sitemap index - extract sitemap URLs
        // Use case-insensitive and handle whitespace/tabs
        const sitemapMatches = xmlText.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/gi);
        let sitemapCount = 0;
        for (const match of sitemapMatches) {
          sitemapCount++;
          const sitemapBlock = match[1];
          console.log(`[Sitemap] Found sitemap block ${sitemapCount}: ${sitemapBlock.substring(0, 200)}`);
          // Handle whitespace and newlines in <loc> tag
          const locMatch = sitemapBlock.match(/<loc>\s*(.*?)\s*<\/loc>/s);
          if (locMatch) {
            const nestedSitemapUrl = locMatch[1].trim();
            console.log(`[Sitemap] Found nested sitemap URL: ${nestedSitemapUrl}`);
            // Recursively parse nested sitemaps
            try {
              const nestedData = await this.parseSitemap(nestedSitemapUrl, returnFullData);
              console.log(`[Sitemap] Parsed ${nestedData.length} items from nested sitemap ${nestedSitemapUrl}`);
              if (returnFullData) {
                urlData.push(...nestedData);
              } else {
                urls.push(...nestedData);
              }
            } catch (error) {
              console.warn(`[Sitemap] Failed to parse nested sitemap ${nestedSitemapUrl}: ${error.message}`);
            }
          } else {
            console.log(`[Sitemap] No <loc> tag found in sitemap block ${sitemapCount}`);
            console.log(`[Sitemap] Block content: ${sitemapBlock}`);
          }
        }
        console.log(`[Sitemap] Found ${sitemapCount} sitemap entries in index`);
      } else {
        console.log(`[Sitemap] Detected regular sitemap, parsing URLs...`);
        // Regular sitemap - extract URLs with metadata
        const urlMatches = xmlText.matchAll(/<url>([\s\S]*?)<\/url>/g);
        let urlCount = 0;
        for (const match of urlMatches) {
          urlCount++;
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
        console.log(`[Sitemap] Found ${urlCount} URL entries in regular sitemap`);
      }

      const result = returnFullData ? urlData : urls;
      console.log(`[Sitemap] parseSitemap() returning ${result.length} items`);
      return result;
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
    console.log(`[Sitemap] getFullSitemapData() called for base URL: ${this.baseUrl}`);
    const sitemapUrl = await this.findSitemapUrl();
    if (!sitemapUrl) {
      console.log(`[Sitemap] ❌ No sitemap URL found, returning null`);
      return null;
    }

    console.log(`[Sitemap] ✅ Found sitemap URL: ${sitemapUrl}`);
    console.log(`[Sitemap] Parsing sitemap...`);
    try {
      const urlData = await this.parseSitemap(sitemapUrl, true);
      console.log(`[Sitemap] ✅ Parsed ${urlData.length} URLs from sitemap`);
      return {
        sitemapUrl: sitemapUrl,
        urls: urlData,
        totalUrls: urlData.length
      };
    } catch (error) {
      console.warn(`[Sitemap] ❌ Sitemap parsing failed: ${error.message}`);
      return null;
    }
  }
}

export default SitemapHandler;

