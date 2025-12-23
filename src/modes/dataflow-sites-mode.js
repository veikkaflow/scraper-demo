import BaseMode from './base-mode.js';

class DataflowSitesMode extends BaseMode {
  constructor() {
    super('dataflow-sites');
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
}

export default DataflowSitesMode;
