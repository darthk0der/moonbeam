const fs = require('fs');
let code = fs.readFileSync('app/actions.ts', 'utf8');
code = code.replace("export const maxDuration = 300;\n\n'use server';", "'use server';\n\nexport const maxDuration = 300;");
fs.writeFileSync('app/actions.ts', code);
