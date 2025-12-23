import BaseMode from './base-mode.js';

class CompanyMode extends BaseMode {
  constructor() {
    super('company'); //
  }

  async extractData(page, url) {
    return await super.extractData(page, url);
  }
}

export default CompanyMode;

