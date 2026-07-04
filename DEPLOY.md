# MyTokenCost - Deployment Guide

## 📋 Production Environment Setup

### Backend (Railway)

#### 1. Database Configuration
- Railway PostgreSQL automatically linked via DATABASE_URL
- Connection pooling: 20 max connections
- Auto-scaling enabled

#### 2. Required Environment Variables
```
NODE_ENV=production
JWT_SECRET=your-strong-random-secret
SENTRY_DSN=https://your-sentry-dsn (optional)
STRIPE_SECRET_KEY=sk_live_... (optional)
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
