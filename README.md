# Nexo — Welcome DMs

Turn new members into engaged community fans — automatically.

## 🎨 Brand Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Crimson Red | `#DC2828` | Primary CTAs, highlights |
| Vibrant Orange | `#FF8232` | Primary gradient, focus states |
| Coral Pink | `#FF6B6B` | Secondary accents |
| Amber Gold | `#FFB347` | Status badges, highlights |
| Soft Peach | `#FFD9C0` | Background accents |
| Pure White | `#FFFFFF` | Cards, backgrounds |
| Light Gray | `#F5F5F5` | Page backgrounds |
| Charcoal | `#222222` | Primary text |

## 🚀 Features

- **Automated Welcome DMs**: Send personalized messages the moment someone joins
- **Onboarding Questions**: Capture emails, goals, and preferences with one click
- **Lead Management**: View and export all member responses in one dashboard
- **Business-Scoped Templates**: Customize messages per business with global fallbacks
- **Real-time Health Monitoring**: Track DM delivery status and troubleshoot issues

## 🛠️ Setup

1. **Environment Variables**: Copy `.env.local` and configure your Whop API keys
2. **Database**: Run Supabase migrations for business-scoped data
3. **Deploy**: Push to Vercel for automatic deployment

## 📱 Whop App Configuration

**Important**: Update your Whop app settings to use Nexo branding:

1. **App Icon**: Upload `/public/brand/nexo-logo.svg` as your app icon
2. **Store Screenshots**: Update screenshots to show Nexo branding
3. **App Name**: Change to "Nexo — Welcome DMs"
4. **Description**: Use "Turn new members into engaged community fans — automatically."

## 🔧 Development

```bash
npm install
npm run dev
```

## 📊 Admin Features

- **Health Dashboard**: `/admin/dm-health` - Monitor DM delivery status
- **Debug Endpoints**: `/api/debug/*` - Test Whop API integration
- **Business Analytics**: Track per-business DM performance

## 🎯 Business Scoping

Each business gets their own:
- DM templates
- Onboarding questions  
- Lead data
- Analytics

Global fallbacks ensure backward compatibility.

---

Built with Next.js, Tailwind CSS, and Supabase. Powered by the Whop API.
