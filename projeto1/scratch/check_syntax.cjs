const fs = require('fs');
const content = fs.readFileSync(process.argv[2], 'utf8');

try {
    // Simple check: count occurrences of { and }
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    console.log(`Open braces: ${openBraces}, Close braces: ${closeBraces}`);
    if (openBraces !== closeBraces) {
        console.error('MISMATCHED BRACES!');
    }

    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    console.log(`Open parens: ${openParens}, Close parens: ${closeParens}`);
    if (openParens !== closeParens) {
        console.error('MISMATCHED PARENS!');
    }

    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    console.log(`Open brackets: ${openBrackets}, Close brackets: ${closeBrackets}`);
    if (openBrackets !== closeBrackets) {
        console.error('MISMATCHED BRACKETS!');
    }
} catch (e) {
    console.error(e);
}
