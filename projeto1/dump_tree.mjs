import fs from 'fs';

const lines = fs.readFileSync('src/pages/ChatPage.tsx', 'utf8').split('\n');
let depth = 0;
let output = [];

for (let i = 3075; i < lines.length; i++) {
  let l = lines[i];
  l = l.replace(/<div(?:[^>]*)\/>/g, ''); // strip self closing
  
  const divRegex = /<div(?:\s+className=["']([^"']*)["']|\s|>)/g;
  let match;
  while ((match = divRegex.exec(l)) !== null) {
    depth++;
    const cls = match[1] || '';
    if (depth <= 3) {
      output.push(`${depth} [OPEN line ${i+1}] ${cls.substring(0, 50)}`);
    }
  }

  const closes = (l.match(/<\/div>/g) || []).length;
  for (let j = 0; j < closes; j++) {
    if (depth <= 3) {
      output.push(`${depth} [CLOSE line ${i+1}]`);
    }
    depth--;
  }
}

fs.writeFileSync('div_tree.txt', output.join('\n'));
console.log("Done");
