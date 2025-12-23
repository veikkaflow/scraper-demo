import BaseMode from './base-mode.js';
import DataCleaner from '../utils/data-cleaner.js';

class DataflowVkMode extends BaseMode {
  constructor() {
    super('dataflow-vk');
  }

  /**
   * BEFORE: Poimi värit ja logot ENNEN unwanted poistoa
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
    
    return result;
  }



  /**
   * AFTER: Normalisoi tuotteiden hinnat ja saatavuudet
   */
  async afterExtract(page, url, data) {
    // Normalisoi tuotteiden hinnat ja saatavuudet
    if (data.products && Array.isArray(data.products)) {
      data.products = data.products.map(product => {
        if (product.price) {
          product.price_numeric = DataCleaner.extractPrice(product.price);
        }
        if (product.availability) {
          product.availability_normalized = DataCleaner.normalizeAvailability(product.availability);
        }

        //jos tuotteella ei ole saatavuutta
        if(!product.availability){
          product.availability_normalized = 'check_availability';
        }
        return product;
      });
    }
    
    return data;
  }
}

export default DataflowVkMode;
