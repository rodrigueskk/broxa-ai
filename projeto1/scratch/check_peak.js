import fs from 'fs';

const content = fs.readFileSync('e:/projeto1/src/pages/ChatPage.tsx', 'utf8');
const lines = content.split('\n');

let divStack = 0;
let maxStack = 0;
let maxLine = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const divOpens = (line.match(/<div/g) || []).length;
    const divCloses = (line.match(/<\/div/g) || []).length;
    divStack += divOpens - divCloses;
    if (divStack > maxStack) {
        maxStack = divStack;
        maxLine = i + 1;
    }
}

console.log(`Max Div stack: ${maxStack} at line ${maxLine}`);
console.log(`Final Div stack: ${divStack}`);
