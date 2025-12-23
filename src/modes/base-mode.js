import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BaseMode - Perusluokka kaikille scraping-modeille
 * 
 * Lifecycle:
 * 1. beforeExtract() - Valmistelu (esim. värit/logot ennen poistoa)
 * 2. removeUnwantedElements() - Poista unwanted elementit globaalisti
 * 3. extractGenericData() - Yleinen poiminta configista
 * 4. extractCustomData() - Erikoistunut poiminta (yksilöllinen per mode)
 * 5. afterExtract() - Jälkikäsittely
 */
class BaseMode {
  constructor(configName) {
    this.configName = configName;
    this.config = null;
    this.loadConfig();
  }

  // ============================================
  // CONFIG MANAGEMENT
  // ============================================
  
  loadConfig() {
    try {
      const configPath = path.join(__dirname, '../config', `${this.configName}.json`);
      const configData = fs.readFileSync(configPath, 'utf-8');
      this.config = JSON.parse(configData);
    } catch (error) {
      throw new Error(`Failed to load config for mode ${this.configName}: ${error.message}`);
    }
  }

  getName() {
    return this.config?.name || this.configName;
  }

  getSelectors() {
    return this.config?.selectors || {};
  }

  getSitemapConfig() {
    return this.config?.sitemap || { enabled: true, priority: false };
  }

  getDetectionConfig() {
    return this.config?.detection || {};
  }

  // ============================================
  // MAIN EXTRACTION FLOW (Template Method)
  // ============================================
  
  /**
   * Päämetodi - template method pattern
   * Kutsuu lifecycle-metodeja järjestyksessä
   */
  async extractData(page, url) {
    const result = {};
    
    // 1. BEFORE: Valmistelu (esim. värit/logot ennen unwanted poistoa)
    const beforeData = await this.beforeExtract(page, url);
    Object.assign(result, beforeData);
    
    // 2. REMOVE: Poista unwanted elementit globaalisti
    await this.removeUnwantedElements(page);
    
    // 3. GENERIC: Poimi yleiset kentät configista
    const genericData = await this.extractGenericData(page, url);
    Object.assign(result, genericData);
    
    // 4. CUSTOM: Poimi erikoistunut data (per mode)
    const customData = await this.extractCustomData(page, url);
    Object.assign(result, customData);
    
    // 5. AFTER: Jälkikäsittely
    const afterData = await this.afterExtract(page, url, result);
    Object.assign(result, afterData);
    
    return result;
  }

  // ============================================
  // LIFECYCLE HOOKS (Override in subclasses)
  // ============================================
  
  /**
   * BEFORE: Valmistelu ennen unwanted poistoa
   * Käytä tätä jos tarvitset dataa ennen kuin unwanted elementit poistetaan
   * Esim. värit, logot, content
   */
  async beforeExtract(page, url) {
    const selectors = this.getSelectors();
    const result = {};
    
    // Värit (jos configissa määritelty)
    if (selectors.colors) {
      result.colors = await this.extractColors(page, selectors.colors);
    }
    
    // Logot (jos configissa määritelty)
    if (selectors.logos?.container) {
      result.logos = await this.extractLogosFromConfig(page, selectors.logos);
    }
    
    // Content (jos configissa on wanted_selectors)
    if (selectors.wanted_selectors && selectors.wanted_selectors.length > 0) {
      result.content = await this.extractContentText(page);
    }
    
    return result;
  }

  /**
   * CUSTOM: Erikoistunut poiminta
   * Ylikirjoita mode-luokissa jos tarvitset erityistä logiikkaa
   */
  async extractCustomData(page, url) {
    // Oletus: ei mitään
    // Ylikirjoita mode-luokissa tarvittaessa
    return {};
  }

  /**
   * AFTER: Jälkikäsittely
   * Käytä tätä viimeistelyyn tai muunnoksiin
   */
  async afterExtract(page, url, data) {
    // Oletus: ei mitään
    // Ylikirjoita mode-luokissa tarvittaessa
    return {};
  }

  // ============================================
  // UNWANTED ELEMENTS REMOVAL
  // ============================================
  
  async removeUnwantedElements(page) {
    const selectors = this.getSelectors();
    const unwantedSelectors = selectors.unwanted_selectors || [];
    
    if (unwantedSelectors.length === 0) return;
    
    await page.evaluate((unwantedSelectors) => {
      unwantedSelectors.forEach(selector => {
        try {
          const cleanSelector = selector.replace(/ i\]$/, ']');
          document.querySelectorAll(cleanSelector).forEach(el => {
            el.remove();
          });
        } catch (e) {
          // Ignore invalid selectors
        }
      });
    }, unwantedSelectors);
  }

  // ============================================
  // GENERIC DATA EXTRACTION
  // ============================================
  
  /**
   * Poimi yleiset kentät config-tiedoston selectorsien perusteella
   */
  async extractGenericData(page, url) {
    const selectors = this.getSelectors();
    const data = {};

    for (const [key, selectorConfig] of Object.entries(selectors)) {
      // Skip erikoiskentät
      if (this.shouldSkipSelector(key)) {
        continue;
      }
      
      try {
        if (typeof selectorConfig === 'object' && selectorConfig.container) {
          // Multiple items (esim. products, services)
          data[key] = await this.extractMultipleItems(page, selectorConfig);
          this.logExtractionResult(key, data[key], selectorConfig.container);
        } else if (typeof selectorConfig === 'string') {
          // Single value (esim. title, description)
          data[key] = await this.extractSingleValue(page, selectorConfig);
          this.logExtractionResult(key, data[key], selectorConfig);
        }
      } catch (error) {
        console.error(`❌ Error extracting ${key}:`, error.message);
        data[key] = null;
      }
    }

    return data;
  }

  shouldSkipSelector(key) {
    const skipKeys = [
      'unwanted_selectors',
      'wanted_selectors',
      'max_text_length',
      'min_text_length',
      'colors',
      'logos',
      'content' // Skip content - handled by custom extraction
    ];
    return skipKeys.includes(key);
  }

  logExtractionResult(key, value, selector) {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      console.log(`⚠️ No data found for ${key} using selector: ${selector}`);
    } else {
      const count = Array.isArray(value) ? value.length : 1;
      const preview = Array.isArray(value) 
        ? `${count} items` 
        : String(value).substring(0, 50);
      console.log(`✅ Found ${count} item(s) for ${key}: ${preview}...`);
    }
  }

  // ============================================
  // EXTRACTION HELPERS
  // ============================================
  
  async extractMultipleItems(page, selectorConfig) {
    try {
      const selectors = this.getSelectors();
      const unwantedSelectors = selectors.unwanted_selectors || [];
      
      const items = await page.evaluate((config) => {
        const containerSelectors = config.container.split(',').map(s => s.trim());
        let containers = [];
        
        for (const selector of containerSelectors) {
          const found = document.querySelectorAll(selector);
          if (found.length > 0) {
            containers = Array.from(found);
            break;
          }
        }

        if (containers.length === 0) {
          return [];
        }

        const results = [];

        containers.forEach(container => {
          if (config.unwantedSelectors && config.unwantedSelectors.length > 0) {
            config.unwantedSelectors.forEach(unwantedSelector => {
              try {
                const cleanSelector = unwantedSelector.replace(/ i\]$/, ']');
                container.querySelectorAll(cleanSelector).forEach(unwantedEl => {
                  unwantedEl.remove();
                });
              } catch (e) {
                // Ignore invalid selectors
              }
            });
          }
          
          const item = {};
          
          for (const [field, selector] of Object.entries(config)) {
            if (field === 'container' || field === 'unwantedSelectors') continue;
            
            const selectors = selector.split(',').map(s => s.trim());
            let foundElement = null;
            
            for (const sel of selectors) {
              foundElement = container.querySelector(sel);
              if (foundElement) break;
            }
            
            if (foundElement) {
              // For links, prefer href
              if (field === 'link' && foundElement.tagName === 'A') {
                item[field] = foundElement.href || foundElement.getAttribute('href') || '';
              } else if (field === 'image' && foundElement.tagName === 'IMG') {
                item[field] = foundElement.src || 
                             foundElement.getAttribute('src') || 
                             foundElement.getAttribute('data-src') || 
                             '';
              } else {
                item[field] = foundElement.textContent?.trim() || 
                             foundElement.getAttribute('content') || 
                             foundElement.getAttribute('href') || 
                             foundElement.getAttribute('data-price') ||
                             '';
              }
            } else {
              item[field] = null;
            }
          }

          if (item.title || Object.values(item).some(v => v && v !== '')) {
            results.push(item);
          }
        });

        return results;
      }, {
        ...selectorConfig,
        unwantedSelectors: unwantedSelectors
      });

      return items;
    } catch (error) {
      console.error(`Error extracting multiple items: ${error.message}`);
      return [];
    }
  }

  async extractSingleValue(page, selector) {
    try {
      const selectors = this.getSelectors();
      const unwantedSelectors = selectors.unwanted_selectors || [];
      
      const value = await page.evaluate((config) => {
        const element = document.querySelector(config.selector);
        if (!element) return null;
        
        // Remove unwanted elements from element
        if (config.unwantedSelectors && config.unwantedSelectors.length > 0) {
          config.unwantedSelectors.forEach(unwantedSelector => {
            try {
              const cleanSelector = unwantedSelector.replace(/ i\]$/, ']');
              element.querySelectorAll(cleanSelector).forEach(unwantedEl => {
                unwantedEl.remove();
              });
            } catch (e) {
              // Ignore invalid selectors
            }
          });
        }
        
        return element.textContent?.trim() || 
               element.getAttribute('content') || 
               element.getAttribute('href') || 
               '';
      }, {
        selector: selector,
        unwantedSelectors: unwantedSelectors
      });

      return value;
    } catch (error) {
      console.error(`Error extracting single value: ${error.message}`);
      return null;
    }
  }

  // ============================================
  // SPECIAL EXTRACTORS (Shared utilities)
  // ============================================
  
  async extractLogosFromConfig(page, logoConfig) {
    try {
      const logos = await page.evaluate((config) => {
        const containerSelectors = config.container.split(',').map(s => s.trim());
        const foundLogos = new Set();
        const logos = [];

        for (const selector of containerSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const img of elements) {
            const src = img.src || img.getAttribute('src') || img.getAttribute('data-src');
            if (src && !foundLogos.has(src)) {
              foundLogos.add(src);
              logos.push({
                src: src,
                alt: config.alt ? (img.alt || '') : undefined,
                width: img.naturalWidth || img.width || null,
                height: img.naturalHeight || img.height || null
              });
              
              if (logos.length >= 5) break;
            }
            if (logos.length >= 5) break;
          }
          if (logos.length >= 5) break;
        }

        return logos;
      }, logoConfig);

      return logos;
    } catch (error) {
      console.error(`Error extracting logos: ${error.message}`);
      return [];
    }
  }

  async extractColors(page, colorsConfig = {}) {
    try {
      const elementSelectors = colorsConfig.elements || 
        'body, header, footer, nav, main, h1, h2, h3, a, button';
      const maxColors = colorsConfig.maxColors || 10;
      const colorProperties = colorsConfig.properties || 
        ['background-color', 'color', 'border-color'];

      const colors = await page.evaluate((config) => {
        const colorMap = new Map();

        const getColorValue = (element, property) => {
          const style = window.getComputedStyle(element);
          return style.getPropertyValue(property);
        };

        const colorToHex = (color) => {
          if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
            return null;
          }
          
          if (color.startsWith('#')) {
            return color.toLowerCase();
          }
          
          const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
            const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
            const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
          }
          
          return color;
        };

        const selectors = config.elementSelectors.split(',').map(s => s.trim());
        const elementsToCheck = [];
        
        for (const selector of selectors) {
          const found = document.querySelectorAll(selector);
          elementsToCheck.push(...Array.from(found));
        }

        for (const element of elementsToCheck) {
          for (const property of config.colorProperties) {
            const colorValue = getColorValue(element, property);
            if (colorValue) {
              const hex = colorToHex(colorValue);
              if (hex && !colorMap.has(hex)) {
                colorMap.set(hex, hex);
              }
            }
          }

          if (colorMap.size >= config.maxColors) break;
        }

        return Array.from(colorMap.values()).slice(0, config.maxColors);
      }, {
        elementSelectors: elementSelectors,
        maxColors: maxColors,
        colorProperties: colorProperties
      });

      return colors;
    } catch (error) {
      console.error(`Error extracting colors: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract content text from wanted selectors
   * Käytetään jos configissa on wanted_selectors määritelty
   */
  async extractContentText(page) {
    try {
      const selectors = this.getSelectors();
      const wantedSelectors = selectors.wanted_selectors || 
        ['main', 'article', '.content', '.main-content', '[role="main"]'];
      const unwantedSelectors = selectors.unwanted_selectors || [];
      
      const content = await page.evaluate((config) => {
        const textParts = [];
        const minLength = config.minTextLength || 20;
        
        config.wantedSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              // Poista unwanted elementit tästä elementistä
              config.unwantedSelectors.forEach(unwantedSelector => {
                try {
                  const cleanSelector = unwantedSelector.replace(/ i\]$/, ']');
                  el.querySelectorAll(cleanSelector).forEach(unwantedEl => {
                    unwantedEl.remove();
                  });
                } catch (e) {
                  // Ignore invalid selectors
                }
              });
              
              const text = el.textContent?.trim() || '';
              if (text && text.length > minLength) {
                textParts.push(text);
              }
            });
          } catch (e) {
            // Ignore invalid selectors
          }
        });
        
        let fullText = textParts.join(' ');
        fullText = fullText.replace(/\s+/g, ' ').trim();
        
        const maxLength = config.maxTextLength || 5000;
        return fullText.substring(0, maxLength);
      }, {
        wantedSelectors: wantedSelectors,
        unwantedSelectors: unwantedSelectors,
        maxTextLength: selectors.max_text_length || 5000,
        minTextLength: selectors.min_text_length || 20
      });

      return content;
    } catch (error) {
      console.error(`Error extracting content text: ${error.message}`);
      return '';
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================
  
  async shouldUseSitemap() {
    const sitemapConfig = this.getSitemapConfig();
    return sitemapConfig.enabled === true;
  }

  cleanText(text) {
    if (!text) return '';
    
    const withoutHtml = text.replace(/<[^>]*>/g, '');
    const cleaned = withoutHtml
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    return cleaned.length > 5000 ? cleaned.substring(0, 5000) + '...' : cleaned;
  }
}

export default BaseMode;
