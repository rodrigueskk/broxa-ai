import fs from 'fs';

const content = fs.readFileSync('e:/projeto1/src/pages/ChatPage.tsx', 'utf8');
const lines = content.split('\n');

let inString = false;
let quoteChar = '';
let inBacktick = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (inString) {
            if (char === quoteChar && line[j-1] !== '\\') {
                inString = false;
            }
        } else if (inBacktick) {
            if (char === '`' && line[j-1] !== '\\') {
                inBacktick = false;
            }
        } else {
            if (char === '"' || char === "'") {
                inString = true;
                quoteChar = char;
            } else if (char === '`') {
                inBacktick = true;
            }
        }
    }
    if (inString && quoteChar === '"') {
        // console.log(`Unclosed double quote at line ${i+1}`);
    }
}

if (inString) {
    console.log(`Unclosed string at end: ${quoteChar}`);
}
if (inBacktick) {
    console.log(`Unclosed backtick at end`);
}
