import { cookies } from 'next/headers';
import { createHash } from 'crypto';

export function getAdminCookieValue() {
  const token = process.env.SUPER_USER_TOKEN || '';
  return createHash('sha256').update(token).digest('hex');
}

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('moonbeam_admin')?.value === getAdminCookieValue();
}
