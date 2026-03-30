/**
 * Lista ultra-robusta de palavras e temas proibidos (Baseada na lista do usuário).
 */
export const PROHIBITED_KEYWORDS = [
  'conteúdo explicito',
  'nudez',
  'pornografia',
  'infantil',
  'racismo',
  'nazismo',
  'coisas relacionadas a demônios',
  'atos ultraterroristas',
  'apologia ao crime',
  'drogas'
];

/**
 * Pipeline de normalização avançada para detectar bypass.
 * 1. Lowercase
 * 2. Normalização de Unicode (NFD) e remoção de acentos
 * 3. Mapeamento Leetspeak Expandido
 * 4. Remoção de todos os símbolos, pontuação e espaços
 * 5. Redução de letras repetidas (aa -> a)
 */
const normalizeEnhanced = (text: string): string => {
  if (!text) return "";

  // 1 & 2. Lowercase e remoção de acentos/diacríticos
  let normalized = text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 3. Mapeamento Leetspeak Completo
  const leetMap: Record<string, string> = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
    '@': 'a', '$': 's', '!': 'i', '|': 'l', 'v v': 'w', 'vv': 'w', 'v': 'u'
  };

  for (const [key, value] of Object.entries(leetMap)) {
    normalized = normalized.split(key).join(value);
  }

  // 4. Limpeza Total: Mantém apenas letras, números e espaços convertendo pontuação em espaço
  normalized = normalized.replace(/[^a-z0-9\s]/g, " ");

  // 5. Deduplicação de letras repetidas (ex: "pooorno" -> "porno") 
  // Exceto espaços
  normalized = normalized.replace(/([a-z])\1+/g, "$1");
  
  // Limpa espaços extras
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
};

/**
 * Verifica se o conteúdo contém termos proibidos usando normalização ultra-robusta.
 * Usa verificação de limite de palavra para evitar falsos positivos em palavras comuns.
 */
export const checkContent = (text: string): boolean => {
  if (!text) return true;
  
  const normalizedInput = normalizeEnhanced(text);
  
  // Se o texto normalizado for vazio após limpeza, é seguro
  if (!normalizedInput) return true;

  // Usa boundary para evitar falsos positivos
  return !PROHIBITED_KEYWORDS.some(keyword => {
    const normalizedKeyword = normalizeEnhanced(keyword);
    if (!normalizedKeyword) return false;
    
    // Procura a keyword como uma palavra inteira dentro do input normalizado
    const regex = new RegExp(`\\b${normalizedKeyword}\\b`, 'i');
    return regex.test(normalizedInput);
  });
};

export const getViolationMessage = (): string => {
  return "⚠️ **CONTEÚDO NÃO TOLERADO**\n\nEste tipo de conteúdo viola as diretrizes de segurança da BROXA AI. O uso contínuo de temas proibidos resultará no **BANIMENTO PERMANENTE** da sua conta. Por favor, utilize a IA para fins permitidos.";
};


