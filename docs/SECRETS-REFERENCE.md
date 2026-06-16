# Secrets & Environment Reference

**DO NOT** commit this file content. This is a personal reference for local/CI use.

---

## Required Environment Variables (backend)

| Variable | Source | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | Neon Dashboard → Connection Details → Pooled connection | Prisma PostgreSQL connection |
| `JWT_ACCESS_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | Sign access tokens |
| `JWT_REFRESH_SECRET` | Generate: same command | Sign refresh tokens |

## Optional Environment Variables

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` enables static serving + secure cookies |
| `PORT` | Listen port (default: 4000) |
| `INTERNAL_SERVICE_TOKEN` | Service-to-service auth (012 feature) |

## Demo Accounts

All use password `1234` (after seeding):

| Email | Role | Arabic Name |
|-------|------|-------------|
| `student@zu.edu.ly` | STUDENT | أحمد الزروق |
| `teacher@zu.edu.ly` | TEACHER | د. سالم البوسيفي |
| `admin@zu.edu.ly` | ADMIN | إدارة الجامعة |
| `quality@zu.edu.ly` | QUALITY | مكتب ضمان الجودة |

## Production URLs

- **App:** https://madarek.onrender.com
- **Health:** https://madarek.onrender.com/api/v1/health
- **GitHub:** https://github.com/ahmadmedo1012/madarek

## Database Connection (Neon)

```
DATABASE_URL=postgresql://neondb_owner:<password>@ep-spring-paper-aqmiglla-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

Format: Pooler connection string with `?sslmode=require&channel_binding=require`

## Deploy to Render

1. Push to GitHub
2. Render reads `render.yaml` → creates web service
3. `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` auto-generate
4. Set `DATABASE_URL` manually in Render's Environment tab
5. Build: `npm install --include=dev && npm run build`
6. Seed: `DATABASE_URL='...' JWT_ACCESS_SECRET='...' JWT_REFRESH_SECRET='...' npm run db:seed`
