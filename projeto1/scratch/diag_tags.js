import fs from 'fs';

const content = fs.readFileSync('e:/projeto1/src/pages/ChatPage.tsx', 'utf8');
const lines = content.split('\n');

const tags = [];
const tagRegex = /<(\/?)(div|motion\.div|AnimatePresence)([^>]*?)(\/?)>/g;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
        const [full, isClosing, tagName, attrs, selfClosing] = match;
        if (selfClosing === '/') continue;
        tags.push({ tagName, line: i + 1, isClosing: isClosing === '/' });
    }
}

let stack = [];
for (const tag of tags) {
    if (tag.isClosing) {
        if (stack.length > 0) {
            const last = stack[stack.length - 1];
            if (last.tagName === tag.tagName) {
                stack.pop();
            } else {
                console.log(`Mismatch at line ${tag.line}: found </${tag.tagName}> but expected </${last.tagName}> (opened at line ${last.line})`);
                // Try to find the matching opener in the stack to recover
                const index = stack.map(t => t.tagName).lastIndexOf(tag.tagName);
                if (index !== -1) {
                    stack.splice(index);
                }
            }
        } else {
            console.log(`Unexpected closing tag </${tag.tagName}> at line ${tag.line}`);
        }
    } else {
        stack.push(tag);
    }
}

console.log("\nRemaining unclosed tags in stack:");
stack.forEach(t => console.log(`${t.tagName} opened at line ${t.line}`));
