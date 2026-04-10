const fs = require('fs');
const content = fs.readFileSync(process.argv[2], 'utf8');

// Simple regex to find duplicate keys in small objects
// This is very rough but might find something like { key: 1, key: 2 }
const objRegex = /\{[^}]+\}/g;
let match;
while ((match = objRegex.exec(content)) !== null) {
    const objStr = match[0];
    const keys = objStr.match(/[a-zA-Z0-9_]+(?=\s*:)/g) || [];
    const seen = new Set();
    for (const key of keys) {
        if (seen.has(key)) {
            console.log(`Duplicate key "${key}" found in content around position ${match.index}:`);
            console.log(objStr);
        }
        seen.add(key);
    }
}
