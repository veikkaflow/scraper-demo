import BaseMode from './base-mode.js';

/**
 * ChatbotMode - Mode chatbot-käyttöön
 * Käyttää BaseMode:n oletustoiminnallisuutta (värit, logot, content)
 * Ei tarvitse ylikirjoittaa mitään - BaseMode hoitaa kaiken automaattisesti
 */
class ChatbotMode extends BaseMode {
  constructor() {
    super('chatbot');
  }
  
  // BaseMode hoitaa automaattisesti:
  // - beforeExtract: värit, logot, content (jos configissa määritelty)
  // - extractGenericData: title, description jne.
}

export default ChatbotMode;
