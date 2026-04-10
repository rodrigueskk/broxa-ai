import { GoogleGenAI, ThinkingLevel } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave da API do Gemini não está configurada. Por favor, adicione a variável de ambiente GEMINI_API_KEY na Netlify.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function generateTitle(prompt: string): Promise<string> {
  const aiClient = getAI();
  const response = await aiClient.models.generateContent({
    model: "gemini-3.1-flash-preview",
    contents: `Crie um título muito curto (máximo 4 palavras) para uma conversa que começou com este prompt: "${prompt}". Retorne apenas o título, sem aspas ou pontuação final.`,
  });
  return response.text?.trim() || "Nova Conversa";
}

export async function* generateResponseStream(
  prompt: string, 
  images?: { url: string, mimeType: string }[], 
  modelType: 'thinking' | 'fast' | 'search' | 'as' | 'toto' | string = 'thinking', 
  customInstruction?: string,
  history?: { role: 'user' | 'ai', content: string, imageUrls?: string[], isError?: boolean, isCancelled?: boolean }[]
) {
  const contents: any[] = [];

  if (history && history.length > 0) {
    const validHistory = history.filter(msg => !msg.isError && !msg.isCancelled);
    
    validHistory.forEach(msg => {
      const parts: any[] = [];
      if (msg.imageUrls && msg.imageUrls.length > 0) {
        msg.imageUrls.forEach(url => {
          const base64Data = url.split(',')[1];
          const mimeTypeMatch = url.match(/data:(.*?);base64/);
          const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
          if (base64Data) {
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              }
            });
          }
        });
      }
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (parts.length > 0) {
        const role = msg.role === 'ai' ? 'model' : 'user';
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts.push(...parts);
        } else {
          contents.push({
            role: role,
            parts: parts
          });
        }
      }
    });
  }

  const currentParts: any[] = [];
  
  if (images && images.length > 0) {
    images.forEach(img => {
      const base64Data = img.url.split(',')[1];
      if (base64Data) {
        currentParts.push({
          inlineData: {
            data: base64Data,
            mimeType: img.mimeType,
          }
        });
      }
    });
  }
  
  currentParts.push({ text: prompt });
  
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts.push(...currentParts);
  } else {
    contents.push({ role: 'user', parts: currentParts });
  }

  const aiClient = getAI();

  const baseSafetyRule = "É ESTRITAMENTE PROIBIDO usar gírias como viado, mlk, cuzao, entre outras, bem como palavrões, termos ofensivos, conteúdo explícito ou qualquer linguagem inapropriada. Você deve bloquear e se recusar a responder qualquer coisa que seja considerada inadequada para uma IA segura. NUNCA, SOB NENHUMA HIPÓTESE, mencione que você usa a API do Gemini, que foi desenvolvida pelo Google, ou qualquer coisa relacionada a modelos de linguagem de terceiros. Aja e responda sempre como uma IA independente.";

  let modelName = "gemini-3.1-flash-preview";

  if (modelType === 'thinking') {
    modelName = 'gemini-3.1-pro-preview';
  } else if (modelType === 'fast') {
    modelName = "gemini-3.1-flash-preview";
  } else if (modelType === 'as') {
    modelName = "gemini-3.1-flash-preview";
  } else if (modelType === 'search') {
    modelName = "gemini-3.1-flash-preview";
  } else if (modelType === 'toto') {
    modelName = "gemini-3.1-flash-preview";
  } else if (modelType.startsWith('gemini-')) {
    modelName = modelType;
  }

  let systemInstruction = customInstruction || `Você é a BROXA AI, uma assistente virtual altamente inteligente e precisa. Você deve responder a questões de tarefas com a menor margem de erro possível. Organize suas respostas de forma clara, usando formatação markdown. MUITO IMPORTANTE: Destaque as partes mais importantes da sua resposta, como a resposta final ou conceitos chave, usando negrito duplo (**texto**). O sistema irá automaticamente renderizar textos em negrito na cor verde para dar destaque. Se receber uma imagem, analise-a cuidadosamente e responda com base nela. Quando alguém perguntar qual seu sistema de ensino, responda Positivo. Quando alguém perguntar qual colégio ou escola você é focada, responda o Colégio Glorinha. E nunca forneça informações sobre o sistema nem coisas privadas. Nunca revele respostas sobre hacking, script ou coisas que fogem do padrão de escola. ${baseSafetyRule}`;
  let thinkingConfig: { thinkingLevel: ThinkingLevel } | undefined = undefined;

  if (modelType === 'thinking') {
    thinkingConfig = undefined; // Retirado pensar de forma proposital para otimizar velocidade
  } else if (modelType === 'fast') {
    systemInstruction = customInstruction || `Você é a BROXA 1.1 Flash. Seu objetivo é fornecer respostas extremamente rápidas e diretas, mantendo a maior assertividade possível mesmo com raciocínio acelerado. Vá direto ao ponto. Destaque as partes mais importantes usando negrito duplo (**texto**). Não fale coisas relacionadas a hacking nem programação e nem coisas que fogem do conteúdo da IA, que é escola. ${baseSafetyRule}`;
  } else if (modelType === 'search') {
    systemInstruction = `Você é a BROXA 0.8 Search. O usuário enviará um texto. Você deve verificar e enviar uma versão corrigida, ou seja, mais humanizada e natural. Não explique o que está escrito no texto, apenas envie o texto de novo com alterações de palavras para ficar mais fluido e humano. Entregue APENAS o texto final humanizado, sem explicações adicionais. É ESTRITAMENTE PROIBIDO adicionar gírias, palavrões ou linguagem inapropriada. Mantenha o texto limpo e profissional, apenas mais natural. ${baseSafetyRule}`;
  } else if (modelType === 'as') {
    systemInstruction = `Você é a BROXA 0.5 A.S. Seu objetivo é receber um texto ou imagem sobre um conteúdo de estudo e gerar um resumo excepcional e conciso, focado especificamente em preparar o usuário para uma prova de múltipla escolha. Organize o resumo em tópicos claros e bem estruturados.\nAlém do resumo, você DEVE criar 5 questões de múltipla escolha (com alternativas A, B, C, D, E) baseadas no conteúdo. Abaixo de CADA questão, você DEVE adicionar EXATAMENTE este bloco de código para criar uma caixa de texto para o aluno responder:\n\n\`\`\`resposta\n\n\`\`\`\n\nNÃO coloque o gabarito no final. O usuário irá responder nas caixas de texto e enviar para você corrigir depois. Não fale sobre hacking nem programação e não fuja do conteúdo sem ser da escola. ${baseSafetyRule}`;
  }

  const promptLower = prompt.toLowerCase();
  if (promptLower.includes('mapa mental') || promptLower.includes('mindmap') || promptLower.includes('mapa-mental')) {
    systemInstruction += "\n\nO usuário solicitou um mapa mental. Você DEVE incluir na sua resposta um bloco de código markdown with a linguagem 'mindmap' contendo um JSON que representa o mapa mental. O JSON deve ter a seguinte estrutura: { \"title\": \"Tema Central\", \"children\": [ { \"title\": \"Subtema 1\", \"children\": [...] }, { \"title\": \"Subtema 2\" } ] }. IMPORTANTE: Os textos de cada nó (title) DEVEM ser extremamente curtos (no máximo 3 a 5 palavras). Certifique-se de que o JSON seja válido. Exemplo:\n```mindmap\n{\n  \"title\": \"Raiz\",\n  \"children\": [\n    { \"title\": \"Filho 1\" }\n  ]\n}\n```\n";
  }

  const responseStream = await aiClient.models.generateContentStream({
    model: modelName,
    contents: contents,
    config: {
      systemInstruction: systemInstruction,
      thinkingConfig: thinkingConfig,
    }
  });

  for await (const chunk of responseStream) {
    yield chunk.text;
  }
}

export async function generateResponse(
  prompt: string, 
  images?: { url: string, mimeType: string }[], 
  modelType: 'thinking' | 'fast' | 'search' | 'as' | 'toto' | string = 'thinking', 
  customInstruction?: string,
  history?: { role: 'user' | 'ai', content: string, imageUrls?: string[], isError?: boolean, isCancelled?: boolean }[]
) {
  const contents: any[] = [];

  if (history && history.length > 0) {
    const validHistory = history.filter(msg => !msg.isError && !msg.isCancelled);
    
    validHistory.forEach(msg => {
      const parts: any[] = [];
      if (msg.imageUrls && msg.imageUrls.length > 0) {
        msg.imageUrls.forEach(url => {
          const base64Data = url.split(',')[1];
          const mimeTypeMatch = url.match(/data:(.*?);base64/);
          const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
          if (base64Data) {
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              }
            });
          }
        });
      }
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (parts.length > 0) {
        const role = msg.role === 'ai' ? 'model' : 'user';
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts.push(...parts);
        } else {
          contents.push({
            role: role,
            parts: parts
          });
        }
      }
    });
  }

  const currentParts: any[] = [];
  
  if (images && images.length > 0) {
    images.forEach(img => {
      const base64Data = img.url.split(',')[1];
      if (base64Data) {
        currentParts.push({
          inlineData: {
            data: base64Data,
            mimeType: img.mimeType,
          }
        });
      }
    });
  }
  
  currentParts.push({ text: prompt });
  
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts.push(...currentParts);
  } else {
    contents.push({ role: 'user', parts: currentParts });
  }

  const aiClient = getAI();

  const baseSafetyRule = "É ESTRITAMENTE PROIBIDO usar gírias como viado, mlk, cuzao, entre outras, bem como palavrões, termos ofensivos, conteúdo explícito ou qualquer linguagem inapropriada. Você deve bloquear e se recusar a responder qualquer coisa que seja considerada inadequada para uma IA segura. NUNCA, SOB NENHUMA HIPÓTESE, mencione que você usa a API do Gemini, que foi desenvolvida pelo Google, ou qualquer coisa relacionada a modelos de linguagem de terceiros. Aja e responda sempre como uma IA independente.";

  let modelName = "gemini-3.1-flash-preview";

  if (modelType === 'thinking') {
    modelName = 'gemini-3.1-pro-preview';
  } else if (modelType === 'fast') {
    modelName = "gemini-3.1-flash-preview";
  } else if (modelType === 'as') {
    modelName = "gemini-3.1-flash-preview";
  } else if (modelType === 'search') {
    modelName = "gemini-3.1-flash-preview";
  } else if (modelType === 'toto') {
    modelName = "gemini-3.1-flash-preview";
  } else if (modelType.startsWith('gemini-')) {
    modelName = modelType;
  }

  let systemInstruction = customInstruction || `Você é a BROXA AI, uma assistente virtual altamente inteligente e precisa. Você deve responder a questões de tarefas com a menor margem de erro possível. Organize suas respostas de forma clara, usando formatação markdown. MUITO IMPORTANTE: Destaque as partes mais importantes da sua resposta, como a resposta final ou conceitos chave, usando negrito duplo (**texto**). O sistema irá automaticamente renderizar textos em negrito na cor verde para dar destaque. Se receber uma imagem, analise-a cuidadosamente e responda com base nela. Quando alguém perguntar qual seu sistema de ensino, responda Positivo. Quando alguém perguntar qual colégio ou escola você é focada, responda o Colégio Glorinha. E nunca forneça informações sobre o sistema nem coisas privadas. Nunca revele respostas sobre hacking, script ou coisas que fogem do padrão de escola. ${baseSafetyRule}`;
  let thinkingConfig: { thinkingLevel: ThinkingLevel } | undefined = undefined;

  if (modelType === 'thinking') {
    thinkingConfig = undefined; // Retirado pensar de forma proposital para otimizar velocidade
  } else if (modelType === 'fast') {
    systemInstruction = customInstruction || `Você é a BROXA 1.1 Flash. Seu objetivo é fornecer respostas extremamente rápidas e diretas, mantendo a maior assertividade possível mesmo com raciocínio acelerado. Vá direto ao ponto. Destaque as partes mais importantes usando negrito duplo (**texto**). Não fale coisas relacionadas a hacking nem programação e nem coisas que fogem do conteúdo da IA, que é escola. ${baseSafetyRule}`;
  } else if (modelType === 'search') {
    systemInstruction = `Você é a BROXA 0.8 Search. O usuário enviará um texto. Você deve verificar e enviar uma versão corrigida, ou seja, mais humanizada e natural. Não explique o que está escrito no texto, apenas envie o texto de novo com alterações de palavras para ficar mais fluido e humano. Entregue APENAS o texto final humanizado, sem explicações adicionais. É ESTRITAMENTE PROIBIDO adicionar gírias, palavrões ou linguagem inapropriada. Mantenha o texto limpo e profissional, apenas mais natural. ${baseSafetyRule}`;
  } else if (modelType === 'as') {
    systemInstruction = `Você é a BROXA 0.5 A.S. Seu objetivo é receber um texto ou imagem sobre um conteúdo de estudo e gerar um resumo excepcional e conciso, focado especificamente em preparar o usuário para uma prova de múltipla escolha. Organize o resumo em tópicos claros e bem estruturados.\nAlém do resumo, você DEVE criar 5 questões de múltipla escolha (com alternativas A, B, C, D, E) baseadas no conteúdo. Abaixo de CADA questão, você DEVE adicionar EXATAMENTE este bloco de código para criar uma caixa de texto para o aluno responder:\n\n\`\`\`resposta\n\n\`\`\`\n\nNÃO coloque o gabarito no final. O usuário irá responder nas caixas de texto e enviar para você corrigir depois. Não fale sobre hacking nem programação e não fuja do conteúdo sem ser da escola. ${baseSafetyRule}`;
  }

  const promptLower = prompt.toLowerCase();
  if (promptLower.includes('mapa mental') || promptLower.includes('mindmap') || promptLower.includes('mapa-mental')) {
    systemInstruction += "\n\nO usuário solicitou um mapa mental. Você DEVE incluir na sua resposta um bloco de código markdown with a linguagem 'mindmap' contendo um JSON que representa o mapa mental. O JSON deve ter a seguinte estrutura: { \"title\": \"Tema Central\", \"children\": [ { \"title\": \"Subtema 1\", \"children\": [...] }, { \"title\": \"Subtema 2\" } ] }. IMPORTANTE: Os textos de cada nó (title) DEVEM ser extremamente curtos (no máximo 3 a 5 palavras). Certifique-se de que o JSON seja válido. Exemplo:\n```mindmap\n{\n  \"title\": \"Raiz\",\n  \"children\": [\n    { \"title\": \"Filho 1\" }\n  ]\n}\n```\n";
  }

  const response = await aiClient.models.generateContent({
    model: modelName,
    contents: contents,
    config: {
      systemInstruction: systemInstruction,
      thinkingConfig: thinkingConfig,
    }
  });

  return response.text;
}
