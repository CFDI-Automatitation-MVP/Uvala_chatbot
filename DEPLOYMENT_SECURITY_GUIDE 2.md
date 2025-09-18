# 🛡️ Uvala.ai Secure Deployment Guide

## 🚀 Phase 1: Vercel Deployment

### Pre-Deployment Checklist ✅
- [ ] All secrets rotated and removed from .env.example
- [ ] Environment variables properly configured
- [ ] Security headers configured (vercel.json)
- [ ] Build process tested locally

### 1.1 Initial Deployment
```bash
# Connect to Vercel
npm i -g vercel
vercel login
vercel --prod
```

### 1.2 Environment Variables Security
```bash
# CRITICAL: Add these in Vercel Dashboard (vercel.com/dashboard)
# DO NOT add via CLI to avoid exposure in logs

# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
POSTGRES_URL=your_production_database_url

# AI Provider Keys (NEW - rotated keys)
OPENAI_API_KEY=your_new_openai_key
GOOGLE_GENERATIVE_AI_API_KEY=your_new_google_key
ANTHROPIC_API_KEY=your_new_anthropic_key
FIREWORKS_API_KEY=your_new_fireworks_key

# OAuth (Production)
GOOGLE_CLIENT_ID=your_prod_google_client_id
GOOGLE_CLIENT_SECRET=your_prod_google_client_secret

# Redis (NEW credentials)
REDIS_URL=your_new_redis_url

# Security
NODE_ENV=production
VERCEL_ENV=production
```

## 🌐 Phase 2: Custom Domain Security

### 2.1 Domain Configuration
1. **Add Domain in Vercel:**
   - Dashboard → Project → Settings → Domains
   - Add your domain: `uvala.ai`
   - Add www redirect: `www.uvala.ai` → `uvala.ai`

2. **DNS Configuration:**
```
# Your domain registrar DNS settings:
Type: A     Name: @      Value: 76.76.19.61
Type: CNAME Name: www    Value: cname.vercel-dns.com
```

### 2.2 SSL/TLS Security
- ✅ **Automatic HTTPS** - Vercel handles this
- ✅ **HTTP → HTTPS Redirect** - Automatic
- ✅ **HSTS Headers** - Configured in vercel.json
- ✅ **TLS 1.3** - Vercel default

### 2.3 Domain Security Headers
```json
// Already configured in vercel.json
"Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload"
```

## 🔒 Phase 3: Production Security Hardening

### 3.1 Supabase Production Security
```sql
-- Update Supabase Auth settings for production
UPDATE auth.config SET
  site_url = 'https://uvala.ai',
  redirect_urls = '["https://uvala.ai/auth/callback"]'
WHERE id = 1;
```

### 3.2 Google OAuth Production Setup
1. **Google Cloud Console:**
   - Authorized JavaScript origins: `https://uvala.ai`
   - Authorized redirect URIs: `https://uvala.ai/auth/callback`
   - Remove localhost URLs from production

### 3.3 Content Security Policy (CSP)
Add to your app layout or middleware:
```typescript
// app/layout.tsx or middleware.ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' *.supabase.co;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' *.supabase.co *.openai.com *.anthropic.com;
  frame-ancestors 'none';
`;
```

## 📊 Phase 4: Monitoring & Alerting

### 4.1 Vercel Analytics
- Enable in Dashboard → Project → Analytics
- Monitor performance and errors

### 4.2 Supabase Monitoring
- Dashboard → Project → Reports
- Set up alerts for:
  - High error rates
  - Unusual authentication patterns
  - Database performance issues

### 4.3 External Monitoring (Recommended)
```bash
# Set up uptime monitoring
# Options: UptimeRobot, Pingdom, StatusCake
```

## 🚨 Phase 5: Security Validation

### 5.1 Security Headers Check
```bash
# Test your deployed site
curl -I https://uvala.ai
# Should see all security headers
```

### 5.2 SSL/TLS Validation
- Test at: https://www.ssllabs.com/ssltest/
- Target: A+ rating

### 5.3 Security Scan
- Test at: https://observatory.mozilla.org/
- Target: A+ rating

## 🔧 Phase 6: Emergency Procedures

### 6.1 Security Incident Response
1. **API Key Compromise:**
   ```bash
   # Immediately rotate in provider dashboard
   # Update Vercel environment variables
   # Deploy new version
   vercel --prod
   ```

2. **Domain Issues:**
   ```bash
   # Check DNS propagation
   dig uvala.ai
   # Verify SSL certificate
   openssl s_client -connect uvala.ai:443
   ```

3. **Database Emergency:**
   ```bash
   # Check Supabase status
   # Review RLS policies
   # Monitor auth logs
   ```

## 📋 Post-Deployment Checklist

### Immediate (Within 24h)
- [ ] Verify all pages load correctly
- [ ] Test Google OAuth login flow
- [ ] Verify security headers are present
- [ ] Check SSL certificate grade (A+)
- [ ] Test from multiple locations/devices
- [ ] Monitor error rates for first 24h

### Weekly
- [ ] Review Vercel analytics
- [ ] Check Supabase usage metrics
- [ ] Monitor security advisors
- [ ] Verify backup integrity

### Monthly
- [ ] Security headers audit
- [ ] SSL certificate renewal check
- [ ] Performance optimization review
- [ ] Cost optimization review

## 🎯 Success Metrics

**Security:**
- SSL Labs Grade: A+
- Mozilla Observatory: A+
- Zero security warnings
- All headers present

**Performance:**
- Core Web Vitals: All green
- First load: <3s
- Time to Interactive: <5s

**Reliability:**
- Uptime: 99.9%+
- Error rate: <0.1%
- Zero authentication issues

## 🆘 Emergency Contacts

**Vercel Issues:**
- Support: vercel.com/support
- Status: status.vercel.com

**Supabase Issues:**
- Support: supabase.com/support
- Status: status.supabase.com

**Domain Issues:**
- Your registrar support
- DNS provider support

---

## 🔐 Security Best Practices Summary

1. **Never commit secrets** to git
2. **Use environment-specific configs** (dev/staging/prod)
3. **Monitor security advisors** weekly
4. **Rotate API keys** quarterly
5. **Test security headers** after each deployment
6. **Keep dependencies updated** monthly
7. **Monitor authentication patterns** daily
8. **Backup verification** weekly

**Remember: Security is an ongoing process, not a one-time setup!**