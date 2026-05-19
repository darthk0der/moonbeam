const fs = require('fs');
let code = fs.readFileSync('lib/scoring.ts', 'utf8');

if (!code.includes("import { withRetry }")) {
  code = "import { withRetry } from './retry';\n" + code;
}

code = code.replace(
  /const response = await anthropic\.messages\.create\({/g,
  "const response = await withRetry(() => anthropic.messages.create({"
);

code = code.replace(
  /      },\n    \],\n  }\);/g,
  "      },\n    ],\n  }));"
);

fs.writeFileSync('lib/scoring.ts', code);
console.log('scoring.ts patched');
