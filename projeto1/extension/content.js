// Broxa AI Extension - Content Script
// Este script injeta um marcador no DOM para que o site saiba que a extensão está instalada.

function injectMarker() {
  if (!document.getElementById('broxa-extension-installed')) {
    const marker = document.createElement('div');
    marker.id = 'broxa-extension-installed';
    marker.style.display = 'none';
    (document.head || document.documentElement).appendChild(marker);
    console.log('🐾 Totó: Extensão Broxa AI detectada e pronta.');
  }
}

// Injeta o marcador imediatamente
injectMarker();

// Também ouve mensagens do site se necessário no futuro
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'BROXA_PING') {
    window.postMessage({ type: 'BROXA_PONG' }, '*');
  }
});
