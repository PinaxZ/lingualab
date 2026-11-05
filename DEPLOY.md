# Publicar LinguaLab en Vercel

## Qué ya está listo en el código

- Usuarios y progreso en **PostgreSQL** (Prisma): tablas `User`, `Progress`, `ContentLesson`, `ContentStory`
- Roles: **ADMIN** y **STUDENT** (sin maestros)
- API:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `GET|PUT /api/progress`
  - `GET /api/content/catalog`
  - `GET|POST /api/admin/content/lessons` · `DELETE/PUT .../lessons/[id]`
  - `GET|POST /api/admin/content/stories` · `DELETE/PUT .../stories/[id]`
  - `GET /api/admin/stats`
  - `GET /api/health`
- Sesión con cookie **httpOnly** firmada (`AUTH_SECRET`)
- Contraseñas con **hash + sal** (nunca en texto plano)
- Sin `DATABASE_URL`, la app sigue en modo **localStorage** (solo desarrollo)

## Lo que tú debes configurar (obligatorio)

### 1. Base de datos Postgres

Crea una DB gratuita, por ejemplo:

1. [Neon](https://neon.tech) → New project → copia la connection string  
   o
2. Vercel Dashboard → Storage → Create Database → Postgres

### 2. Crear tablas y admins iniciales

En tu máquina (con la URL real):

```bash
cd lingualab
cp .env.example .env.local
# edita DATABASE_URL y AUTH_SECRET
npx prisma db push
npm run db:seed
```

El seed crea:
- **annaordaz** — Anna Sheccid Ordaz (ADMIN)
- **joselicona** — Jose Manuel Licona (ADMIN)

Contraseña por defecto: `LinguaLab2026!` (o `SEED_ADMIN_PASSWORD`)

### 3. Variables en Vercel

Project → Settings → Environment Variables:

| Name | Value |
|------|--------|
| `DATABASE_URL` | tu connection string Postgres |
| `AUTH_SECRET` | secreto largo aleatorio (≥16 chars) |
| `OPENAI_API_KEY` | opcional, para feedback con modelo |
| `OPENAI_MODEL` | opcional (`gpt-4o-mini`) |

### 4. Deploy

```bash
# desde lingualab/
npx vercel
# o conecta el repo en vercel.com → Import → Root Directory: lingualab
```

Tras el primer deploy, si no corriste `db push` localmente contra la misma DB, ejecuta:

```bash
DATABASE_URL="tu-url" npx prisma db push
```

## Verificación rápida

1. Abre `https://TU-APP.vercel.app/api/health`
2. Debe mostrar `"storage":"database"` y `"readyForPublish":true`
3. Crea una cuenta → haz una lección → cierra sesión → vuelve a entrar: el progreso debe persistir

## Notas

- El catálogo base de lecciones/historias sigue en el código; el admin puede crear, editar y eliminar overlays en DB (o localStorage).
- Feedback IA sigue opcional; sin `OPENAI_API_KEY` usa coach local.
- Habla/escucha dependen del navegador (Web Speech API).
