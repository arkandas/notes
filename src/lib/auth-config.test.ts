import { describe, expect, it } from 'vitest';
import { readAuthConfig } from './auth-config';

const oidcEnv = {
  NOTES_AUTH: 'oidc',
  NOTES_OIDC_ISSUER: 'https://id.example.com/notes/',
  NOTES_OIDC_CLIENT_ID: 'client',
  NOTES_OIDC_CLIENT_SECRET: 'secret',
};

describe('readAuthConfig', () => {
  it('uses local accounts when NOTES_AUTH is unset or empty', () => {
    expect(readAuthConfig({})).toEqual({ mode: 'local' });
    expect(readAuthConfig({ NOTES_AUTH: '' })).toEqual({ mode: 'local' });
  });

  it('ignores OIDC settings in local mode', () => {
    expect(readAuthConfig({ ...oidcEnv, NOTES_AUTH: 'local' })).toEqual({ mode: 'local' });
  });

  it('reads the OIDC settings, dropping the trailing slash from the issuer', () => {
    expect(readAuthConfig(oidcEnv)).toEqual({
      mode: 'oidc',
      oidc: {
        issuer: 'https://id.example.com/notes',
        clientId: 'client',
        clientSecret: 'secret',
        name: 'SSO',
      },
    });
  });

  it('accepts the mode in any case and uses the configured button name', () => {
    const config = readAuthConfig({ ...oidcEnv, NOTES_AUTH: ' OIDC ', NOTES_OIDC_NAME: 'Company SSO' });
    expect(config).toMatchObject({ mode: 'oidc', oidc: { name: 'Company SSO' } });
  });

  it('names every missing OIDC setting', () => {
    expect(() => readAuthConfig({ NOTES_AUTH: 'oidc', NOTES_OIDC_CLIENT_ID: 'client' })).toThrow(
      'NOTES_AUTH=oidc also needs NOTES_OIDC_ISSUER, NOTES_OIDC_CLIENT_SECRET.'
    );
  });

  it('rejects an unknown mode', () => {
    expect(() => readAuthConfig({ NOTES_AUTH: 'both' })).toThrow('NOTES_AUTH must be "local" or "oidc"');
  });
});
