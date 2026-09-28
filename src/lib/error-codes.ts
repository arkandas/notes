export const API_ERRORS = [
  'generic',
  'unauthorized',
  'noteNotFound',
  'folderNotFound',
  'folderNameRequired',
  'folderExists',
  'folderUpdateFailed',
  'noFile',
  'unsupportedImage',
  'imageTooLarge',
  'imageUploadFailed',
  'imageNotFound',
  'avatarFailed',
  'usersManagedByProvider',
  'missingFields',
  'passwordTooShort',
  'userExists',
  'userCreateFailed',
  'cannotDeleteSelf',
  'userDeleteFailed',
] as const;

export type ApiErrorCode = (typeof API_ERRORS)[number];

export class ApiError extends Error {
  constructor(public code: ApiErrorCode) {
    super(code);
  }
}

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && (API_ERRORS as readonly string[]).includes(value);
}

export async function readApiError(response: Response, fallback: ApiErrorCode): Promise<ApiError> {
  const body = await response.json().catch(() => null);
  return new ApiError(isApiErrorCode(body?.error) ? body.error : fallback);
}
