import BaseMode from './base-mode.js';
import DataCleaner from '../utils/data-cleaner.js';
class WordPressMode extends BaseMode {
  constructor() {
    super('wordpress');
  }

  /**
   * AFTER: Kokeile vaihtoehtoisia selectors jos tuotteita ei löytynyt
   * Normalisoi hinnat ja saatavuudet
   */
  async afterExtract(page, url, data) {
    // Jos tuotteita ei löytynyt, kokeile vaihtoehtoisia selectors
    if (!data.products || data.products.length === 0) {
      try {
        const selectors = this.getSelectors();
        if (selectors.products_alternative) {
          data.products = await this.extractMultipleItems(page, selectors.products_alternative);
        }
      } catch (error) {
        console.warn('Alternative product extraction failed:', error.message);
      }
    }


    // Normalisoi tuotteiden hinnat ja saatavuudet
    if (data.products && Array.isArray(data.products)) {
      data.products = data.products.map(product => {
        if (product.price) {
          product.price_numeric = DataCleaner.extractPrice(product.price);
        }
        if (product.availability) {
          product.availability_normalized = DataCleaner.normalizeAvailability(product.availability);
        }
        return product;
      });
    }

    
    return data;
  }
}

export default WordPressMode;
