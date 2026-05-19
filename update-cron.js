const fs = require('fs');

if (fs.existsSync('app/api/cron/daily-scan/route.ts')) {
  let route = fs.readFileSync('app/api/cron/daily-scan/route.ts', 'utf8');

  if (!route.includes('export const maxDuration')) {
    route = "export const maxDuration = 300;\n\n" + route;
    fs.writeFileSync('app/api/cron/daily-scan/route.ts', route);
    console.log('cron route updated');
  } else {
    route = route.replace(/export const maxDuration = \d+;/, 'export const maxDuration = 300;');
    fs.writeFileSync('app/api/cron/daily-scan/route.ts', route);
    console.log('cron route maxDuration updated');
  }
} else {
  console.log('cron route does not exist yet');
}
