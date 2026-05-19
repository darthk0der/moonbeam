import { NextResponse } from 'next/server';
import { runScan } from '@/lib/scan';

export const maxDuration = 300;

export async function GET(req: Request) {
  // Vercel Cron auth header
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const scanId = await runScan('cron');
    return NextResponse.json({ success: true, scanId });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('Cron scan failed:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
