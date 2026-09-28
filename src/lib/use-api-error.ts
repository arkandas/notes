'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError, type ApiErrorCode } from '@/lib/error-codes';

export function useApiError() {
  const t = useTranslations('errors');

  return useCallback(
    (error: unknown, fallback: ApiErrorCode) => t(error instanceof ApiError ? error.code : fallback),
    [t],
  );
}
