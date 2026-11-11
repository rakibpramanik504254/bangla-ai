# Bangla AI — Unified Multi-Model AI Hub for Bangladesh

**Bangla AI** is a production-grade, minimalist AI aggregator web platform engineered for users in Bangladesh. It provides unified access to top foundation models (Google Gemini 2.5, OpenAI GPT-4o, Anthropic Claude 3.5, and DeepSeek R1) through a single distraction-free chat interface with local Bangladeshi Taka (৳) subscriptions via bKash, Nagad, Rocket, and credit cards.

---

## ⚡ Core Capabilities

1. **Modular Multi-Model Aggregator:**
   - **Google Gemini 2.5 Pro & Flash:** Native high-context, ultra-fast streaming via `@google/genai`.
   - **OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, DeepSeek R1:** Modular provider pipeline configurable in the Admin Console without modifying frontend chat logic.
   - Server-side secret isolation: API keys are encrypted in backend storage and never sent to the browser runtime.

2. **Local BDT Pricing & Subscriptions:**
   - **Monthly Plan:** ৳1,299 / month (30-day billing cycle, 50,000 token quota).
   - **Yearly Plan:** ৳9,999 / year (365-day billing cycle, 750,000 token quota, saves ~36%).
   - Seamless checkout supporting bKash, Nagad, Rocket, and card gateways with Transaction ID (TrxID) verification and instant unlocking.
   - Subscription gating: Non-subscribers can browse public pages and register, but require an active subscription to access model chat.

3. **ChatGPT & Gemini Inspired Minimal UI/UX:**
   - Ultra-clean aesthetic with focus on readability and modern typography (Plus Jakarta Sans & Inter).
   - Collapsible conversation sidebar with thread search, inline renaming, and deletion.
   - Header model switcher with badge indicators (Speed, Balanced, Coding, Reasoning).
   - Real-time token consumption meter and quota warning system.
   - Dark and Light mode toggle.

4. **Role-Based Admin Console:**
   - Analytics overview (total registered users, active subscribers, cumulative revenue in BDT, token consumption by model).
   - User directory with status toggling (active/suspended), per-user custom quota overrides, and deletion.
   - Subscription grants and manual renewal extensions.
   - Dynamic AI provider management with masked API keys.
   - Model catalog toggles and default model assignment.

5. **Sensible Draft Policies & Public Pages:**
   - Overview homepage and model comparison matrix.
   - Mission-driven About Us page with Dhaka office details.
   - Comprehensive legal draft Privacy Policy covering data collection, encryption, third-party model transit, user rights, and local Bangladeshi cyber security frameworks.

---

## 🔑 Pre-Seeded Demo Credentials

Instant one-click demo credentials are built into the Sign In modal:

| User Type | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **👑 Super Admin** | `admin@bangla.ai` | `AdminPassword123!` | Full Admin Console & Model Management |
| **⭐ Subscriber** | `subscriber@bangla.ai` | `UserPassword123!` | Active ৳1,299 Monthly Plan, Unlocked Chat |
| **👤 Free User** | `unpaid@bangla.ai` | `UserPassword123!` | Gated workspace, checkout verification test |

---

## 🛠️ Quickstart & Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
npx --yes tsx --test src/utils/billing.test.ts

# 3. Start development server
npm run dev
```

Visit: `http://localhost:3000`

---

## 🌐 Production Deployment

- **Build Command:** `npm run build`
- **Start Command:** `npm start` (Runs Express backend serving production SPA bundle)
- **Database:** Fully portable relational schema defined in `src/db/schema.sql`, easily adaptable to PostgreSQL (Supabase / Neon / Cloud SQL).
