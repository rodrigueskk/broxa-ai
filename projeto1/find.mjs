import fs from 'fs';

const lines = fs.readFileSync('src/pages/ChatPage.tsx', 'utf8').split('\n');

let stack = [];
for (let i = 0; i < lines.length; i++) {
  let l = lines[i];

  // strip self-closing divs
  l = l.replace(/<div(?:[^>]*)\/>/g, '');

  const openMatches = l.match(/<div[\s>]/g) || [];
  const closeMatches = l.match(/<\/div>/g) || [];

  for (let j = 0; j < openMatches.length; j++) {
    stack.push(i + 1);
  }

  for (let j = 0; j < closeMatches.length; j++) {
    stack.pop();
  }
}

console.log("Remaining Unclosed Divs from stack:", stack);
