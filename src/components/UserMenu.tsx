'use client';

import { useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Settings, LogOut, ChevronDown, Camera, Loader2 } from 'lucide-react';
import { readApiError } from '@/lib/error-codes';
import { uploadAvatar } from '@/lib/image';
import { useApiError } from '@/lib/use-api-error';
import { LanguagePicker } from '@/components/LanguageToggle';
import { ThemePicker } from '@/components/ThemeToggle';

const sectionLabel = 'mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint';

interface UserMenuProps {
  onOpenSettings: () => void;
}

export function UserMenu({ onOpenSettings }: UserMenuProps) {
  const t = useTranslations('userMenu');
  const tTheme = useTranslations('theme');
  const tLanguage = useTranslations('language');
  const tRoles = useTranslations('roles');
  const apiError = useApiError();
  const { data: session, update } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const avatarId = session?.user.avatarId;

  const setAvatar = async (file: File | null) => {
    setBusy(true);
    setError('');
    try {
      const imageId = file ? (await uploadAvatar(file)).id : null;
      const response = await fetch('/api/users/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      });
      if (!response.ok) throw await readApiError(response, 'avatarFailed');
      await update({ avatarId: imageId });
    } catch (e) {
      setError(apiError(e, 'avatarFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (!session) return null;

  const initial = session.user.name?.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-canvas sm:px-3"
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-accent-ink">
          {avatarId ? (
            <img src={`/api/images/${avatarId}`} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-ink">{session.user.name}</div>
          <div className="text-xs text-ink-muted">{tRoles(session.user.role)}</div>
        </div>
        <ChevronDown size={16} className="text-ink-faint" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl max-md:fixed max-md:inset-x-3 max-md:top-14 max-md:mt-0 max-md:w-auto">
            <div className="border-b border-line px-4 py-3">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  title={t('changePicture')}
                  aria-label={t('changePicture')}
                  className="group relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-base font-semibold text-accent-ink"
                >
                  {avatarId ? (
                    <img src={`/api/images/${avatarId}`} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initial
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-overlay/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Camera size={16} className="text-white" />
                  </span>
                  {busy && (
                    <span className="absolute inset-0 flex items-center justify-center bg-overlay/55">
                      <Loader2 size={16} className="animate-spin text-white" />
                    </span>
                  )}
                </button>
                <span className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink">{session.user.name}</div>
                  <div className="truncate text-xs text-ink-muted">{session.user.email}</div>
                </span>
              </div>

              {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={e => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) setAvatar(file);
                }}
              />
            </div>

            <div className="space-y-2.5 border-b border-line px-3 pb-3 pt-2.5">
              <div>
                <div className={sectionLabel}>{tTheme('label')}</div>
                <ThemePicker />
              </div>
              <div>
                <div className={sectionLabel}>{tLanguage('label')}</div>
                <LanguagePicker />
              </div>
            </div>

            {session.user.role === 'ADMIN' && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink-muted transition-colors hover:bg-canvas"
              >
                <Settings size={16} />
                {t('manageUsers')}
              </button>
            )}

            <button
              onClick={() => signOut({ callbackUrl: '/login?signedOut=1' })}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-danger transition-colors hover:bg-danger-soft"
            >
              <LogOut size={16} />
              {t('signOut')}
            </button>

            <p className="mt-1 border-t border-line px-4 pb-1 pt-2 text-[11px] text-ink-faint">
              v{process.env.APP_VERSION}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
