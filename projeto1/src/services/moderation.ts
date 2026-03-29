/**
 * Lista expandida de palavras e temas proibidos.
 */
export const PROHIBITED_KEYWORDS = [
  // Child Abuse (Extremely Strict)
  'abuso infantil', 'pedofilia', 'pornografia infantil', 'child abuse', 'cp', 'abuso de menor', 'exploração infantil', 'molestar', 'estupro de menor',
  
  // Sexual / Pornographic (Carnal Acts)
  'sexo', 'pornografia', 'porno', 'xxx', 'hentai', 'orgia', 'beijo na boca', 'transar', 'fuder', 'comer alguém', 'pênis', 'vagina', 'buceta', 'pau', 'rola', 'caralho', 'tetas', 'peitos', 'masturbação', 'punheta', 'siririca', 'oral', 'anal', 'boquete', 'quicar', 'gozar', 'gozo', 'esperma', 'ereção', 'tesão', 'safadeza', 'putaria', 'prostituta', 'puta', 'vagabunda', 'ato carnal', 'videos porno', 'xvideos', 'redtube', 'p0rn', 'v1deo',
  
  // Violence and Abuse
  'estupro', 'violência sexual', 'assédio', 'abuso', 'agressão', 'bater em mulher', 'tortura', 'morte', 'matar', 'assassinato', 'execução', 'decapitação', 'sangue', 'gore', 'snuff',
  
  // Terrorism and Extreme Violence
  'terrorismo', 'atentado', 'bomba', 'explosivo', 'al qaeda', 'estado islâmico', 'isis', 'massacre', 'tiroteio em escola', 'fuzilamento', 'genocídio',
  
  // Weapons and Dangerous Items
  'venda de armas', 'comprar fuzil', 'fabricar bomba', 'molotov', 'arma de fogo', 'munição', 'tráfico de armas',
  
  // Hate Speech (Racism, Homophobia, Sexism)
  'racismo', 'preconceito', 'macaco', 'preto de merda', 'negro safado', 'escravidão', 'homofobia', 'viado', 'bicha', 'traveco', 'lgbt de merda', 'machismo', 'feminismo radical', 'misoginia', 'misandria', 'transfobia', 'nazismo', 'hitler', 'suástica', 'intolerância religiosa', 'macumba de merda', 'evangélico safado', 'católico burro',
  
  // Drugs and Self-Harm
  'cocaína', 'heroína', 'crack', 'metanfetamina', 'suicídio', 'me matar', 'cortar pulso', 'automutilação', 'se matar', 'lança perfume', 'loló', 'venda de droga',
  
  // Hacking, Fraud and Cybercrimes
  'hacking', 'hacker', 'pentest', 'exploit', 'sql injection', 'xss', 'brute force', 'invasão de sistemas', 'trojan', 'ransomware', 'spyware', 'phishing',
  'estelionato', 'golpe', 'fraude', 'pix fake', 'cartão clonado', 'bin', 'gerador de cpf', 'esquema de dinheiro', 'lavagem de dinheiro', 'venda de conta',
  'cpf', 'rg', 'cnpj', 'número de cartão', 'cvv', 'data de validade de cartão', 'senha de banco', 'vazamento de dados',
  
  // Animal Abuse and Illegal Trading
  'maus tratos a animais', 'rinha de galo', 'rinha de cachorro', 'crueldade animal',
  'tráfico humano', 'tráfico de pessoas', 'venda de órgãos', 'comprar rim', 'exploração sexual', 'trabalho escravo',
  
  // Programming and Technical (User Request)
  'programação', 'coding', 'software development', 'javascript', 'python', 'java', 'c++', 'c#', 'typescript', 'react', 'node.js', 'html', 'css', 'desenvolvimento web', 'algoritmo', 'source code', 'github'
];

/**
 * Normaliza o texto para detectar tentativas de bypass (leetspeak).
 * Exemplo: "p0rn0" -> "porno", "r4c1sm0" -> "racismo"
 */
const normalizeText = (text: string): string => {
  return text.toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i')
    .replace(/\|/g, 'l')
    .replace(/\s+/g, ''); // Remove espaços para detectar "p o r n o"
};

/**
 * Verifica se o conteúdo contém termos proibidos, incluindo sistema anti-bypass.
 */
export const checkContent = (text: string): boolean => {
  if (!text) return true;
  
  const normalizedText = normalizeText(text);
  const lowerText = text.toLowerCase().replace(/\s+/g, '');

  return !PROHIBITED_KEYWORDS.some(keyword => {
    const normalizedKeyword = normalizeText(keyword);
    // Verifica tanto o texto original (sem espaços) quanto o normalizado
    return normalizedText.includes(normalizedKeyword) || lowerText.includes(normalizedKeyword);
  });
};

export const getViolationMessage = (): string => {
  return "⚠️ **CONTEÚDO NÃO TOLERADO**\n\nEste tipo de conteúdo viola as diretrizes de segurança da BROXA AI. O uso contínuo de temas proibidos resultará no **BANIMENTO PERMANENTE** da sua conta. Por favor, utilize a IA para fins permitidos.";
};

