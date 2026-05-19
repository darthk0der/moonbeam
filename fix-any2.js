const fs = require('fs');

function fixAny(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/catch \(error: any\) \/\/ eslint-disable-line @typescript-eslint\/no-explicit-any {/g, "catch (error: any) {");
  content = content.replace(/catch \(err: any\) \/\/ eslint-disable-line @typescript-eslint\/no-explicit-any {/g, "catch (err: any) {");
  
  // Just use eslint-disable-next-line before the catch block instead
  content = content.replace(/} catch \(err: any\) {/g, "}\n    // eslint-disable-next-line @typescript-eslint/no-explicit-any\n    catch (err: any) {");
  content = content.replace(/} catch \(error: any\) {/g, "}\n    // eslint-disable-next-line @typescript-eslint/no-explicit-any\n    catch (error: any) {");
  fs.writeFileSync(file, content);
}

fixAny('app/actions.ts');
fixAny('lib/retry.ts');
fixAny('lib/scan.ts');
console.log('Fixed syntax error');
