const fs = require('fs');
const compiler = require('@babel/core');
const traverse = require('@babel/traverse').default;

const code = fs.readFileSync('src/pages/ChatPage.tsx', 'utf8');

const ast = compiler.parse(code, {
  filename: 'ChatPage.tsx',
  presets: ['@babel/preset-react'],
  plugins: ['@babel/plugin-syntax-jsx', '@babel/plugin-syntax-typescript'],
  parserOpts: {
    plugins: ['typescript', 'jsx']
  }
});

let output = [];
let targetNode = null;

traverse(ast, {
  JSXElement(path) {
    const opening = path.node.openingElement;
    let name = '';
    if (opening.name.type === 'JSXIdentifier') name = opening.name.name;
    else if (opening.name.type === 'JSXMemberExpression') {
        name = opening.name.object.name + '.' + opening.name.property.name;
    }
    
    // Find the ChatPage function return statement
    if (name === 'div') {
      const classNameAttr = opening.attributes.find(a => a.type === 'JSXAttribute' && a.name.name === 'className');
      if (classNameAttr && classNameAttr.value?.value?.includes('flex h-[100dvh] bg-[var(--bg-base)] text-[var(--text-base)]')) {
        targetNode = path;
      }
    }
  }
});

if (targetNode) {
  function printTree(path, depth) {
    const opening = path.node.openingElement;
    let name = '';
    if (opening.name.type === 'JSXIdentifier') name = opening.name.name;
    else if (opening.name.type === 'JSXMemberExpression') {
        name = opening.name.object.name + '.' + opening.name.property.name;
    }

    let cls = '';
    const classNameAttr = Math.min(...opening.attributes.map(a => a.name ? a.name.name === 'className' ? 1 : 2 : 2));
    const attr = opening.attributes.find(a => a.name && a.name.name === 'className');
    if (attr) {
      if (attr.value && attr.value.type === 'StringLiteral') cls = attr.value.value;
      else if (attr.value && attr.value.type === 'JSXExpressionContainer') cls = 'JSXExpression';
    }

    output.push(`${''.padStart(depth * 2, ' ')}<${name} className="${cls.substring(0, 40)}" line="${path.node.loc.start.line}">`);

    path.get('children').forEach(childPath => {
      if (childPath.node.type === 'JSXElement') {
        printTree(childPath, depth + 1);
      } else if (childPath.node.type === 'JSXExpressionContainer') {
          // Check if expression is && expression returning JSXElement
          if (childPath.node.expression.type === 'LogicalExpression' && childPath.node.expression.right.type === 'JSXElement') {
              output.push(`${''.padStart((depth+1) * 2, ' ')}{...} line="${childPath.node.expression.right.loc.start.line}"`);
              /* 
              // Too noisy to print all fragments, just want skeleton 
              // skip diving inside logic expressions for broad view, but let's just indicate it.
              */
          }
      }
    });

    output.push(`${''.padStart(depth * 2, ' ')}</${name}> (closes at line ${path.node.loc.end.line})`);
  }
  printTree(targetNode, 0);
  fs.writeFileSync('ast_tree.txt', output.join('\n'));
  console.log('Tree dumped to ast_tree.txt');
} else {
  console.log('Target root div not found.');
}
