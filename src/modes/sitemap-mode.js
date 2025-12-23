import BaseMode from './base-mode.js';
import SitemapHandler from '../core/sitemap.js';

class SitemapMode extends BaseMode {
  constructor() {
    super('sitemap-mode'); //
  }

  async extractData(page, url) {
    const siteMapData = new SitemapHandler(url);

    const urls = await siteMapData.getUrls();


    if (!urls){
        return {
            success: false,
            error: 'No URLs found in sitemap',
            code: 'NO_URLS_FOUND'
        };
    }

    

    return {
        success: true,
        data: urls,
        code: 'URLS_FOUND'
    };
  }
}

export default SitemapMode;