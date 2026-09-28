import { describe, expect, it } from 'vitest';
import { API_ERRORS, ApiError, isApiErrorCode, readApiError } from '@/lib/error-codes';

describe('isApiErrorCode', () => {
  it('accepts every known code', () => {
    for (const code of API_ERRORS) expect(isApiErrorCode(code)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isApiErrorCode('Unauthorized')).toBe(false);
    expect(isApiErrorCode('')).toBe(false);
    expect(isApiErrorCode(undefined)).toBe(false);
    expect(isApiErrorCode(404)).toBe(false);
  });

  it('has no duplicate codes', () => {
    expect(new Set(API_ERRORS).size).toBe(API_ERRORS.length);
  });
});

describe('readApiError', () => {
  it('reads the code from the response body', async () => {
    const error = await readApiError(Response.json({ error: 'folderExists' }, { status: 409 }), 'generic');
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('folderExists');
  });

  it('falls back when the body has no known code', async () => {
    expect((await readApiError(Response.json({ error: 'Something else' }, { status: 500 }), 'avatarFailed')).code).toBe('avatarFailed');
    expect((await readApiError(new Response('Bad gateway', { status: 502 }), 'imageUploadFailed')).code).toBe('imageUploadFailed');
  });
});
