
import fs from 'fs';

function checkTagBalance(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');

  // Remove strings and comments
  let noStr = content.replace(/'(?:\\.|[^'])*'/g, "''")
                     .replace(/"(?:\\.|[^"])*"/g, '""')
                     .replace(/`(?:\\.|[^`])*`/g, '""');
  const noComments = noStr.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

  const lines = noComments.split('\n');
  const stack = [];
  const tagRegex = /<(div|motion\.div|AnimatePresence)(?!\w)([^>]*?)(\/?)>|<\/(div|motion\.div|AnimatePresence)>/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
      const fullTag = match[0];
      const isClosing = fullTag.startsWith('</');
      const isSelfClosing = match[3] === '/';
      const tagName = isClosing ? match[4] : match[1];

      if (isSelfClosing) continue;

      if (!isClosing) {
        stack.push({ name: tagName, line: i + 1 });
      } else {
        if (stack.length === 0) {
          console.log(`Unexpected closing tag </${tagName}> at line ${i + 1}`);
        } else {
          const last = stack.pop();
          if (last.name !== tagName) {
            console.log(`Tag mismatch: Expected </${last.name}> (opened at line ${last.line}), but found </${tagName}> at line ${i + 1}`);
            // Push back the mismatch to see if we can recover
            stack.push(last);
          }
        }
      }
    }
  }

  while (stack.length > 0) {
    const remaining = stack.pop();
    console.log(`Unclosed tag <${remaining.name}> opened at line ${remaining.line}`);
  }
}

checkTagBalance('src/pages/ChatPage.tsx');
