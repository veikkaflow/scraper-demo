import BaseMode from './base-mode.js';
import DataCleaner from '../utils/data-cleaner.js';

class DataflowVkMode extends BaseMode {
  constructor() {
    super('dataflow-vk');
  }

  /**
   * AFTER: Normalisoi tuotteiden hinnat ja saatavuudet
   * BaseMode hoitaa automaattisesti värit ja logot beforeExtract:ssa
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

        // Jos tuotteella ei ole saatavuutta
        if (!product.availability) {
          product.availability_normalized = 'check_availability';
        }
        return product;
      });
    }
    
    return data;
  }
}

export default DataflowVkMode;
