<img src="public/icon.svg" alt="Notes logo" width="64" height="64">

# Notes

A distraction-free, self-hosted markdown editor.

![Screenshot of the editor](docs/editor.jpg)

## Features

- Split view with live preview, plus editor-only and preview-only modes
- GitHub-flavored markdown: tables, task lists, code blocks with syntax
  highlighting
- LaTeX equations, inline and block, rendered with KaTeX
- Image uploads: paste or drop an image into a note
- Folders with colors and icons
- Drag and drop to reorder notes and move them between folders
- Tabs, search, autosave and a trash for deleted notes
- Export to Markdown, PDF and Word (.docx)
- Multi-user support

## Running it

You need a PostgreSQL server, plus Node.js 24 or newer if you are not using
Docker.

Create the database first. `setup-database.sql` creates `notes_db` and the
`notes_user` role. Change the password in the file, then run it:

```bash
psql -h YOUR_POSTGRES_HOST -U postgres -f setup-database.sql
```

### Locally

```bash
cp .env.example .env    # fill it in, see Configuration below
npm install
npm run db:migrate      # creates or updates the tables
npm run dev
```

Then open http://localhost:3000/setup and create the admin account.

### With Docker

```bash
docker build -t notes .

docker run -d --name notes -p 3000:3000 \
  -e NOTES_DATABASE_URL="postgresql://notes_user:YOUR_PASSWORD@YOUR_POSTGRES_HOST:5432/notes_db" \
  -e NOTES_NEXTAUTH_SECRET="YOUR_SECRET" \
  -e NOTES_NEXTAUTH_URL="https://notes.example.com" \
  -v notes-uploads:/app/uploads \
  notes
```

The container runs the database migrations on startup. Uploaded images go to
`/app/uploads`. Mount a volume there to keep them across container rebuilds.

Then create the admin account at `/setup`.

### Configuration

| Variable | Description |
|---|---|
| `NOTES_DATABASE_URL` | PostgreSQL connection string |
| `NOTES_NEXTAUTH_SECRET` | Secret that signs the session cookie. Generate one with `openssl rand -base64 32` |
| `NOTES_NEXTAUTH_URL` | Public URL of the app. If it starts with `https://` the cookies are marked secure |
| `NOTES_UPLOADS_DIR` | Directory for uploaded images. Defaults to `./uploads`, or `/app/uploads` in the Docker image |
| `NOTES_AUTH` | `local` (default) or `oidc` |
| `NOTES_OIDC_ISSUER` | OIDC issuer URL |
| `NOTES_OIDC_CLIENT_ID` | OIDC client ID |
| `NOTES_OIDC_CLIENT_SECRET` | OIDC client secret |
| `NOTES_OIDC_NAME` | Provider name on the sign-in button. Defaults to `SSO` |

### Authentication

Set `NOTES_AUTH` to `local` (default) or `oidc`.

**local**: accounts and passwords are stored in Notes. The first account,
created at `/setup`, is the admin.

**oidc**: users sign in through an OpenID Connect provider and are managed
there. Password login, `/setup` and user management are disabled. Everyone is a
regular user.

The login page has a single sign-in button that redirects to the provider. On
the first sign-in, Notes links the user to the account with the same email, or
creates a new account. After that, users are matched by their provider ID.
Username and email changes in the provider are synced to Notes on sign-in.

A provider account without an email, or with an email already linked to a
different provider account, can't sign in.

Signing out of Notes doesn't sign you out of the provider. To switch accounts,
sign out of the provider.

To set it up:

1. Register Notes in the provider as a confidential client, with the redirect
   URI `https://notes.example.com/api/auth/callback/oidc`.
2. Configure the provider to sign ID tokens with RS256. HS256 isn't supported.
3. Set `NOTES_AUTH=oidc` and the `NOTES_OIDC_*` variables.

> [!WARNING]
> Notes trusts the email address from the provider and uses it to link existing
> accounts. Only use a provider you control.

## Architecture

![Architecture diagram](docs/architecture.svg)

One Next.js app serves the pages and the API. Markdown is rendered in the
browser.

- Authentication uses NextAuth with a JWT session cookie. `src/proxy.ts`
  redirects requests without a session to `/login`.
- Notes and folders are stored in PostgreSQL through Prisma. Deleted notes stay
  in the trash until it is emptied.
- Images are files in the uploads directory, named by their SHA-256. Unused
  images are deleted.
- Markdown and PDF export run in the browser. Word export runs on the server.

## Development

```bash
npm test
npm run lint
```

To change the database schema, edit `prisma/schema.prisma` and run
`npx prisma migrate dev --name describe_the_change`, then commit the new folder
in `prisma/migrations`. Prisma builds a temporary shadow database for this, so
the database user must be allowed to create databases.

## License

[MIT](LICENSE)
