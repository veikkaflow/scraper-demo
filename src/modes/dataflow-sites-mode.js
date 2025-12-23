import BaseMode from './base-mode.js';

/**
 * DataflowSitesMode - Mode Dataflow-sites sivustoille
 * Käyttää BaseMode:n oletustoiminnallisuutta (värit, logot)
 * Ei tarvitse ylikirjoittaa mitään - BaseMode hoitaa kaiken automaattisesti
 */
class DataflowSitesMode extends BaseMode {
  constructor() {
    super('dataflow-sites');
  }
  
  // BaseMode hoitaa automaattisesti:
  // - beforeExtract: värit, logot (jos configissa määritelty)
  // - extractGenericData: title, services, products, references jne.
}

export default DataflowSitesMode;
