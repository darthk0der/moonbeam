import { getAdminCookieValue } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  
  if (!token || token !== process.env.SUPER_USER_TOKEN) {
    return new Response('Forbidden', { status: 403 });
  }

  const response = NextResponse.redirect(new URL('/', req.url));
  const cookieValue = getAdminCookieValue();
  
  response.cookies.set('moonbeam_admin', cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 2592000,
    path: '/'
  });
  
  return response;
}
