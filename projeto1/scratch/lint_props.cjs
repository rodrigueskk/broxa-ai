const fs = require('fs');
const content = fs.readFileSync(process.argv[2], 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = line.match(/([a-zA-Z0-9_-]+)=/g);
    if (matches) {
        const props = matches.map(m => m.replace('=', ''));
        const seen = new Set();
        for (const prop of props) {
            if (seen.has(prop)) {
                console.log(`Potential duplicated prop "${prop}" at line ${i + 1}: ${line.trim()}`);
            }
            seen.add(prop);
        }
    }
}
