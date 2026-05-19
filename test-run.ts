import { runScan } from './lib/scan';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    const scanId = await runScan('manual');
    console.log('Scan completed successfully. Scan ID:', scanId);
  } catch (err) {
    console.error('Scan failed:', err);
  }
  process.exit(0);
}

main();
