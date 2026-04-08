const fs = require('fs');
const path = 'E:/projeto1/src/pages/ChatPage.tsx';
let content = fs.readFileSync(path, 'utf8');

console.log('Start fix...');

// Fix 1: Profile setup nickname check
const oldLine = '    if (isUserLoaded && auth.currentUser && hasSetProfile === false && !isProfileSetupOpen && !hasShownProfileSetupRef.current) {';
if (content.includes(oldLine)) {
  const newLine = '    // Only show profile setup for users without a nickname (new users)\n    const hasNickname = !!displayName || !!auth.currentUser?.displayName;\n    if (isUserLoaded && auth.currentUser && !hasNickname && hasSetProfile === false && !isProfileSetupOpen && !hasShownProfileSetupRef.current) {';
  content = content.replace(oldLine, newLine);
  console.log('✓ Fix 1: profile setup');
} else {
  console.log('✗ Fix 1: Pattern not found');
}

// Fix 2: Add state
const statePattern = 'const [unlockedFeature, setUnlockedFeature] = useState<{ name: string, days: number } | null>(null);';
if (content.includes(statePattern)) {
  content = content.replace(statePattern, statePattern + '\n  const [showGuestWarning, setShowGuestWarning] = useState(false);');
  console.log('✓ Fix 2: showGuestWarning state added');
} else {
  console.log('✗ Fix 2: State not found');
}

// Fix 3: handleSend check
const oldCheck = `    if (!auth.currentUser) {
      setIsAuthModalOpen(true);
      return;
    }`;
content = content.replace(oldCheck, `    if (!auth.currentUser) {
      setShowGuestWarning(true);
      return;
    }`);
console.log('✓ Fix 3: handleSend auth check');

// Fix 4: Guest popup
const marker = '            <div className="max-w-3xl mx-auto relative pointer-events-auto">';
const popup = `            {/* Guest warning popup */}
            {showGuestWarning && (
              <div className="absolute -top-16 left-4 right-4 z-30 animate-slide-down">
                <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl p-3 shadow-xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-base)]">Faça login para enviar mensagens</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">É grátis e leva apenas alguns segundos.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowGuestWarning(false); setIsAuthModalOpen(true); }}
                      className="px-4 py-2 bg-[var(--color-sec)] text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Fazer login
                    </button>
                    <button
                      onClick={() => setShowGuestWarning(false)}
                      className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  </div>
                </div>
              </div>
            )}

`;
if (content.includes(marker)) {
  content = content.replace(marker, popup + marker);
  console.log('✓ Fix 4: Guest popup inserted');
} else {
  console.log('✗ Fix 4: Marker not found');
}

fs.writeFileSync(path, content, 'utf8');
console.log('All done!');
