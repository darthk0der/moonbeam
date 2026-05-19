const fs = require('fs');
const html = fs.readFileSync('design-reference.html', 'utf8');
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  let css = styleMatch[1].trim();
  // We need to keep Tailwind directives if they were present, but looking at design-reference.html, it's pure CSS.
  // Wait, does app/globals.css have tailwind directives? Yes!
  const currentCss = fs.readFileSync('app/globals.css', 'utf8');
  const tailwindDirectives = currentCss.match(/@tailwind.*?;/g)?.join('\n') || '@tailwind base;\n@tailwind components;\n@tailwind utilities;';
  fs.writeFileSync('app/globals.css', tailwindDirectives + '\n\n' + css);
  console.log('CSS updated successfully');
}
