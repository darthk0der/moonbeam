import { NextResponse } from 'next/server';
import { runScan } from '../../../lib/scan';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const scanId = await runScan('manual');
    return NextResponse.json({ success: true, scanId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
