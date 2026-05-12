# Analytics Setup Guide

Your app now has **two analytics solutions** integrated:

1. **Vercel Analytics** - Automatic, zero-config website metrics
2. **PostHog** - Advanced product analytics with session replays

## 🚀 Quick Start

### 1. Vercel Analytics (Already Active!)

If you're deploying on Vercel, analytics is **automatically enabled**. No setup required!

**To view your analytics:**
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click on the "Analytics" tab

**What you'll see:**
- Page views
- Visitors (unique & total)
- Top pages
- Geographic data (countries)
- Device types (mobile/desktop)
- Browsers

---

### 2. PostHog Setup (5 minutes)

PostHog gives you advanced features like session replays, user journeys, funnels, and event tracking.

#### Step 1: Create PostHog Account
1. Go to [posthog.com](https://posthog.com)
2. Sign up (free for 1M events/month)
3. Create a new project

#### Step 2: Get Your API Key
1. In PostHog, go to **Project Settings**
2. Copy your **Project API Key**

#### Step 3: Add Environment Variables
Add to your `.env.local` file:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_YOUR_KEY_HERE
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

#### Step 4: Deploy or Restart Dev Server
```bash
npm run dev
```

That's it! PostHog is now tracking:
- Page views
- User sessions
- Button clicks
- Form submissions
- And more...

---

## 📊 What Metrics You're Tracking

### Automatically Tracked (No Code Required)

**Vercel Analytics:**
- ✅ Page views
- ✅ Unique visitors
- ✅ Geographic location (country)
- ✅ Device type
- ✅ Browser

**PostHog:**
- ✅ Page views
- ✅ Session recordings (watch users navigate your app!)
- ✅ Click events (automatic)
- ✅ Form submissions (automatic)
- ✅ Page scrolls
- ✅ User journeys
- ✅ Time on page
- ✅ Bounce rate
- ✅ Geographic data (country, city)
- ✅ Device, browser, OS
- ✅ Referrer sources

---

## 🎯 Track Custom Events

You can track specific actions in your app using the helper functions.

### Example: Track Battle Completion

```typescript
import { trackEvent } from '@/lib/analytics/events';

// In your battle completion handler
function handleBattleComplete(winner: string) {
  trackEvent('battle_completed', {
    winner: winner,
    timestamp: new Date().toISOString(),
  });
}
```

### Example: Track Friend Added

```typescript
import { trackEvent } from '@/lib/analytics/events';

function handleFriendAdded(method: string) {
  trackEvent('friend_added', {
    method: method, // 'phone_number', 'username', etc.
  });
}
```

### Example: Identify Users on Login

```typescript
import { identifyUser } from '@/lib/analytics/events';

// When user logs in
function handleLogin(userId: string, user: any) {
  identifyUser(userId, {
    username: user.username,
    email: user.email,
    created_at: user.created_at,
  });
}
```

### Example: Reset on Logout

```typescript
import { resetUser } from '@/lib/analytics/events';

function handleLogout() {
  resetUser();
  // ... rest of logout logic
}
```

---

## 📱 Where to Add Tracking

Here are some suggested places to add event tracking:

### In Battle Page (`app/(app)/battle/page.tsx`)
```typescript
import { trackEvent } from '@/lib/analytics/events';

// Track when user votes
trackEvent('battle_vote', {
  friend_voted_for: friendId,
  battle_type: 'tonight', // or 'overall'
});
```

### In Tonight Page (`app/(app)/tonight/page.tsx`)
```typescript
import { trackEvent } from '@/lib/analytics/events';

// Track when user views tonight's pick
trackEvent('tonight_view', {
  friend_id: selectedFriendId,
});
```

### In Auth Flow
```typescript
import { identifyUser, resetUser } from '@/lib/analytics/events';

// On login
identifyUser(user.id, {
  username: user.username,
});

// On logout
resetUser();
```

---

## 🔍 Viewing Your Analytics

### Vercel Analytics
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click "Analytics" tab
4. View real-time and historical data

### PostHog Dashboard
1. Go to [app.posthog.com](https://app.posthog.com)
2. Select your project

**Key Features:**
- **Insights**: Create custom charts and graphs
- **Session Recordings**: Watch actual user sessions
- **Funnels**: Track conversion through user flows
- **Retention**: See how often users come back
- **User Paths**: Visualize common navigation patterns

---

## 🎬 Session Recordings (PostHog)

One of the coolest features! You can literally watch users navigate your app.

**To enable:**
1. In PostHog, go to **Project Settings** → **Recordings**
2. Enable **Session Recordings**
3. Watch recordings appear in the **Recordings** tab

**Privacy Note:** Session recordings respect user privacy and can be filtered to exclude sensitive data.

---

## 🔒 Privacy & GDPR

Both solutions are privacy-friendly:

**Vercel Analytics:**
- No cookies required
- Privacy-friendly by default
- Complies with GDPR

**PostHog:**
- Can be self-hosted
- GDPR compliant
- No third-party data sharing
- IP anonymization available

---

## 💰 Costs

**Vercel Analytics:**
- Included with all Vercel deployments
- Free tier available

**PostHog:**
- **Free tier**: 1M events/month + 5K session recordings
- **Paid**: Starts at $0.000225/event beyond free tier
- Your app will likely stay in free tier

---

## 🐛 Troubleshooting

### PostHog Not Working?
1. Check that environment variables are set in `.env.local`
2. Restart your dev server: `npm run dev`
3. Open browser console - look for PostHog debug logs (in development)
4. Verify your API key is correct in PostHog dashboard

### Vercel Analytics Not Showing Data?
1. Make sure you've deployed to Vercel (doesn't work locally)
2. Wait 24 hours for data to appear
3. Analytics only work on production deployments

### No Events Showing?
1. Check browser console for errors
2. Verify PostHog is initialized (should see debug logs in dev mode)
3. Try tracking a test event manually:
   ```typescript
   import { trackEvent } from '@/lib/analytics/events';
   trackEvent('test_event', { test: true });
   ```

---

## 📚 Next Steps

1. **Deploy to Vercel** to activate Vercel Analytics
2. **Sign up for PostHog** and add your API key
3. **Add custom event tracking** where it makes sense
4. **Watch session recordings** to understand user behavior
5. **Create funnels** to track key user journeys

---

## 📖 Documentation Links

- [Vercel Analytics Docs](https://vercel.com/docs/analytics)
- [PostHog Docs](https://posthog.com/docs)
- [PostHog Session Recordings](https://posthog.com/docs/session-replay)
- [PostHog Funnels](https://posthog.com/docs/user-guides/funnels)

---

## 🎉 You're All Set!

Your analytics are now live. As soon as you deploy, you'll start collecting:
- Visitor data
- Page views
- User behavior
- Session recordings
- And much more!

Happy analyzing! 📊
