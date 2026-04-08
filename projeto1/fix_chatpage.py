import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = 'E:/projeto1/src/pages/ChatPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# FIX 1
old1 = '    if (isUserLoaded && auth.currentUser && hasSetProfile === false && !isProfileSetupOpen && !hasShownProfileSetupRef.current) {'
new1 = '    const hasNickname = !!displayName || !!auth.currentUser?.displayName;\n    if (isUserLoaded && auth.currentUser && !hasNickname && hasSetProfile === false && !isProfileSetupOpen && !hasShownProfileSetupRef.current) {'
if old1 in content:
    content = content.replace(old1, new1, 1)
    print('✓ Fix 1: Profile setup condition')
else:
    print('✗ Fix 1: Pattern not found')

# FIX 2
old2 = 'const [unlockedFeature, setUnlockedFeature] = useState<{ name: string, days: number } | null>(null);'
new2 = old2 + '\n  const [showGuestWarning, setShowGuestWarning] = useState(false);'
if old2 in content:
    content = content.replace(old2, new2, 1)
    print('✓ Fix 2: Added showGuestWarning state')
else:
    print('✗ Fix 2: Pattern not found')

# FIX 3
old3 = '    if (!auth.currentUser) {\n      setIsAuthModalOpen(true);\n      return;\n    }'
new3 = '    if (!auth.currentUser) {\n      setShowGuestWarning(true);\n      return;\n    }'
if old3 in content:
    content = content.replace(old3, new3)
    print('✓ Fix 3: handleSend auth check')
else:
    print('✗ Fix 3: Pattern not found')

# FIX 4
marker = '            <div className="max-w-3xl mx-auto relative pointer-events-auto">'
popup = '''            {/* Guest warning popup */}
            {showGuestWarning && (
              <div className="absolute -top-16 left-4 right-4 z-30 animate-slide-down">
                <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl p-3 shadow-xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-base)]">Faça login para enviar mensagens</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">�ltimos segundos.</p>
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

'''
if marker in content:
    content = content.replace(marker, popup + marker)
    print('✓ Fix 4: Guest warning popup inserted')
else:
    print('✗ Fix 4: Marker not found')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
