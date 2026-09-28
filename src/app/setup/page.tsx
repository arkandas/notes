'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProviders } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readApiError } from '@/lib/error-codes';
import { useApiError } from '@/lib/use-api-error';

export default function SetupPage() {
  const t = useTranslations('setup');
  const tFields = useTranslations('fields');
  const tErrors = useTranslations('errors');
  const apiError = useApiError();
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProviders()
      .then(providers => {
        if (providers?.oidc) router.replace('/login');
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    if (formData.password.length < 6) {
      setError(tErrors('passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: 'ADMIN',
        }),
      });

      if (!response.ok) throw await readApiError(response, 'userCreateFailed');

      router.push('/login?setup=success');
    } catch (err) {
      setError(apiError(err, 'userCreateFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>

      <div className="dialog-panel w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl sm:p-8">
        <div className="text-center mb-8">
          <h1 className="mb-2 text-3xl font-bold text-ink">{t('title')}</h1>
          <p className="text-ink-muted">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-ink-muted">
              {tFields('username')}
            </label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              className="w-full"
              placeholder={tFields('usernamePlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-muted">
              {tFields('email')}
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full"
              placeholder={tFields('emailPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-muted">
              {tFields('password')}
            </label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="w-full"
              placeholder={tFields('passwordPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-ink-muted">
              {t('confirmPassword')}
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              className="w-full"
              placeholder={t('confirmPasswordPlaceholder')}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-danger bg-danger-soft px-4 py-3 text-danger">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-accent text-base text-accent-ink hover:bg-accent-hover sm:h-10 sm:text-sm"
          >
            {loading ? t('submitting') : t('submit')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-ink-muted">
          <p>{t('adminNote')}</p>
          <p className="mt-1">{t('moreUsersNote')}</p>
        </div>
      </div>
    </div>
  );
}
