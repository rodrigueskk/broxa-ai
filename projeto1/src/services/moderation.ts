export const PROHIBITED_KEYWORDS = [
  // Child Abuse
  'abuso infantil', 'pedofilia', 'pornografia infantil', 'child abuse', 'cp',
  // Hacking
  'hacking', 'hacker', 'pentest', 'exploit', 'sql injection', 'xss', 'brute force', 'invasão de sistemas',
  // Programming (As requested by user)
  'programação', 'coding', 'software development', 'javascript', 'python', 'java', 'c++', 'c#', 'typescript', 'react', 'node.js', 'html', 'css', 'desenvolvimento web', 'algoritmo',
  // Fraud/Estelionato
  'estelionato', 'golpe', 'fraude', 'pix fake', 'cartão clonado', 'bin', 'gerador de cpf', 'esquema de dinheiro',
  // Cyber Crimes
  'crime cibernético', 'cybercrime', 'ddos', 'phishing', 'malware', 'ransomware', 'spyware', 'trojan', 'vírus de computador'
];

export const checkContent = (text: string): boolean => {
  if (!text) return true;
  const lowerText = text.toLowerCase();
  return !PROHIBITED_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
};

export const getViolationMessage = (): string => {
  return "⚠️ **CONTEÚDO NÃO TOLERADO**\n\nEste tipo de conteúdo viola as diretrizes de segurança da BROXA AI. O uso contínuo de temas proibidos resultará no **BANIMENTO PERMANENTE** da sua conta. Por favor, utilize a IA para fins permitidos.";
};
