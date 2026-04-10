import fs from 'fs';
const lines = fs.readFileSync('src/pages/ChatPage.tsx', 'utf8').split('\n');

let stack = [];
for (let i = 3075; i < lines.length - 8; i++) {
  let l = lines[i];
  l = l.replace(/<div(?:[^>]*)\/>/g, ''); // strip self closing div

  // match opening divs
  const divRegex = /<div(?:\s+className=["']([^"']*)["']|\s|>)/g;
  let match;
  while ((match = divRegex.exec(l)) !== null) {
    stack.push({line: i + 1, cls: match[1] || 'none'});
  }

  // match closing divs
  const closes = (l.match(/<\/div>/g) || []).length;
  for (let j = 0; j < closes; j++) {
    stack.pop();
  }
}

console.log("Unclosed divs just before the end of the file:", stack);
