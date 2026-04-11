import fs from 'fs';

const content = fs.readFileSync('e:/projeto1/src/pages/ChatPage.tsx', 'utf8');
const lines = content.split('\n');

let divStack = 0;
let motionStack = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const divOpens = (line.match(/<div/g) || []).length;
    const divCloses = (line.match(/<\/div/g) || []).length;
    divStack += divOpens - divCloses;
    
    const motionOpens = (line.match(/<motion\.div/g) || []).length;
    const motionCloses = (line.match(/<\/motion\.div/g) || []).length;
    motionStack += motionOpens - motionCloses;
    
    if (i > 8500) { // Check the end specifically
        // console.log(`Line ${i+1}: Div stack ${divStack}, Motion stack ${motionStack}`);
    }
}

console.log(`Final Div stack: ${divStack}`);
console.log(`Final Motion stack: ${motionStack}`);

divStack = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const divOpens = (line.match(/<div/g) || []).length;
    const divCloses = (line.match(/<\/div/g) || []).length;
    divStack += divOpens - divCloses;
    if (divStack < 0) {
        console.log(`Div stack went negative at line ${i+1}`);
        divStack = 0; // reset to keep tracking
    }
}
