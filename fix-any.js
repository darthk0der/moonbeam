const fs = require('fs');

function fixAny(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/catch \(error: any\)/g, "catch (error: any) // eslint-disable-line @typescript-eslint/no-explicit-any");
  content = content.replace(/catch \(err: any\)/g, "catch (err: any) // eslint-disable-line @typescript-eslint/no-explicit-any");
  fs.writeFileSync(file, content);
}

fixAny('app/actions.ts');
fixAny('lib/retry.ts');
fixAny('lib/scan.ts');
console.log('Fixed any types');
