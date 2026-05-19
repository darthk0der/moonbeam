const fs = require('fs');
const html = fs.readFileSync('design-reference.html', 'utf8');
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  let css = styleMatch[1].trim();
  const currentCss = fs.readFileSync('app/globals.css', 'utf8');
  const tailwindDirectives = currentCss.match(/@tailwind.*?;/g)?.join('\n') || '@tailwind base;\n@tailwind components;\n@tailwind utilities;';
  
  // Also we need to make sure html smooth scroll and .tier-section scroll-margin-top is in there.
  // Wait, did the user already put smooth scroll and scroll-margin-top in the new design-reference.html?
  fs.writeFileSync('app/globals.css', tailwindDirectives + '\n\n' + css);
  console.log('CSS updated successfully');
}
