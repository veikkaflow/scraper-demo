import BaseMode from './base-mode.js';

class ChatbotMode extends BaseMode {
  constructor() {
    super('chatbot');
  }

  /**
   * BEFORE: Poimi värit, logot ja content ENNEN unwanted poistoa
   */
  async beforeExtract(page, url) {
    const selectors = this.getSelectors();
    const result = {};
    
    // Värit
    if (selectors.colors) {
      result.colors = await this.extractColors(page, selectors.colors);
    }
    
    // Logot
    if (selectors.logos?.container) {
      result.logos = await this.extractLogosFromConfig(page, selectors.logos);
    }
    
    // Content
    result.content = await this.extractContentText(page);
    
    return result;
  }

  /**
   * CUSTOM: Content extraction
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
}

export default ChatbotMode;
