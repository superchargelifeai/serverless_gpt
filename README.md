# GPT Paywall - Vercel Deployment Guide

## 🚀 Complete Step-by-Step Deployment to Vercel

### Prerequisites
- Vercel account (free at vercel.com)
- GitHub account
- Stripe account with API keys
- Airtable account with a base created

### Step 1: Prepare Your Airtable Base

Create a table called "Users" with these fields:
- Email (Email field type)
- StripeCustomerId (Single line text)
- SubscriptionId (Single line text)
- Plan (Single select: free, pro, premium, enterprise)
- Status (Single select: pending, active, cancelled, past_due)
- CurrentPeriodEnd (Date)
- CreatedAt (Date)
- UpdatedAt (Date)

### Step 2: Set Up Project Structure

```
your-project/
├── api/
│   ├── index.js (main handler)
│   ├── routes/
│   │   ├── access.js
│   │   ├── stripe.js
│   │   └── airtable.js
│   └── middleware/
│       └── auth.js
├── vercel.json
├── package.json
├── .env.example
├── test-local.js
└── README.md
```

### Step 3: Create GitHub Repository

1. Create a new repository on GitHub
2. Initialize git in your project folder:
```bash
git init
git add .
git commit -m "Initial commit - GPT Paywall for Vercel"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 4: Deploy to Vercel

1. **Go to [vercel.com](https://vercel.com) and sign in**

2. **Click "Add New..." → "Project"**

3. **Import your GitHub repository**

4. **Configure Project:**
   - Framework Preset: Select "Other"
   - Root Directory: Leave as "./"
   - Build Command: Leave empty (no build needed)
   - Output Directory: Leave empty
   - Install Command: `npm install`

5. **Add Environment Variables (CRUCIAL!):**
   Click on "Environment Variables" and add:

   ```
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_PRICE_ID=price_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   AIRTABLE_API_KEY=keyxxxxx
   AIRTABLE_BASE_ID=appxxxxx
   GPT_API_KEY=your-custom-api-key
   SUCCESS_URL=https://your-app.vercel.app/success
   CANCEL_URL=https://chat.openai.com
   RETURN_URL=https://chat.openai.com
   NODE_ENV=production
   ```

6. **Click "Deploy"**

### Step 5: Configure Stripe Webhook

1. After deployment, copy your Vercel URL (e.g., `https://your-app.vercel.app`)

2. Go to Stripe Dashboard → Webhooks

3. Add endpoint: `https://your-app.vercel.app/api/stripe/webhook`

4. Select events:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted

5. Copy the webhook signing secret and update it in Vercel Environment Variables

### Step 6: Test Your Deployment

Test the health endpoint:
```bash
curl https://your-app.vercel.app/api
```

Test access check:
```bash
curl https://your-app.vercel.app/api/check-access?email=test@example.com \
  -H "X-API-Key: your-gpt-api-key"
```

### Step 7: Update Your GPT Action

Update your GPT's action configuration:
1. Change the server URL to your Vercel URL
2. Update the OpenAPI spec with the new base URL
3. Add the X-API-Key header for authentication

## 🔧 Troubleshooting Common Issues

### Issue 1: "404 Not Found" errors
**Solution:** Check your vercel.json rewrites configuration

### Issue 2: "CORS error from ChatGPT"
**Solution:** Verify CORS origins include 'https://chat.openai.com'

### Issue 3: "Webhook signature verification failed"
**Solution:** Ensure STRIPE_WEBHOOK_SECRET matches Stripe dashboard

### Issue 4: "Airtable connection failed"
**Solution:** Verify AIRTABLE_API_KEY and AIRTABLE_BASE_ID are correct

### Issue 5: "Function timeout"
**Solution:** Vercel free tier has 10-second timeout. Optimize your functions or upgrade.

## 🌟 New Enhanced Endpoints

### User Management
- `GET /api/airtable/users` - List all users with pagination
- `POST /api/airtable/users` - Create/update user
- `DELETE /api/airtable/users/:email` - Delete user

### Analytics
- `GET /api/airtable/analytics` - Get usage analytics

### Bulk Operations
- `POST /api/airtable/users/bulk` - Bulk update/delete users

## 📝 Local Development

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your values
3. Run locally:
```bash
npm install
node test-local.js
```

## 🔐 Security Notes

- Always use environment variables for sensitive data
- Rotate your API keys regularly
- Monitor your Vercel function logs for suspicious activity
- Use rate limiting to prevent abuse

## 🚦 Monitoring

Check your deployment status:
- Vercel Dashboard: Monitor function executions
- Stripe Dashboard: Track payments
- Airtable: View user records

## 📧 Support

For issues specific to:
- Vercel deployment: Check Vercel docs or logs
- Stripe integration: Contact Stripe support
- Airtable: Check Airtable API documentation

---

**Remember:** After deployment, always test with the GPT interface to ensure everything works end-to-end!
