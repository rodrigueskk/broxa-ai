
import fs from 'fs';

function countTagsInRange(filepath, start, end) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n').slice(start - 1, end);
  const subContent = lines.join('\n');

  // Remove strings and comments
  let noStr = subContent.replace(/'(?:\\.|[^'])*'/g, "''")
                        .replace(/"(?:\\.|[^"])*"/g, '""')
                        .replace(/`(?:\\.|[^`])*`/g, '""');
  const noComments = noStr.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

  const openDivs = (noComments.match(/<div(?!\w)[^>]*[^/]>|<div(?!\w)>/g) || []).length;
  const closeDivs = (noComments.match(/<\/div>/g) || []).length;

  console.log(`Range ${start}-${end}: div: +${openDivs} / -${closeDivs} (Delta: ${openDivs - closeDivs})`);
}

const file = 'src/pages/ChatPage.tsx';
countTagsInRange(file, 4410, 5000);
countTagsInRange(file, 5000, 5500);
countTagsInRange(file, 5500, 6000);
countTagsInRange(file, 6000, 6500);
