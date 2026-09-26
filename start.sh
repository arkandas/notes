#!/bin/sh
set -e

if [ -z "$NOTES_NEXTAUTH_SECRET" ] && [ -z "$NEXTAUTH_SECRET" ]; then
  echo "NOTES_NEXTAUTH_SECRET is not set. Generate one with: openssl rand -base64 32" >&2
  exit 1
fi

case "$NOTES_NEXTAUTH_SECRET" in
  change-me|YOUR_SECRET)
    echo "WARNING: NOTES_NEXTAUTH_SECRET still has its example value. Anyone can forge a session with it." >&2
    ;;
esac

if [ -z "$NOTES_NEXTAUTH_URL" ] && [ -z "$NEXTAUTH_URL" ]; then
  echo "WARNING: NOTES_NEXTAUTH_URL is not set. Sign-in redirects will point at http://localhost:3000." >&2
fi

auth_mode=$(printf '%s' "${NOTES_AUTH:-local}" | tr '[:upper:]' '[:lower:]')
case "$auth_mode" in
  local) ;;
  oidc)
    for name in NOTES_OIDC_ISSUER NOTES_OIDC_CLIENT_ID NOTES_OIDC_CLIENT_SECRET; do
      eval "value=\${$name}"
      if [ -z "$value" ]; then
        echo "NOTES_AUTH=oidc also needs $name." >&2
        exit 1
      fi
    done
    ;;
  *)
    echo "NOTES_AUTH must be \"local\" or \"oidc\", not \"$NOTES_AUTH\"." >&2
    exit 1
    ;;
esac

echo "Applying database migrations..."
node scripts/migrate.mjs

echo "Starting Next.js application..."
exec node server.js
