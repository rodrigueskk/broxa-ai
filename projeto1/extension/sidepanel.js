// Broxa AI - Sidepanel Logic
document.addEventListener('DOMContentLoaded', () => {
  const captureBtn = document.getElementById('capture-btn');
  const resultArea = document.getElementById('result-area');
  const aiResponse = document.getElementById('ai-response');
  const clearBtn = document.getElementById('clear-btn');

  captureBtn.addEventListener('click', async () => {
    try {
      captureBtn.disabled = true;
      captureBtn.textContent = 'CAPTURANDO...';
      captureBtn.classList.add('loading');

      // Captura a aba ativa
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Pequeno delay para o usuário se preparar
      await new Promise(r => setTimeout(r, 500));

      const screenshotUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
      
      console.log('🐾 Totó: Tela capturada com sucesso!');
      
      // Simulação de processamento de IA (Aqui seria a chamada para o Gemini Vision)
      aiResponse.innerHTML = '<span class="loading">Totó está analisando a imagem...</span>';
      resultArea.classList.remove('hidden');

      setTimeout(() => {
        aiResponse.innerHTML = `
          <strong>Questão Detectada:</strong> Select the correct alternative for "She ___ to school every day."
          <br><br>
          <strong>Análise do Totó:</strong> O sujeito é "She" (terceira pessoa do singular) e a expressão "every day" indica o Present Simple.
          <br><br>
          ✅ <strong>Resposta Correta:</strong> (B) goes
        `;
        captureBtn.disabled = false;
        captureBtn.textContent = 'CAPTURAR TELA';
        captureBtn.classList.remove('loading');
      }, 2000);

    } catch (error) {
      console.error('Erro na captura:', error);
      aiResponse.textContent = 'Erro ao capturar a tela. Verifique as permissões da extensão.';
      captureBtn.disabled = false;
      captureBtn.textContent = 'TENTAR NOVAMENTE';
      captureBtn.classList.remove('loading');
    }
  });

  clearBtn.addEventListener('click', () => {
    resultArea.classList.add('hidden');
    aiResponse.textContent = '';
  });
});
