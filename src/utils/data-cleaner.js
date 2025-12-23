class DataCleaner {
  static clean(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.clean(item));
    }

    if (data && typeof data === 'object') {
      const cleaned = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
          cleaned[key] = this.clean(value);
        }
      }
      return cleaned;
    }

    // Clean string values
    if (typeof data === 'string') {
      return data.trim().replace(/\s+/g, ' ');
    }

    return data;
  }

  static extractPrice(text) {
    if (!text) return null;
    
    // Extract numeric price (handles various formats)
    const priceMatch = text.match(/[\d,]+\.?\d*/);
    if (priceMatch) {
      return parseFloat(priceMatch[0].replace(/,/g, ''));
    }
    
    return null;
  }

  static normalizeAvailability(text) {
    if (!text) return null;
    
    const lower = text.toLowerCase();
    if (lower.includes('in stock') || lower.includes('varastossa') || lower.includes('saatavilla')) {
      return 'in_stock';
    }
    if (lower.includes('out of stock') || lower.includes('loppu') || lower.includes('ei saatavilla')) {
      return 'out_of_stock';
    }
    if (lower.includes('pre-order') || lower.includes('ennakko')) {
      return 'pre_order';
    }
    
    return text.trim();
  }
}

export default DataCleaner;

