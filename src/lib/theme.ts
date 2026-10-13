import 'server-only';
import { cookies } from 'next/headers';

export const THEME_COOKIE = 'theme';
export type Theme = 'light' | 'dark';

export async function getTheme(): Promise<Theme | undefined> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return value === 'light' || value === 'dark' ? value : undefined;
}
