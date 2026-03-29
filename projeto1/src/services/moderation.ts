export const PROHIBITED_KEYWORDS = [
  // Child Abuse (Extremely Strict)
  'abuso infantil', 'pedofilia', 'pornografia infantil', 'child abuse', 'cp', 'abuso de menor', 'exploração infantil', 'molestar',
  // Sexual / Pornographic (Carnal Acts)
  'sexo', 'pornografia', 'porno', 'xxx', 'hentai', 'orgia', 'beijo na boca', 'transar', 'fuder', 'comer alguém', 'pênis', 'vagina', 'buceta', 'pau', 'rola', 'caralho', 'tetas', 'peitos', 'masturbação', 'punheta', 'siririca', 'oral', 'anal', 'boquete', 'quicar', 'gozar', 'gozo', 'esperma', 'ereção', 'tesão', 'safadeza', 'putaria', 'prostituta', 'puta', 'vagabunda', 'ato carnal', 
  // Violence and Abuse
  'estupro', 'violência sexual', 'assédio', 'abuso', 'agressão', 'bater em mulher', 'tortura', 'morte', 'matar', 'assassinato', 'execução',
  // Hate Speech (Racism, Homophobia, Sexism)
  'racismo', 'preconceito', 'macaco', 'preto de merda', 'negro safado', 'escravidão', 'homofobia', 'viado', 'bicha', 'traveco', 'lgbt de merda', 'machismo', 'feminismo radical', 'misoginia', 'misandria', 'transfobia', 'nazismo', 'hitler', 'suástica', 'intolerância religiosa',
  // Drugs and Self-Harm
  'cocaína', 'heroína', 'crack', 'metanfetamina', 'suicídio', 'me matar', 'cortar pulso', 'automutilação', 'se matar',
  // Existing: Hacking and Fraud
  'hacking', 'hacker', 'pentest', 'exploit', 'sql injection', 'xss', 'brute force', 'invasão de sistemas',
  'estelionato', 'golpe', 'fraude', 'pix fake', 'cartão clonado', 'bin', 'gerador de cpf', 'esquema de dinheiro',
  // Programming (User Request)
  'programação', 'coding', 'software development', 'javascript', 'python', 'java', 'c++', 'c#', 'typescript', 'react', 'node.js', 'html', 'css', 'desenvolvimento web'
];

export const checkContent = (text: string): boolean => {
  if (!text) return true;
  const lowerText = text.toLowerCase();
  return !PROHIBITED_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
};

export const getViolationMessage = (): string => {
  return "⚠️ **CONTEÚDO NÃO TOLERADO**\n\nEste tipo de conteúdo viola as diretrizes de segurança da BROXA AI. O uso contínuo de temas proibidos resultará no **BANIMENTO PERMANENTE** da sua conta. Por favor, utilize a IA para fins permitidos.";
};
