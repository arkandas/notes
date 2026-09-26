'use client';

import { useState, useEffect, Suspense } from 'react';
import { getProviders, signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Check, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotesMark } from '@/components/NotesMark';

type Providers = Awaited<ReturnType<typeof getProviders>>;

const primaryButton =
  'mt-2 h-[52px] w-full rounded-lg bg-accent text-[17px] font-semibold text-accent-ink shadow-xs shadow-accent/20 ' +
  'transition-colors hover:bg-accent-hover disabled:opacity-70';

function Spinner() {
  return (
    <div className="login-page flex min-h-dvh items-center justify-center">
      <Loader2 size={22} className="animate-spin text-ink-faint" />
    </div>
  );
}

function LoginCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="login-page relative flex min-h-dvh items-center justify-center px-5">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <main className="relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-line shadow-[0_2px_4px_rgba(0,0,0,0.04),0_28px_64px_-32px_rgba(0,0,0,0.4)]">
        <header className="flex items-center gap-4 border-b border-line bg-raised px-6 py-6 sm:px-7">
          <NotesMark size={52} />
          <span className="flex flex-col">
            <span className="text-[29px] font-semibold leading-none tracking-tight text-ink">Notes</span>
            <span className="mt-2 text-[15px] text-ink-muted">Markdown workspace</span>
          </span>
        </header>

        <div className="bg-surface px-6 py-7 sm:px-7">{children}</div>
      </main>
    </div>
  );
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger"
    >
      <AlertTriangle size={16} className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-2 rounded-lg border border-accent/40 bg-accent-soft px-3.5 py-3 text-sm font-medium text-accent">
      <Check size={16} className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function PasswordSignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await fetch('/api/users/check');
        const data = await response.json();
        if (!data.hasUsers) {
          router.push('/setup');
        }
      } catch (error) {
        console.error('Failed to check setup status:', error);
      }
    };
    checkSetup();

    if (searchParams.get('setup') === 'success') {
      setSuccessMessage('Account created. Sign in to continue.');
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        username: formData.username,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid username or password');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const field =
    'peer h-[52px] w-full rounded-lg border border-line-strong bg-raised pl-11 pr-4 text-[17px] text-ink ' +
    'transition-colors hover:border-ink-faint ' +
    'focus:border-accent focus:outline-hidden focus:ring-4 focus:ring-accent/15 ' +
    'focus-visible:outline-hidden';

  const icon =
    'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint ' +
    'transition-colors peer-focus:text-accent';

  return (
    <>
      {successMessage && <Notice>{successMessage}</Notice>}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="username" className="mb-2 block text-[15px] font-semibold text-ink">
            Username
          </label>
          <div className="relative">
            <input
              id="username"
              type="text"
              name="username"
              autoComplete="username"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              required
              className={field}
              autoFocus
            />
            <User size={18} className={icon} />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="mb-2 block text-[15px] font-semibold text-ink">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required
              className={`${field} pr-12`}
            />
            <Lock size={18} className={icon} />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-muted hover:text-ink-muted"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Button type="submit" disabled={loading} className={primaryButton}>
          {loading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>
    </>
  );
}

function OidcSignIn({ name }: { name: string }) {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const signedOut = searchParams.has('signedOut');
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setRedirecting(false);
    };
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  return (
    <>
      {error && (
        <ErrorMessage>
          {error === 'AccessDenied'
            ? `That ${name} account can't sign in to Notes: it has no email, or another ${name} account already uses its email here. To use a different account, sign out of ${name} first.`
            : `Sign-in with ${name} failed. Try again.`}
        </ErrorMessage>
      )}
      {signedOut && !error && <Notice>You signed out of Notes.</Notice>}

      <Button
        type="button"
        disabled={redirecting}
        onClick={() => {
          setRedirecting(true);
          signIn('oidc', { callbackUrl });
        }}
        className={primaryButton}
      >
        {redirecting ? (
          <>
            <Loader2 size={16} className="mr-2 animate-spin" />
            Redirecting to {name}…
          </>
        ) : (
          `Sign in with ${name}`
        )}
      </Button>
    </>
  );
}

function LoginScreen() {
  const [providers, setProviders] = useState<Providers | undefined>(undefined);

  useEffect(() => {
    getProviders()
      .then(setProviders)
      .catch(() => setProviders(null));
  }, []);

  if (providers === undefined) return <Spinner />;

  return (
    <LoginCard>
      {providers?.oidc ? <OidcSignIn name={providers.oidc.name} /> : <PasswordSignIn />}
    </LoginCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginScreen />
    </Suspense>
  );
}
