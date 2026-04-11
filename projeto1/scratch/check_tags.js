
import fs from 'fs';

function checkTags(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');

  // Remove strings
  let noStr = content.replace(/'(?:\\.|[^'])*'/g, "''");
  noStr = noStr.replace(/"(?:\\.|[^"])*"/g, '""');
  noStr = noStr.replace(/`(?:\\.|[^`])*`/g, '""');

  // Remove comments
  const noComments = noStr.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

  const openDivs = (noComments.match(/<div(?!\w)[^>]*[^/]>|<div(?!\w)>/g) || []).length;
  const closeDivs = (noComments.match(/<\/div>/g) || []).length;

  const openMotionDivs = (noComments.match(/<motion\.div(?!\w)[^>]*[^/]>|<motion\.div(?!\w)>/g) || []).length;
  const closeMotionDivs = (noComments.match(/<\/motion\.div>/g) || []).length;

  const openAnimatePresence = (noComments.match(/<AnimatePresence(?!\w)[^>]*[^/]>|<AnimatePresence(?!\w)>/g) || []).length;
  const closeAnimatePresence = (noComments.match(/<\/AnimatePresence>/g) || []).length;

  console.log(`Open divs: ${openDivs}`);
  console.log(`Close divs: ${closeDivs}`);
  console.log(`Open motion.divs: ${openMotionDivs}`);
  console.log(`Close motion.divs: ${closeMotionDivs}`);
  console.log(`Open AnimatePresence: ${openAnimatePresence}`);
  console.log(`Close AnimatePresence: ${closeAnimatePresence}`);
}

checkTags('src/pages/ChatPage.tsx');
