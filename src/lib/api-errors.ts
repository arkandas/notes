import { NextResponse } from 'next/server'
import type { ApiErrorCode } from '@/lib/error-codes'

export function apiError(code: ApiErrorCode, status: number) {
  return NextResponse.json({ error: code }, { status })
}
