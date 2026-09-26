export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  name: string;
}

export type AuthConfig = { mode: 'local' } | { mode: 'oidc'; oidc: OidcConfig };

export function readAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  const mode = (env.NOTES_AUTH ?? '').trim().toLowerCase() || 'local';
  if (mode === 'local') return { mode };
  if (mode !== 'oidc') {
    throw new Error(`NOTES_AUTH must be "local" or "oidc", not "${env.NOTES_AUTH}".`);
  }

  const required = ['NOTES_OIDC_ISSUER', 'NOTES_OIDC_CLIENT_ID', 'NOTES_OIDC_CLIENT_SECRET'];
  const missing = required.filter(name => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`NOTES_AUTH=oidc also needs ${missing.join(', ')}.`);
  }

  return {
    mode,
    oidc: {
      issuer: env.NOTES_OIDC_ISSUER!.trim().replace(/\/+$/, ''),
      clientId: env.NOTES_OIDC_CLIENT_ID!.trim(),
      clientSecret: env.NOTES_OIDC_CLIENT_SECRET!.trim(),
      name: env.NOTES_OIDC_NAME?.trim() || 'SSO',
    },
  };
}

export const authConfig = readAuthConfig(process.env);
