const fs = require('fs');
const content = fs.readFileSync(process.argv[2], 'utf8');

const propRegex = /<([a-zA-Z0-9_]+)\s+([^>]+)>/g;
let match;
while ((match = propRegex.exec(content)) !== null) {
    const tagName = match[1];
    const propsStr = match[2];
    const props = propsStr.match(/[a-zA-Z0-9_]+(?==)/g) || [];
    const seen = new Set();
    for (const prop of props) {
        if (seen.has(prop)) {
            console.log(`Duplicate prop "${prop}" in tag <${tagName}> around position ${match.index}`);
        }
        seen.add(prop);
    }
}
