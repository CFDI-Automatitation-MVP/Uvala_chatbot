# Brevo Email Integration Setup Guide

## ✅ Implementation Complete

Your Brevo email integration has been successfully implemented with the following features:

- 🎉 **Welcome emails** for first-time users
- 📧 **Subscription confirmation** emails
- 💔 **Subscription cancellation** emails
- 🔄 **Automatic user creation** and email detection
- 🛡️ **Error handling** and logging

## 📁 Files Created/Modified

### New Files:
- `src/lib/email/brevo.ts` - Main Brevo email service
- `src/lib/email/test-brevo.ts` - Test utilities
- `BREVO_SETUP.md` - This setup guide

### Modified Files:
- `src/app/auth/callback/route.ts` - Added welcome email for new users
- `src/app/api/stripe/webhook/route.ts` - Added subscription emails
- `.env.local` - Added BREVO_API_KEY configuration

## 🚀 Setup Instructions

### 1. Get Your Brevo API Key

1. Go to [Brevo](https://app.brevo.com) and sign up or login
2. Navigate to **SMTP & API** in your account settings
3. Click **API Keys** tab
4. Click **Generate a new API key**
5. Copy the generated API key (starts with `xkeysib-`)

### 2. Update Environment Variables

Replace the placeholder in `.env.local`:

```env
# Replace with your actual Brevo API key
BREVO_API_KEY=xkeysib-your-actual-api-key-here
```

### 3. Verify Your Sender Domain

**Important**: For production emails, verify your domain in Brevo:

1. Go to **Senders & IP** > **Domains**
2. Add your domain (e.g., `uvala.com`)
3. Follow Brevo's DNS verification process

### 4. Update Sender Email

In `src/lib/email/brevo.ts`, update the default sender:

```typescript
this.defaultSender = {
  name: 'Uvala',
  email: 'noreply@yourdomain.com' // Use your verified domain
};
```

## 🧪 Testing

### Test API Connection

```bash
npx tsx src/lib/email/test-brevo.ts
```

### Send Test Email

Update the test email in `test-brevo.ts` and uncomment the test:

```typescript
await brevoEmailService.sendWelcomeEmail(
  'your-email@example.com', // Your test email
  'Test User'
);
```

## 📧 Email Triggers

### Welcome Email
- **When**: New user signs up via OAuth
- **Trigger**: `src/app/auth/callback/route.ts`
- **Detection**: User doesn't exist in PostgreSQL database

### Subscription Created
- **When**: Stripe subscription is created
- **Trigger**: `src/app/api/stripe/webhook/route.ts` → `handleSubscriptionCreated`
- **Template**: Confirmation with plan details

### Subscription Cancelled
- **When**: Stripe subscription is cancelled
- **Trigger**: `src/app/api/stripe/webhook/route.ts` → `handleSubscriptionCanceled`
- **Template**: Cancellation acknowledgment with feedback request

## 🎨 Email Templates

All emails are responsive HTML with:
- Professional design with your brand colors
- Mobile-friendly layout
- Clear call-to-action buttons
- Fallback text versions
- Dynamic content with user personalization

## 🛡️ Error Handling

- Non-blocking: Email failures won't break user flow
- Comprehensive logging for debugging
- Graceful fallbacks for missing data
- Background sending to avoid delays

## 📊 Monitoring

Check your logs for email activity:

```bash
# In development
pnpm dev

# Look for logs like:
✅ Welcome email sent to: user@example.com
✅ Subscription confirmation email sent to: user@example.com
❌ Failed to send email: [error details]
```

## 🔧 Customization

### Modify Email Templates

Edit templates in `src/lib/email/brevo.ts`:
- Update HTML content
- Change styling and colors
- Add/remove sections
- Customize call-to-action buttons

### Add New Email Types

Follow the pattern in `brevo.ts`:

```typescript
async sendYourNewEmail(userEmail: string, params: any) {
  const htmlContent = `<!-- Your HTML template -->`;
  const textContent = `Your text version`;

  return this.sendEmail({
    to: [{ email: userEmail }],
    subject: 'Your Subject',
    htmlContent,
    textContent,
    params
  });
}
```

## 📈 Brevo Features Available

- **Free Tier**: 9,000 emails/month (300/day)
- **Transactional + Marketing**: All-in-one platform
- **Analytics**: Open rates, click tracking, bounces
- **Templates**: Drag-and-drop editor in dashboard
- **Automation**: Workflow builder (paid plans)
- **Multi-channel**: Email + SMS + WhatsApp

## 🆘 Troubleshooting

### Common Issues

1. **"Invalid API key"**
   - Check your API key in `.env.local`
   - Ensure it starts with `xkeysib-`

2. **"Sender not verified"**
   - Verify your domain in Brevo dashboard
   - Use a verified sender email

3. **Emails not sending**
   - Check Brevo dashboard for send logs
   - Verify recipient email format
   - Check spam folder

4. **TypeScript errors**
   - Run `pnpm install` to ensure all dependencies
   - Clear `node_modules` and reinstall if needed

### Debug Commands

```bash
# Test Brevo connection
npx tsx src/lib/email/test-brevo.ts

# Check environment variables
echo $BREVO_API_KEY

# View application logs
pnpm dev # and watch console output
```

## 🎯 Next Steps

1. **Set up your Brevo account** and get API key
2. **Verify your domain** for better deliverability
3. **Test the implementation** with your email
4. **Customize templates** to match your brand
5. **Monitor email performance** in Brevo dashboard

Your email system is now ready for production! 🚀

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Brevo's [documentation](https://developers.brevo.com/)
3. Check your Brevo dashboard for detailed logs
4. Test with the included test script