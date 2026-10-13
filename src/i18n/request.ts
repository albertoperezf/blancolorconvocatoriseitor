import { getRequestConfig } from 'next-intl/server';

export const LOCALE = 'es';

export default getRequestConfig(async () => ({
  locale: LOCALE,
  timeZone: 'Europe/Madrid',
  messages: (await import(`../../messages/${LOCALE}.json`)).default,
}));
