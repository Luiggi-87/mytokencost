# MyTokenCost - Deployment Guide

## 📋 Production Environment Setup

### Backend (Railway)

#### 1. Database Configuration
- Railway PostgreSQL linked via a `DATABASE_URL` **reference variable** (Railway's "Add Variable" banner in the app service's Variables tab), pointing at the internal hostname (`*.railway.internal`) — not the public proxy.
- Connection pooling: 20 max connections, `query_timeout`/`statement_timeout`: 8s (prevents indefinite hangs)
- Auto-scaling enabled

#### 2. Required Environment Variables
```
NODE_ENV=production
JWT_SECRET=your-strong-random-secret
SENTRY_DSN=https://your-sentry-dsn (optional)
STRIPE_SECRET_KEY=sk_live_... (optional)

# Password reset (optional)
FRONTEND_URL=https://mtc.247ia.com.br     # used to build the reset-password link sent by email
SMTP_HOST=smtp.gmail.com                  # without these, the reset link is only logged to console
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

#### 3. Health Check
```bash
curl https://mytokencost-production.up.railway.app/api/health
```

### Frontend (Netlify)

#### 1. Required Environment Variables
```
VITE_API_URL=https://mytokencost-production.up.railway.app
```

#### 2. Custom Domain Configuration
- Netlify > Domain Management
- Currently: https://mtc.247ia.com.br

---

## 🔍 Monitoring

### Production Monitor (GitHub Actions)
- Runs every 6 hours automatically
- Tests: Health, Register, Login endpoints
- Creates issue if failures detected
- Run manually: `node monitor.js`

### Sentry Error Tracking
- Set SENTRY_DSN environment variable
- All errors automatically logged
- Real-time alerts for critical errors

---

## 🐛 Known Issues (Resolved)

### `auth/register` and `auth/login` hanging ~5min then 502
**Root cause**: `server/db.js` exported `export default db || {stub}` at the top level. This expression evaluates once, at module-load time — while `db` was still `undefined` (PostgreSQL connects asynchronously). The default export froze permanently as a no-op stub (`run: () => {}`) that never invokes callbacks. Every file importing `db` directly (`server/auth.js`, PUT/DELETE in `apis.js`, `stripe.js`) had its DB calls silently swallowed — the returned Promise never resolved/rejected, and Railway's edge proxy eventually returned 502 after its own timeout.

**Fix**: removed the broken default export; every file now uses the promisified helpers `dbRun`/`dbGet`/`dbAll` exported from `db.js`, which close over the live `db` variable inside the module instead of a snapshot taken at import time.

**Lesson**: never do `export default someAsyncallyAssignedVariable || fallback` — the assignment is a one-time snapshot, not a live binding. Export functions/helpers that read the variable lazily instead.

---

## ✅ Deployment Checklist

- [x] Backend deployed on Railway
- [x] Frontend deployed on Netlify
- [x] Database connected (PostgreSQL)
- [x] CORS configured
- [x] JWT authentication working
- [x] All routes converted to async/await
- [x] Monitoring script created
- [x] GitHub Actions monitor configured
- [x] Error tracking setup (Sentry)
- [x] Load testing completed (91% success rate)

---

## 🚀 Ready for Production!

All systems are operational and ready for production use.
