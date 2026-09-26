process.env.NEXTAUTH_URL ??= process.env.NOTES_NEXTAUTH_URL;

const useSecureCookies = (process.env.NOTES_NEXTAUTH_URL ?? '').startsWith('https://');

const securePrefix = useSecureCookies ? '__Secure-' : '';

export const sessionCookieName = `${securePrefix}notes.session-token`;
export const callbackCookieName = `${securePrefix}notes.callback-url`;
export const csrfCookieName = `${useSecureCookies ? '__Host-' : ''}notes.csrf-token`;

export const baseCookieOptions = {
  sameSite: 'lax' as const,
  path: '/',
  secure: useSecureCookies,
};
