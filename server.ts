import express, { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { db, verifyPassword, hashPassword } from './src/db/database.ts';
import { authenticate, requireAdmin, generateToken, AuthenticatedRequest } from './src/server/auth.ts';
import { AiService } from './src/server/ai-service.ts';
import { generateWorkspaceImage } from './src/server/image-service.ts';
import { buildNewFreeModelsFromOpenRouterApi } from './src/server/openrouter-free-models.ts';
import { sanitizeModelForWorkspace } from './src/server/model-sanitizer.ts';
import { normalizeApiKey, buildProviderUpdatePayload } from './src/server/openrouter.ts';
import { isSubscriptionActive, calculateUsageStats, PLANS } from './src/utils/billing.ts';
import { sanitizeIncomingAttachments } from './src/utils/chatAttachments.ts';
import {
  IMAGE_GENERATION_COMPLETION_TOKENS,
  IMAGE_GENERATION_PROMPT_TOKENS,
  IMAGE_GENERATION_TOTAL_TOKENS,
  buildImageFilename,
  isAllowedImageProxyUrl
} from './src/utils/imageGeneration.ts';
import type { ChatAttachment } from './src/types/index.ts';
import { resolveUserAvatarUrl } from './src/utils/avatar.ts';
import {
  type FinanceLedgerEntry,
  isValidISODate,
  getDefaultTitleForCategory
} from './src/utils/financeLedger.ts';
import { isValidBrandIconKey } from './src/utils/modelBrandIcons.ts';
import {
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  injectSeoMetaIntoHtml,
  parseDataUrlImage,
  resolveSeoMetadata
} from './src/utils/seo.ts';
import {
  buildPaymentApprovedEmail,
  buildPaymentRejectedEmail,
  buildPaymentSubmittedAdminEmail,
  buildPaymentSubmittedUserEmail,
  buildPasswordResetOtpEmail,
  buildTestEmail,
  buildWelcomeEmail,
  DEFAULT_SUPPORT_EMAIL,
  maskMailWebhookUrl,
  normalizeMailWebhookUrl,
  resolveMailRuntimeConfig,
  sendMailSafe,
  sendMailViaAppsScript,
  validateAppsScriptWebhookUrl
} from './src/server/mail.ts';
import {
  deriveGuestDisplayName,
  isSyntheticPhoneEmail,
  isValidBdPhoneNumber,
  isValidEmailAddress,
  normalizeBdPhoneNumber,
  synthesizeGuestEmailFromPhone
} from './src/utils/expressCheckout.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Request logger for API calls
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// ==========================================
// 1. Authentication Endpoints
// ==========================================

const serializeAuthUser = (user: any, sub: any, resolvedAvatar?: string) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone,
  role: user.role,
  usage_limit: user.usage_limit,
  current_usage: user.current_usage,
  avatar_url: resolvedAvatar !== undefined ? resolvedAvatar : (user.avatar_url || ''),
  subscription: sub || null,
  isSubscribed: user.role === 'admin' || isSubscriptionActive(sub),
  has_password: Boolean(user.password_hash && String(user.password_hash).trim()),
  google_linked: Boolean(user.firebase_uid && String(user.firebase_uid).trim()),
  needs_email: isSyntheticPhoneEmail(user.email)
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const existing = await db.getUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    const newUser = await db.createUser({
      email,
      password,
      name,
      phone: phone || '',
      role: 'user'
    });

    const token = generateToken(newUser);
    const sub = await db.getSubscriptionByUserId(newUser.id);
    const settings = await db.getSettings();
    const supportEmail = settings.support_email || DEFAULT_SUPPORT_EMAIL;

    void sendMailSafe(
      settings,
      buildWelcomeEmail({
        to: newUser.email,
        name: newUser.name,
        usageLimit: newUser.usage_limit,
        supportEmail
      })
    );

    res.status(201).json({
      token,
      user: serializeAuthUser(newUser, sub)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, identifier, password } = req.body;
    const rawIdentifier = String(identifier || email || '').trim();
    if (!rawIdentifier || !password) {
      res.status(400).json({ error: 'Please provide both email or mobile number and password.' });
      return;
    }

    const user = rawIdentifier.includes('@')
      ? await db.getUserByEmail(rawIdentifier)
      : await db.getUserByPhone(rawIdentifier);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials or password.' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
      return;
    }

    if (!verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid credentials or password.' });
      return;
    }

    const token = generateToken(user);
    const sub = await db.getSubscriptionByUserId(user.id);

    res.json({
      token,
      user: serializeAuthUser(user, sub)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Login error: ' + err.message });
  }
});

app.post('/api/auth/set-password', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { newPassword } = req.body || {};
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    await db.updateUser(req.user!.id, {
      password_hash: hashPassword(newPassword)
    });
    res.json({ success: true, message: 'Password saved! You can use it anytime to sign in.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save password: ' + err.message });
  }
});

app.post('/api/auth/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

    if (!rawEmail && !rawName) {
      res.status(400).json({ error: 'Please provide an email address or name to update.' });
      return;
    }

    const updates: Record<string, any> = {};
    let addedNewRealEmail = false;

    if (rawEmail) {
      if (!isValidEmailAddress(rawEmail) || isSyntheticPhoneEmail(rawEmail)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      const existingByEmail = await db.getUserByEmail(rawEmail);
      if (existingByEmail && existingByEmail.id !== currentUser.id) {
        res.status(400).json({ error: 'This email address is already linked to another Bangla AI account.' });
        return;
      }
      if (rawEmail !== currentUser.email.toLowerCase()) {
        updates.email = rawEmail;
        if (isSyntheticPhoneEmail(currentUser.email)) {
          addedNewRealEmail = true;
        }
      }
    }

    if (rawName) {
      updates.name = rawName;
    }

    const updatedUser =
      Object.keys(updates).length > 0
        ? (await db.updateUser(currentUser.id, updates)) || currentUser
        : currentUser;

    if (addedNewRealEmail) {
      const settings = await db.getSettings();
      void sendMailSafe(
        settings,
        buildWelcomeEmail({
          to: updatedUser.email,
          name: updatedUser.name,
          usageLimit: updatedUser.usage_limit,
          supportEmail: settings.support_email || DEFAULT_SUPPORT_EMAIL
        })
      );
    }

    const sub = await db.getSubscriptionByUserId(updatedUser.id);
    res.json({
      success: true,
      message: 'Account email updated successfully.',
      user: serializeAuthUser(updatedUser, sub)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

app.post('/api/auth/bind-google', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { email, name, photoURL, picture, avatar_url, avatar, user_metadata, uid } = req.body || {};

    if (!uid || !email) {
      res.status(400).json({ error: 'Valid Google account credentials are required.' });
      return;
    }

    const existingByUid = await db.getUserByFirebaseUid(String(uid));
    if (existingByUid && existingByUid.id !== currentUser.id) {
      res.status(400).json({
        error: 'This Google account is already linked to another Bangla AI account.'
      });
      return;
    }

    const googleEmail = String(email).trim().toLowerCase();
    const incomingAvatar = resolveUserAvatarUrl({
      photoURL,
      picture,
      avatar_url,
      avatar,
      user_metadata
    });

    const updates: Record<string, any> = {
      firebase_uid: String(uid)
    };

    if (incomingAvatar && !currentUser.avatar_url) {
      updates.avatar_url = incomingAvatar;
    }

    if (name && (!currentUser.name || currentUser.name.startsWith('Customer ') || currentUser.name === 'Bangla AI Customer')) {
      updates.name = String(name).trim();
    }

    // Upgrade synthetic phone-only email to the verified Google email if available
    if (isSyntheticPhoneEmail(currentUser.email)) {
      const existingByEmail = await db.getUserByEmail(googleEmail);
      if (!existingByEmail || existingByEmail.id === currentUser.id) {
        updates.email = googleEmail;
      }
    }

    const updatedUser = (await db.updateUser(currentUser.id, updates)) || currentUser;
    const sub = await db.getSubscriptionByUserId(updatedUser.id);

    res.json({
      success: true,
      message: 'Your account is now bound with Google!',
      user: serializeAuthUser(updatedUser, sub, updatedUser.avatar_url || incomingAvatar || '')
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to bind Google account: ' + err.message });
  }
});

app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { email, name, photoURL, picture, avatar_url, avatar, user_metadata, uid } = req.body;
    if (!email || !uid) {
      res.status(400).json({ error: 'Valid Google account credentials required.' });
      return;
    }

    const incomingAvatar = resolveUserAvatarUrl({
      photoURL,
      picture,
      avatar_url,
      avatar,
      user_metadata
    });

    const user = await db.upsertGoogleUser({
      email,
      name: name || email.split('@')[0],
      uid,
      avatar_url: incomingAvatar
    });

    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
      return;
    }

    const token = generateToken(user);
    const sub = await db.getSubscriptionByUserId(user.id);
    const resolvedAvatar = user.avatar_url || incomingAvatar || '';

    res.json({
      token,
      user: serializeAuthUser(user, sub, resolvedAvatar)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Google authentication error: ' + err.message });
  }
});

app.get('/api/auth/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const sub = await db.getSubscriptionByUserId(user.id);
    const usageLimit = user.usage_limit !== undefined ? user.usage_limit : 0;
    const usageStats = calculateUsageStats(usageLimit, user.current_usage || 0);

    res.json({
      ...serializeAuthUser(user, sub),
      usage: usageStats
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load profile: ' + err.message });
  }
});

app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }
    const user = await db.getUserByEmail(email);
    if (!user) {
      res.json({ message: 'If this email is registered, password reset instructions have been dispatched.' });
      return;
    }

    const resetToken = 'RESET-' + Math.floor(100000 + Math.random() * 900000);
    await db.updateUser(user.id, {
      reset_token: resetToken,
      reset_token_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });

    const settings = await db.getSettings();
    const mailConfig = resolveMailRuntimeConfig(settings);

    if (mailConfig.enabled && mailConfig.configured) {
      const mailResult = await sendMailViaAppsScript({
        webhookUrl: mailConfig.webhookUrl,
        secret: mailConfig.secret,
        message: buildPasswordResetOtpEmail({
          to: user.email,
          name: user.name,
          otp: resetToken,
          expiresInMinutes: 15,
          supportEmail: mailConfig.supportEmail
        })
      });

      if (!mailResult.ok) {
        console.error('[Mail] Forgot-password delivery failed:', mailResult.error);
        res.status(502).json({
          error: 'Unable to send reset verification email right now. Please try again shortly or contact support.'
        });
        return;
      }

      res.json({
        message: 'A password reset verification code has been sent to your email address.',
        emailSent: true
      });
      return;
    }

    res.json({
      message: 'Email delivery is not configured yet. Use this verification OTP:',
      demoOtp: resetToken,
      emailSent: false
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Password reset request failed: ' + err.message });
  }
});

app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }
    const user = await db.getUserByEmail(email);
    const expiresAtMs = user?.reset_token_expires_at
      ? new Date(user.reset_token_expires_at).getTime()
      : 0;
    if (
      !user ||
      !user.reset_token ||
      user.reset_token !== String(token).trim() ||
      (expiresAtMs > 0 && expiresAtMs < Date.now())
    ) {
      res.status(400).json({ error: 'Invalid or expired reset code.' });
      return;
    }

    await db.updateUser(user.id, {
      password_hash: hashPassword(newPassword),
      reset_token: null,
      reset_token_expires_at: null
    });

    res.json({ message: 'Password successfully updated. You may now sign in with your new password.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Password reset failed: ' + err.message });
  }
});

// ==========================================
// 2. Subscription & Payment Endpoints
// ==========================================

app.get('/api/subscription/plans', (_req: Request, res: Response) => {
  res.json(PLANS);
});

app.get('/api/settings/public', async (_req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    res.json({
      bkash_number: settings.bkash_number || '01812345678',
      nagad_number: settings.nagad_number || '01712345678',
      rocket_number: settings.rocket_number || '01912345678',
      support_phone: settings.support_phone || '+880 1622-860128',
      support_email: settings.support_email || 'ourbangla.ai@gmail.com',
      facebook_page_url: settings.facebook_page_url || 'https://www.facebook.com/profile.php?id=61596472081766',
      facebook_pixel_id: settings.facebook_pixel_id || '',
      facebook_pixel_enabled: !!settings.facebook_pixel_enabled
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load public settings: ' + err.message });
  }
});

app.get('/api/seo/og-banner', async (_req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    const parsed = settings.seo_og_image_data ? parseDataUrlImage(settings.seo_og_image_data) : null;
    if (parsed) {
      res.setHeader('Content-Type', parsed.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(parsed.buffer);
      return;
    }
    const distBanner = path.resolve(process.cwd(), 'dist', 'og-banner.png');
    const publicBanner = path.resolve(process.cwd(), 'public', 'og-banner.png');
    const bannerPath = fs.existsSync(distBanner) ? distBanner : publicBanner;
    if (fs.existsSync(bannerPath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.sendFile(bannerPath);
      return;
    }
    res.status(404).json({ error: 'OG banner image not found.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to serve OG banner: ' + err.message });
  }
});

app.get('/api/payment/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await db.getSettings();
    res.json({
      bkash_number: settings.bkash_number || '01812345678',
      nagad_number: settings.nagad_number || '01712345678',
      rocket_number: settings.rocket_number || '01912345678',
      support_phone: settings.support_phone || '+880 1622-860128',
      support_email: settings.support_email || 'ourbangla.ai@gmail.com',
      facebook_page_url: settings.facebook_page_url || 'https://www.facebook.com/profile.php?id=61596472081766',
      facebook_pixel_id: settings.facebook_pixel_id || '',
      facebook_pixel_enabled: !!settings.facebook_pixel_enabled
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load payment settings: ' + err.message });
  }
});

const dispatchPaymentSubmittedEmails = async (params: {
  customerEmail?: string | null;
  customerName: string;
  planId: 'monthly' | 'yearly';
  gateway: 'bkash' | 'nagad' | 'rocket';
  amount: number;
  trxId: string;
  senderNumber: string;
}) => {
  const settings = await db.getSettings();
  const mailConfig = resolveMailRuntimeConfig(settings);
  const planDetails = PLANS[params.planId];
  const hasRealCustomerEmail = Boolean(params.customerEmail && !isSyntheticPhoneEmail(params.customerEmail));

  if (hasRealCustomerEmail && params.customerEmail) {
    void sendMailSafe(
      settings,
      buildPaymentSubmittedUserEmail({
        to: params.customerEmail,
        name: params.customerName || 'Customer',
        planName: planDetails.name,
        amountBdt: params.amount,
        gateway: params.gateway,
        trxId: params.trxId,
        senderNumber: params.senderNumber,
        supportEmail: mailConfig.supportEmail
      })
    );
  }

  if (mailConfig.notifyAdminOnPayment && mailConfig.supportEmail) {
    void sendMailSafe(
      settings,
      buildPaymentSubmittedAdminEmail({
        to: mailConfig.supportEmail,
        userName: params.customerName || 'Customer',
        userEmail: hasRealCustomerEmail && params.customerEmail ? params.customerEmail : `${params.senderNumber} (Phone Express)`,
        planName: planDetails.name,
        amountBdt: params.amount,
        gateway: params.gateway,
        trxId: params.trxId,
        senderNumber: params.senderNumber,
        supportEmail: mailConfig.supportEmail
      })
    );
  }
};

// Common handler for both /api/payments/verify and /api/subscription/checkout
const handlePaymentSubmission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId, gateway, paymentMethod, trxId, senderNumber } = req.body;
    const selectedPlan = planId === 'yearly' ? 'yearly' : 'monthly';
    const selectedGateway = ((gateway || paymentMethod || 'bkash') as string).toLowerCase() as 'bkash' | 'nagad' | 'rocket';

    if (!['bkash', 'nagad', 'rocket'].includes(selectedGateway)) {
      res.status(400).json({ error: 'Valid MFS gateway (bKash, Nagad, or Rocket) is required.' });
      return;
    }

    const cleanTrx = (trxId || '').trim();
    if (!cleanTrx || cleanTrx.length < 6) {
      res.status(400).json({ error: 'Valid SMS Transaction ID (TrxID) is required.' });
      return;
    }

    const cleanSender = normalizeBdPhoneNumber(senderNumber || req.user!.phone || '');
    if (cleanSender.length < 11) {
      res.status(400).json({ error: 'Valid 11-digit Bangladeshi mobile number is required.' });
      return;
    }

    const payment = await db.createPendingPayment({
      userId: req.user!.id,
      planId: selectedPlan,
      gateway: selectedGateway,
      trxId: cleanTrx,
      senderNumber: cleanSender
    });

    await dispatchPaymentSubmittedEmails({
      customerEmail: req.user?.email,
      customerName: req.user?.name || 'Customer',
      planId: selectedPlan,
      gateway: selectedGateway,
      amount: payment.amount,
      trxId: payment.trx_id,
      senderNumber: cleanSender
    });

    res.json({
      success: true,
      status: 'pending',
      message: `Payment request submitted! Your Transaction ID (${payment.trx_id}) is awaiting admin verification. Access will be unlocked as soon as verified.`,
      payment
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Payment submission failed.' });
  }
};

// Express Guest Checkout (No Sign-Up Wall for Facebook Ads Traffic)
app.post('/api/payments/express', async (req: Request, res: Response) => {
  try {
    const { planId, gateway, paymentMethod, trxId, senderNumber, email, name } = req.body || {};
    const selectedPlan = planId === 'yearly' ? 'yearly' : 'monthly';
    const selectedGateway = ((gateway || paymentMethod || 'bkash') as string).toLowerCase() as 'bkash' | 'nagad' | 'rocket';

    if (!['bkash', 'nagad', 'rocket'].includes(selectedGateway)) {
      res.status(400).json({ error: 'Valid MFS gateway (bKash, Nagad, or Rocket) is required.' });
      return;
    }

    const cleanSender = normalizeBdPhoneNumber(senderNumber);
    if (!isValidBdPhoneNumber(cleanSender)) {
      res.status(400).json({ error: 'Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).' });
      return;
    }

    const cleanTrx = String(trxId || '').trim();
    if (!cleanTrx || cleanTrx.length < 6) {
      res.status(400).json({ error: 'Valid SMS Transaction ID (TrxID) is required.' });
      return;
    }

    const rawEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (rawEmail && !isValidEmailAddress(rawEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address or leave it blank.' });
      return;
    }

    let targetUser = rawEmail
      ? (await db.getUserByEmail(rawEmail)) || (await db.getUserByPhone(cleanSender))
      : await db.getUserByPhone(cleanSender);

    let autoAuthenticated = false;
    let issuedToken: string | undefined;

    if (targetUser) {
      if (targetUser.status === 'suspended') {
        res.status(403).json({ error: 'This account is suspended. Please contact support.' });
        return;
      }
      if (!targetUser.phone) {
        await db.updateUser(targetUser.id, { phone: cleanSender });
      }
    } else {
      const resolvedEmail = rawEmail || synthesizeGuestEmailFromPhone(cleanSender);
      const displayName = deriveGuestDisplayName({ name, email: resolvedEmail, phone: cleanSender });

      targetUser = await db.createUser({
        email: resolvedEmail,
        password: '',
        name: displayName,
        phone: cleanSender,
        role: 'user'
      });

      issuedToken = generateToken(targetUser);
      autoAuthenticated = true;

      if (rawEmail) {
        const settings = await db.getSettings();
        void sendMailSafe(
          settings,
          buildWelcomeEmail({
            to: rawEmail,
            name: displayName,
            usageLimit: targetUser.usage_limit,
            supportEmail: settings.support_email || DEFAULT_SUPPORT_EMAIL
          })
        );
      }
    }

    const payment = await db.createPendingPayment({
      userId: targetUser.id,
      planId: selectedPlan,
      gateway: selectedGateway,
      trxId: cleanTrx,
      senderNumber: cleanSender
    });

    await dispatchPaymentSubmittedEmails({
      customerEmail: targetUser.email,
      customerName: targetUser.name || 'Customer',
      planId: selectedPlan,
      gateway: selectedGateway,
      amount: payment.amount,
      trxId: payment.trx_id,
      senderNumber: cleanSender
    });

    if (autoAuthenticated && issuedToken) {
      const sub = await db.getSubscriptionByUserId(targetUser.id);
      res.status(201).json({
        success: true,
        status: 'pending',
        autoAuthenticated: true,
        accountExists: false,
        token: issuedToken,
        user: serializeAuthUser(targetUser, sub),
        message: `Order submitted & account created! Transaction ID (${payment.trx_id}) is awaiting admin verification.`,
        payment
      });
      return;
    }

    res.json({
      success: true,
      status: 'pending',
      autoAuthenticated: false,
      accountExists: true,
      message: `Payment submitted (${payment.trx_id})! Since an account already exists for this email/number, please sign in anytime to track activation.`,
      payment
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Express checkout failed.' });
  }
});

app.post('/api/payments/verify', authenticate, handlePaymentSubmission);
app.post('/api/subscription/checkout', authenticate, handlePaymentSubmission);

app.get('/api/payments/history', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payments = await db.listPayments(req.user!.id);
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load payment history: ' + err.message });
  }
});

// ==========================================
// 3. AI Models & Public Info Endpoints
// ==========================================

app.get('/api/models', async (_req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const models = (await db.listModels(true)).map(sanitizeModelForWorkspace);
    res.json(models);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load models: ' + err.message });
  }
});

// ==========================================
// 4. Chat Endpoints
// ==========================================

app.get('/api/chats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const chats = await db.listChats(req.user!.id);
    res.json(chats);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load chats: ' + err.message });
  }
});

app.post('/api/chats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, modelId } = req.body;
    const enabledModels = await db.listModels(true);
    const defaultModel = enabledModels.find(m => m.is_default) || enabledModels[0];
    const chat = await db.createChat(req.user!.id, title || 'New Chat', modelId || defaultModel?.id || 'mod_gemini_2_5_flash');
    res.status(201).json(chat);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create chat: ' + err.message });
  }
});

app.get('/api/chats/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const chat = await db.getChat(req.params.id, req.user!.id);
    if (!chat) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    const messages = await db.getMessages(chat.id);
    res.json({ chat, messages });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load conversation: ' + err.message });
  }
});

app.patch('/api/chats/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, pinned } = req.body;
    const updated = await db.updateChat(req.params.id, req.user!.id, {
      ...(title !== undefined && { title }),
      ...(pinned !== undefined && { pinned })
    });
    if (!updated) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update conversation: ' + err.message });
  }
});

app.delete('/api/chats/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await db.deleteChat(req.params.id, req.user!.id);
    if (!success) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    res.json({ success: true, message: 'Conversation successfully removed.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete conversation: ' + err.message });
  }
});

// Streaming Chat Completion Endpoint (SSE)
app.post('/api/chat/stream', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { chatId, message, modelId, attachments: rawAttachments } = req.body;
    const cleanMessage = typeof message === 'string' ? message.trim() : '';
    const attachments = sanitizeIncomingAttachments(rawAttachments);

    if (!cleanMessage && attachments.length === 0) {
      res.status(400).json({ error: 'Message content or at least one attachment is required.' });
      return;
    }

    // 1. Subscription & usage verification gating
    const accessCheck = await AiService.validateAccess(user);
    if (!accessCheck.allowed) {
      res.status(accessCheck.statusCode || 403).json({ error: accessCheck.reason });
      return;
    }

    let targetChat = chatId ? await db.getChat(chatId, user.id) : null;
    if (!targetChat) {
      const initialTitle = (cleanMessage || attachments[0]?.name || 'New Chat').slice(0, 32);
      targetChat = await db.createChat(user.id, initialTitle, modelId || 'mod_gemini_2_5_flash');
    }

    // Resolve model & provider
    const selectedModelId = modelId || targetChat.model_id || 'mod_gemini_2_5_flash';
    const enabledModels = await db.listModels(true);
    const model = (await db.getModelById(selectedModelId)) || enabledModels[0];
    const providers = await db.listProviders();
    const provider = (await db.getProviderById(model.provider_id)) || providers[0];

    // Save user message to database
    const userMsg = await db.addMessage(targetChat.id, 'user', cleanMessage, model.id, 0, attachments);

    // Set SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const streamAbortController = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) {
        streamAbortController.abort();
      }
    });

    // Send initial metadata
    res.write(`data: ${JSON.stringify({ type: 'start', chatId: targetChat.id, userMessage: userMsg })}\n\n`);

    // Prepare history
    const previousMessages = await db.getMessages(targetChat.id);
    const formattedHistory = previousMessages.map(m => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments
    }));

    try {
      await AiService.streamCompletion(
        user,
        model,
        provider,
        formattedHistory,
        {
          onChunk: (chunk: string) => {
            if (!streamAbortController.signal.aborted && !res.writableEnded) {
              res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
            }
          },
          onDone: async (fullText: string, promptTokens: number, completionTokens: number) => {
            if (streamAbortController.signal.aborted || res.writableEnded) return;
            try {
              const assistantMsg = await db.addMessage(targetChat!.id, 'assistant', fullText, model.id, completionTokens);
              const usageRecord = await db.recordUsage(user.id, targetChat!.id, model.id, promptTokens, completionTokens);

              const updatedUser = await db.getUserById(user.id);
              const usageLimit = updatedUser?.usage_limit !== undefined ? updatedUser.usage_limit : 0;
              const usageStats = calculateUsageStats(usageLimit, updatedUser?.current_usage || 0);

              if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({
                  type: 'done',
                  assistantMessage: assistantMsg,
                  usageRecord,
                  usageStats
                })}\n\n`);
                res.end();
              }
            } catch (doneErr: any) {
              console.error('Error persisting completed stream:', doneErr);
              if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ type: 'error', error: doneErr?.message || 'Failed to save message.' })}\n\n`);
                res.end();
              }
            }
          },
          onError: (err: Error) => {
            console.error('Streaming error:', err);
            if (!streamAbortController.signal.aborted && !res.writableEnded) {
              res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
              res.end();
            }
          }
        },
        streamAbortController.signal
      );
    } catch (err: any) {
      if (streamAbortController.signal.aborted || err?.name === 'AbortError') return;
      console.error('Stream completion failed:', err);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
        res.end();
      }
    }
  } catch (err: any) {
    console.error('Chat stream route setup failed:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Chat stream initialization failed.' });
    } else if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err?.message || 'Stream failed.' })}\n\n`);
      res.end();
    }
  }
});

// AI Image Generation Endpoint (Pollinations.ai primary + optional Gemini/OpenRouter fallback)
app.post('/api/generate-image', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      chatId,
      prompt,
      aspectRatio,
      modelId,
      seed,
      preferredProvider,
      skipUserMessage
    } = req.body || {};

    const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (!cleanPrompt) {
      res.status(400).json({ error: 'Please describe the image you want to create.' });
      return;
    }
    if (cleanPrompt.length > 1200) {
      res.status(400).json({ error: 'Image prompt must be 1,200 characters or fewer.' });
      return;
    }

    const accessCheck = await AiService.validateAccess(user);
    if (!accessCheck.allowed) {
      res.status(accessCheck.statusCode || 403).json({ error: accessCheck.reason });
      return;
    }

    const enabledModels = await db.listModels(true);
    const fallbackModelId = enabledModels.find(m => m.is_default)?.id || enabledModels[0]?.id || 'mod_gemini_2_5_flash';

    let targetChat = chatId ? await db.getChat(chatId, user.id) : null;
    if (!targetChat) {
      const titleBase = cleanPrompt.slice(0, 32) + (cleanPrompt.length > 32 ? '...' : '');
      targetChat = await db.createChat(user.id, titleBase, modelId || fallbackModelId);
    }

    const resolvedModelId = modelId || targetChat.model_id || fallbackModelId;

    const generated = await generateWorkspaceImage({
      prompt: cleanPrompt,
      aspectRatio,
      seed: typeof seed === 'number' ? seed : undefined,
      preferredProvider
    });

    const userMessage = skipUserMessage
      ? null
      : await db.addMessage(targetChat.id, 'user', cleanPrompt, resolvedModelId, 0);

    const attachment: ChatAttachment = {
      id: `img_${crypto.randomUUID().slice(0, 8)}`,
      name: buildImageFilename(generated.enhancedPrompt || cleanPrompt, generated.aspectRatio),
      mimeType: generated.mimeType,
      size: generated.sizeBytes,
      kind: 'image',
      isGeneratedImage: true,
      imageUrl: generated.imageUrl,
      ...(generated.dataUrl ? { dataUrl: generated.dataUrl } : {}),
      prompt: generated.prompt,
      enhancedPrompt: generated.enhancedPrompt,
      aspectRatio: generated.aspectRatio,
      width: generated.width,
      height: generated.height,
      seed: generated.seed,
      provider: generated.provider
    };

    const assistantCaption = `Generated **${generated.aspectRatio}** image (${generated.width}×${generated.height})`;
    const assistantMessage = await db.addMessage(
      targetChat.id,
      'assistant',
      assistantCaption,
      resolvedModelId,
      IMAGE_GENERATION_TOTAL_TOKENS,
      [attachment]
    );

    const usageRecord = await db.recordUsage(
      user.id,
      targetChat.id,
      resolvedModelId,
      IMAGE_GENERATION_PROMPT_TOKENS,
      IMAGE_GENERATION_COMPLETION_TOKENS
    );

    const updatedUser = await db.getUserById(user.id);
    const usageLimit = updatedUser?.usage_limit !== undefined ? updatedUser.usage_limit : 0;
    const usageStats = calculateUsageStats(usageLimit, updatedUser?.current_usage || 0);

    res.json({
      chat: targetChat,
      userMessage,
      assistantMessage,
      attachment,
      imageUrl: generated.imageUrl,
      dataUrl: generated.dataUrl,
      enhancedPrompt: generated.enhancedPrompt,
      aspectRatio: generated.aspectRatio,
      width: generated.width,
      height: generated.height,
      seed: generated.seed,
      provider: generated.provider,
      usageRecord,
      usageStats
    });
  } catch (err: any) {
    console.error('Image generation route failed:', err);
    res.status(502).json({
      error: err?.message || 'Failed to generate image. Please try again.'
    });
  }
});

// Same-origin proxy for downloading/displaying Pollinations images without CORS issues
app.get('/api/image-proxy', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    if (!isAllowedImageProxyUrl(rawUrl)) {
      res.status(400).json({ error: 'Invalid or unsupported image URL.' });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const upstream = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'image/png,image/jpeg,image/webp,image/*;q=0.9',
        'User-Agent': 'BanglaAI/1.0 (+https://bangla-ai.pro)'
      }
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      res.status(502).json({ error: `Upstream image server returned ${upstream.status}` });
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (req.query.download === '1') {
      const safeFilename =
        typeof req.query.filename === 'string' && req.query.filename.trim()
          ? req.query.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
          : 'bangla-ai-image.png';
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    }
    res.send(buffer);
  } catch (err: any) {
    res.status(502).json({ error: err?.message || 'Failed to proxy image.' });
  }
});

// ==========================================
// 5. Admin Panel Endpoints (Role Protected)
// ==========================================

app.get('/api/admin/stats', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await db.getAdminStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load admin stats: ' + err.message });
  }
});

app.get('/api/admin/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, role, status } = req.query as { search?: string; role?: string; status?: string };
    const users = await db.listUsers(search, role, status);
    const userListWithSubs = await Promise.all(
      users.map(async u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role,
        status: u.status,
        usage_limit: u.usage_limit,
        current_usage: u.current_usage,
        created_at: u.created_at,
        subscription: (await db.getSubscriptionByUserId(u.id)) || null
      }))
    );
    res.json(userListWithSubs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load users: ' + err.message });
  }
});

app.put('/api/admin/users/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, role, usage_limit } = req.body;
    const updated = await db.updateUser(req.params.id, {
      ...(status && { status }),
      ...(role && { role }),
      ...(usage_limit !== undefined && { usage_limit: parseInt(usage_limit, 10) })
    });
    if (!updated) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user: ' + err.message });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ error: 'Cannot delete own administrator account.' });
      return;
    }
    const deleted = await db.deleteUser(req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete user: ' + err.message });
  }
});

app.post('/api/admin/users/:id/subscription', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId, days } = req.body;
    const user = await db.getUserById(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const result = await db.createOrRenewSubscription({
      userId: user.id,
      planId: planId === 'yearly' ? 'yearly' : 'monthly',
      paymentMethod: 'admin_grant',
      trxId: 'ADMIN_GRANT_' + Date.now()
    });

    if (days && parseInt(days, 10) > 0) {
      const customExpiry = new Date(Date.now() + parseInt(days, 10) * 86400 * 1000).toISOString();
      await db.updateSubscription(result.subscription.id, { expires_at: customExpiry });
      result.subscription.expires_at = customExpiry;
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to grant subscription: ' + err.message });
  }
});

const maskSecretKey = (key?: string): string => {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 10) return '••••••••';
  return `${trimmed.slice(0, 7)}...${trimmed.slice(-4)}`;
};

const sanitizeProvider = (p: any) => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  base_url: p.base_url,
  is_active: p.is_active,
  has_api_key: Boolean(p.api_key && p.api_key.trim().length > 0),
  api_key_masked: maskSecretKey(p.api_key),
  created_at: p.created_at,
  updated_at: p.updated_at
});

app.get('/api/admin/providers', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const providers = (await db.listProviders()).map(sanitizeProvider);
    res.json(providers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load providers: ' + err.message });
  }
});

app.put('/api/admin/providers/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updates = buildProviderUpdatePayload(req.body || {});
    const updated = await db.updateProvider(req.params.id, updates);
    if (!updated) {
      res.status(404).json({ error: 'Provider not found.' });
      return;
    }
    res.json(sanitizeProvider(updated));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update provider: ' + err.message });
  }
});

app.post('/api/admin/providers/:id/test', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const provider = await db.getProviderById(req.params.id);
    if (!provider) {
      res.status(404).json({ error: 'Provider not found.' });
      return;
    }

    const candidateKey = normalizeApiKey(req.body?.api_key || provider.api_key);
    if (!candidateKey) {
      res.status(400).json({ error: 'Please enter and save an API key first.' });
      return;
    }

    if (provider.slug === 'openrouter') {
      const baseUrl = (req.body?.base_url || provider.base_url || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
      const resp = await fetch(`${baseUrl}/auth/key`, {
        headers: { Authorization: `Bearer ${candidateKey}` }
      });
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        res.status(400).json({ error: `OpenRouter rejected key (HTTP ${resp.status}). ${errBody.slice(0, 120)}` });
        return;
      }
      const keyInfo: any = await resp.json().catch(() => ({}));
      res.json({
        success: true,
        message: 'OpenRouter API key is valid and connected! All 10 workspace models are ready.',
        details: keyInfo?.data || null
      });
      return;
    }

    res.json({ success: true, message: `${provider.name} API key is saved.` });
  } catch (err: any) {
    res.status(500).json({ error: `Connection check failed: ${err.message}` });
  }
});

app.get('/api/admin/models', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const models = await db.listModels(false);
    res.json(models);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load models: ' + err.message });
  }
});

app.put('/api/admin/models/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      is_enabled,
      is_default,
      badge,
      display_name,
      custom_name,
      description_en,
      custom_description,
      custom_icon,
      openrouter_model_id
    } = req.body;

    const incomingName = custom_name !== undefined ? custom_name : display_name;
    const trimmedName = typeof incomingName === 'string' ? incomingName.trim() : undefined;
    if ((display_name !== undefined || custom_name !== undefined) && incomingName !== null && !trimmedName) {
      res.status(400).json({ error: 'Model display name cannot be empty.' });
      return;
    }

    const incomingDescription = custom_description !== undefined ? custom_description : description_en;
    const trimmedDescription = typeof incomingDescription === 'string' ? incomingDescription.trim() : undefined;

    if (custom_icon !== undefined && custom_icon !== null && custom_icon !== '' && !isValidBrandIconKey(custom_icon)) {
      res.status(400).json({ error: 'Invalid brand icon key.' });
      return;
    }

    const updated = await db.updateModel(req.params.id, {
      ...(is_enabled !== undefined && { is_enabled }),
      ...(is_default !== undefined && { is_default }),
      ...(badge !== undefined && { badge }),
      ...(incomingName !== undefined && { custom_name: incomingName === null ? null : trimmedName }),
      ...(incomingDescription !== undefined && {
        custom_description: incomingDescription === null ? null : trimmedDescription
      }),
      ...(custom_icon !== undefined && {
        custom_icon: custom_icon ? String(custom_icon).trim().toLowerCase() : null
      }),
      ...(openrouter_model_id !== undefined && { openrouter_model_id })
    });
    if (!updated) {
      res.status(404).json({ error: 'Model not found.' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update model: ' + err.message });
  }
});

app.post('/api/admin/models/:id/reset', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reset = await db.resetModelCustomizations(req.params.id);
    if (!reset) {
      res.status(404).json({ error: 'Model not found.' });
      return;
    }
    res.json(reset);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset model: ' + err.message });
  }
});

app.post('/api/admin/models/reset-all', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const resetCount = await db.resetAllModelCustomizations();
    res.json({
      success: true,
      resetCount,
      models: await db.listModels(false),
      message:
        resetCount > 0
          ? `Restored ${resetCount} customized model(s) back to their original defaults.`
          : 'All models are already using their default names, descriptions, and logos.'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset all model customizations: ' + err.message });
  }
});

app.post('/api/admin/models/sync-openrouter-free', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const openrouter = await db.getProviderBySlug('openrouter');
    const baseUrl = (openrouter?.base_url || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
    const resp = await fetch(`${baseUrl}/models`);
    if (!resp.ok) {
      res.status(502).json({ error: `Failed to fetch OpenRouter catalog (HTTP ${resp.status}).` });
      return;
    }
    const payload: any = await resp.json();
    const apiModels = Array.isArray(payload?.data) ? payload.data : [];
    const now = new Date().toISOString();
    const existingModels = await db.listModels(false);
    const newFreeModels = buildNewFreeModelsFromOpenRouterApi(apiModels, existingModels, now);
    const addedCount = await db.addModels(newFreeModels);
    res.json({
      success: true,
      addedCount,
      models: await db.listModels(false),
      message: addedCount > 0
        ? `Synced ${addedCount} new OpenRouter free model(s) (turned OFF by default).`
        : 'All live OpenRouter free models are already in your catalog.'
    });
  } catch (err: any) {
    res.status(500).json({ error: `OpenRouter sync failed: ${err.message}` });
  }
});

app.post('/api/admin/models/free/toggle-all', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const enabled = Boolean(req.body?.is_enabled);
    const updatedCount = await db.bulkToggleFreeModels(enabled);
    res.json({
      success: true,
      updatedCount,
      is_enabled: enabled,
      models: await db.listModels(false),
      message: `${updatedCount} OpenRouter free model(s) turned ${enabled ? 'ON' : 'OFF'} for Workspace.`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle free models: ' + err.message });
  }
});

app.post('/api/admin/seo/upload-banner', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
    const parsed = parseDataUrlImage(dataUrl);
    if (!parsed) {
      res.status(400).json({ error: 'Please upload a valid PNG, JPG, or WebP image (max 4 MB).' });
      return;
    }
    const versionedPath = `/api/seo/og-banner?v=${Date.now()}`;
    await db.updateSettings({
      seo_og_image_data: dataUrl.trim(),
      seo_og_image_url: versionedPath
    });
    res.json({
      success: true,
      seo_og_image_url: versionedPath,
      has_custom_uploaded_og_banner: true
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to upload OG banner: ' + err.message });
  }
});

const sanitizeAdminSettingsResponse = (settings: any, openrouter: any) => {
  const {
    seo_og_image_data: rawUploadedBanner,
    mail_webhook_url: rawMailWebhookUrl,
    mail_webhook_secret: rawMailWebhookSecret,
    ...safeSettings
  } = settings || {};
  const resolvedMail = resolveMailRuntimeConfig(settings);
  const resolvedWebhookForMask =
    normalizeMailWebhookUrl(rawMailWebhookUrl) || normalizeMailWebhookUrl(process.env.GOOGLE_APPS_SCRIPT_URL);

  return {
    ...safeSettings,
    seo_title: safeSettings.seo_title || DEFAULT_SEO_TITLE,
    seo_description: safeSettings.seo_description || DEFAULT_SEO_DESCRIPTION,
    seo_og_image_url: safeSettings.seo_og_image_url || DEFAULT_OG_IMAGE_PATH,
    has_custom_uploaded_og_banner: Boolean(rawUploadedBanner),
    openrouter_configured: Boolean(openrouter?.api_key),
    openrouter_key_masked: maskSecretKey(openrouter?.api_key),
    openrouter_base_url: openrouter?.base_url || 'https://openrouter.ai/api/v1',
    openrouter_enabled: openrouter ? openrouter.is_active : true,
    mail_enabled: safeSettings.mail_enabled !== false,
    mail_notify_admin_on_payment: safeSettings.mail_notify_admin_on_payment !== false,
    mail_configured: resolvedMail.configured,
    mail_webhook_source: resolvedMail.source,
    mail_webhook_url_masked: maskMailWebhookUrl(resolvedWebhookForMask),
    mail_secret_configured: Boolean(
      (typeof rawMailWebhookSecret === 'string' && rawMailWebhookSecret.trim()) ||
        (process.env.MAIL_WEBHOOK_SECRET || '').trim()
    )
  };
};

app.get('/api/admin/settings', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await db.getSettings();
    const openrouter = await db.getProviderBySlug('openrouter');
    res.json(sanitizeAdminSettingsResponse(settings, openrouter));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load settings: ' + err.message });
  }
});

app.put('/api/admin/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      openrouter_api_key,
      openrouter_base_url,
      openrouter_enabled,
      openrouter_configured: _oc,
      openrouter_key_masked: _okm,
      has_custom_uploaded_og_banner: _hcub,
      seo_og_image_data: _rawImgData,
      mail_configured: _mc,
      mail_webhook_source: _mws,
      mail_webhook_url_masked: _mwum,
      mail_secret_configured: _msc,
      mail_webhook_url,
      mail_webhook_secret,
      clear_mail_webhook_url,
      ...settingsUpdates
    } = req.body || {};

    if (typeof settingsUpdates.seo_title === 'string') {
      settingsUpdates.seo_title = settingsUpdates.seo_title.trim() || DEFAULT_SEO_TITLE;
    }
    if (typeof settingsUpdates.seo_description === 'string') {
      settingsUpdates.seo_description = settingsUpdates.seo_description.trim() || DEFAULT_SEO_DESCRIPTION;
    }
    if (typeof settingsUpdates.seo_og_image_url === 'string') {
      const nextUrl = settingsUpdates.seo_og_image_url.trim() || DEFAULT_OG_IMAGE_PATH;
      settingsUpdates.seo_og_image_url = nextUrl;
      if (!nextUrl.startsWith('/api/seo/og-banner')) {
        settingsUpdates.seo_og_image_data = '';
      }
    }

    if (clear_mail_webhook_url === true) {
      settingsUpdates.mail_webhook_url = '';
    } else if (typeof mail_webhook_url === 'string' && mail_webhook_url.trim()) {
      const urlCheck = validateAppsScriptWebhookUrl(mail_webhook_url);
      if (!urlCheck.valid) {
        res.status(400).json({ error: urlCheck.error || 'Invalid Google Apps Script Web App URL.' });
        return;
      }
      settingsUpdates.mail_webhook_url = urlCheck.url;
    }

    if (typeof mail_webhook_secret === 'string' && mail_webhook_secret.trim()) {
      settingsUpdates.mail_webhook_secret = mail_webhook_secret.trim();
    }

    if (
      openrouter_api_key !== undefined ||
      openrouter_base_url !== undefined ||
      openrouter_enabled !== undefined
    ) {
      const providerUpdates = buildProviderUpdatePayload({
        api_key: openrouter_api_key,
        base_url: openrouter_base_url,
        is_active: openrouter_enabled
      });
      if (Object.keys(providerUpdates).length > 0) {
        await db.updateProvider('prov_openrouter', providerUpdates);
      }
    }

    const updated = await db.updateSettings(settingsUpdates);
    const openrouter = await db.getProviderBySlug('openrouter');
    res.json(sanitizeAdminSettingsResponse(updated, openrouter));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update settings: ' + err.message });
  }
});

app.post('/api/admin/mail/test', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await db.getSettings();
    const savedConfig = resolveMailRuntimeConfig(settings);
    const overrideUrl = typeof req.body?.webhookUrl === 'string' ? req.body.webhookUrl.trim() : '';
    const overrideSecret = typeof req.body?.webhookSecret === 'string' ? req.body.webhookSecret.trim() : '';
    const targetEmail = (
      typeof req.body?.toEmail === 'string' && req.body.toEmail.trim()
        ? req.body.toEmail.trim()
        : savedConfig.supportEmail
    );

    const activeWebhookUrl = overrideUrl || savedConfig.webhookUrl;
    const activeSecret = overrideSecret || savedConfig.secret;

    if (!activeWebhookUrl) {
      res.status(400).json({ error: 'Please paste and save your Google Apps Script Web App URL first.' });
      return;
    }

    const result = await sendMailViaAppsScript({
      webhookUrl: activeWebhookUrl,
      secret: activeSecret,
      message: buildTestEmail({
        to: targetEmail,
        supportEmail: savedConfig.supportEmail
      })
    });

    if (!result.ok) {
      res.status(502).json({ error: result.error || 'Failed to send test email.' });
      return;
    }

    res.json({
      success: true,
      message: `Test email sent to ${result.sentTo || targetEmail}! Please check your inbox (and Spam folder just in case).`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Test email failed: ' + err.message });
  }
});

// ==========================================
// 5b. Isolated Admin Finance Ledger Endpoints
// ==========================================

function validateFinanceLedgerPayload(raw: any, fallbackId?: string): FinanceLedgerEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const type = raw.type === 'ad_spend' ? 'ad_spend' : raw.type === 'income' ? 'income' : null;
  const validCategories = ['monthly_plan', 'yearly_plan', 'custom_income', 'meta_ads'] as const;
  const category = validCategories.includes(raw.category) ? raw.category : null;
  const amountBDT = Number(raw.amountBDT);
  const date = typeof raw.date === 'string' ? raw.date : '';

  if (!type || !category || !Number.isFinite(amountBDT) || amountBDT <= 0 || !isValidISODate(date)) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : (fallbackId || `fin_${crypto.randomUUID()}`);
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : getDefaultTitleForCategory(category);
  const note = typeof raw.note === 'string' ? raw.note.trim() : '';
  const deletedAt = raw.deletedAt === null || raw.deletedAt === undefined ? null : String(raw.deletedAt);
  const createdAt = typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : nowIso;
  const updatedAt = typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : nowIso;

  return {
    id,
    type,
    category,
    title,
    note,
    amountBDT: Math.round(amountBDT * 100) / 100,
    date,
    deletedAt,
    createdAt,
    updatedAt
  };
}

app.get('/api/admin/finance-ledger', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const entries = await db.listFinanceLedgerEntries();
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load finance ledger: ' + err.message });
  }
});

app.post('/api/admin/finance-ledger', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const entry = validateFinanceLedgerPayload(req.body);
    if (!entry) {
      res.status(400).json({ error: 'Invalid finance ledger entry payload.' });
      return;
    }
    const saved = await db.upsertFinanceLedgerEntry(entry);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save finance ledger entry: ' + err.message });
  }
});

app.put('/api/admin/finance-ledger/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const entry = validateFinanceLedgerPayload({ ...req.body, id: req.params.id }, req.params.id);
    if (!entry) {
      res.status(400).json({ error: 'Invalid finance ledger entry payload.' });
      return;
    }
    const saved = await db.upsertFinanceLedgerEntry(entry);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update finance ledger entry: ' + err.message });
  }
});

app.delete('/api/admin/finance-ledger/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await db.deleteFinanceLedgerEntry(req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete finance ledger entry: ' + err.message });
  }
});

app.post('/api/admin/finance-ledger/empty-trash', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const removedCount = await db.emptyFinanceLedgerTrash();
    res.json({ success: true, removedCount });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to empty finance trash: ' + err.message });
  }
});

app.post('/api/admin/finance-ledger/reset', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const removedCount = await db.resetFinanceLedger();
    res.json({ success: true, removedCount });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset finance ledger: ' + err.message });
  }
});

app.post('/api/admin/finance-ledger/bulk-import', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawEntries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    const validEntries: FinanceLedgerEntry[] = [];
    for (const raw of rawEntries) {
      const validated = validateFinanceLedgerPayload(raw);
      if (validated) {
        validEntries.push(validated);
      }
    }
    const importedCount = await db.bulkUpsertFinanceLedgerEntries(validEntries);
    const allEntries = await db.listFinanceLedgerEntries();
    res.json({ success: true, importedCount, entries: allEntries });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to import finance ledger entries: ' + err.message });
  }
});

// Admin Payments Verification Endpoints
app.get('/api/admin/payments', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const payments = await db.listAllPayments();
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load payments: ' + err.message });
  }
});

// Helper to fire Meta Conversions API (CAPI) server-side Purchase event
async function sendMetaConversionsPurchase(payment: any, settings: any): Promise<boolean> {
  if (!settings.facebook_pixel_id || !settings.facebook_pixel_access_token || !settings.facebook_pixel_enabled) {
    return false;
  }

  try {
    const user = await db.getUserById(payment.user_id);
    const emailHash = user ? crypto.createHash('sha256').update(user.email.trim().toLowerCase()).digest('hex') : undefined;
    const cleanPhone = (payment.sender_number || '').replace(/[^0-9]/g, '');
    const phoneHash = cleanPhone ? crypto.createHash('sha256').update(cleanPhone).digest('hex') : undefined;

    const payload: any = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: 'https://bangla-ai.pro',
          action_source: 'website',
          user_data: {
            ...(emailHash ? { em: [emailHash] } : {}),
            ...(phoneHash ? { ph: [phoneHash] } : {})
          },
          custom_data: {
            currency: 'BDT',
            value: Number(payment.amount),
            content_name: payment.plan_name || (payment.plan_id === 'yearly' ? 'Yearly Plan (৳5,999)' : 'Monthly Plan (৳699)'),
            content_type: 'product',
            order_id: payment.trx_id,
            payment_method: payment.gateway
          }
        }
      ]
    };

    if (settings.facebook_pixel_test_code) {
      payload.test_event_code = settings.facebook_pixel_test_code;
    }

    const endpoint = `https://graph.facebook.com/v19.0/${settings.facebook_pixel_id}/events?access_token=${settings.facebook_pixel_access_token}`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const respData = await resp.json();
    console.log('[Meta CAPI] Purchase event sent to Facebook Pixel:', respData);
    return resp.ok;
  } catch (err) {
    console.error('[Meta CAPI] Error sending Purchase event:', err);
    return false;
  }
}

app.post('/api/admin/payments/:id/approve', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.approvePayment(id, req.user!.id);
    const settings = await db.getSettings();

    // Trigger Meta Conversions API Purchase Event
    const pixelFired = await sendMetaConversionsPurchase(result.payment, settings);

    // Send subscription activation receipt email to customer (skip synthetic phone-only placeholders)
    const customer = await db.getUserById(result.payment.user_id);
    if (customer?.email && !isSyntheticPhoneEmail(customer.email)) {
      const planKey = result.payment.plan_id === 'yearly' ? 'yearly' : 'monthly';
      void sendMailSafe(
        settings,
        buildPaymentApprovedEmail({
          to: customer.email,
          name: customer.name || result.payment.user_name || 'Customer',
          planName: result.payment.plan_name || PLANS[planKey].name,
          amountBdt: Number(result.payment.amount),
          gateway: result.payment.gateway,
          trxId: result.payment.trx_id,
          expiresAt: result.subscription?.expires_at,
          usageLimit: customer.usage_limit,
          supportEmail: settings.support_email || DEFAULT_SUPPORT_EMAIL
        })
      );
    }

    res.json({
      success: true,
      message: `Payment approved! Subscription activated for ${result.payment.user_name || 'user'}.`,
      payment: result.payment,
      subscription: result.subscription,
      pixelFired
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Payment approval failed.' });
  }
});

app.post('/api/admin/payments/:id/reject', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const rejected = await db.rejectPayment(id, req.user!.id, note);
    const settings = await db.getSettings();
    const customer = await db.getUserById(rejected.user_id);

    if (customer?.email && !isSyntheticPhoneEmail(customer.email)) {
      const planKey = rejected.plan_id === 'yearly' ? 'yearly' : 'monthly';
      void sendMailSafe(
        settings,
        buildPaymentRejectedEmail({
          to: customer.email,
          name: customer.name || rejected.user_name || 'Customer',
          planName: rejected.plan_name || PLANS[planKey].name,
          amountBdt: Number(rejected.amount),
          gateway: rejected.gateway,
          trxId: rejected.trx_id,
          note: typeof note === 'string' ? note : undefined,
          supportEmail: settings.support_email || DEFAULT_SUPPORT_EMAIL
        })
      );
    }

    res.json({
      success: true,
      message: 'Payment rejected.',
      payment: rejected
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Payment rejection failed.' });
  }
});

app.post('/api/admin/pixel/test', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await db.getSettings();
    if (!settings.facebook_pixel_id) {
      res.status(400).json({ error: 'Please enter and save your Facebook Pixel ID first.' });
      return;
    }

    const testPayment = {
      user_id: 'test_user',
      amount: 699,
      plan_name: 'Monthly Plan (৳699)',
      plan_id: 'monthly',
      trx_id: 'TEST_TRX_' + Date.now(),
      gateway: 'bkash',
      sender_number: '01812345678'
    };

    const fired = await sendMetaConversionsPurchase(testPayment, settings);
    res.json({
      success: true,
      pixelFired: fired,
      message: fired
        ? 'Meta Conversions API Purchase test event successfully delivered to Facebook!'
        : 'Pixel test dispatched (Note: Server-side CAPI requires a valid Conversions API Access Token from Meta Events Manager).'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Pixel test failed.' });
  }
});

// ==========================================
// 6. Vite Middleware Integration
// ==========================================

async function renderHtmlWithSeo(rawHtml: string): Promise<string> {
  try {
    const settings = await db.getSettings();
    const meta = resolveSeoMetadata(settings, process.env.PUBLIC_SITE_URL);
    return injectSeoMetaIntoHtml(rawHtml, meta);
  } catch (err) {
    console.error('[SEO] Failed to resolve PostgreSQL SEO settings for HTML injection:', err);
    return injectSeoMetaIntoHtml(rawHtml, resolveSeoMetadata(null, process.env.PUBLIC_SITE_URL));
  }
}

async function startServer() {
  await db.init();

  const distPath = path.resolve(process.cwd(), 'dist');

  if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
    app.use(express.static(distPath, { index: false }));
    app.get('*', async (_req, res) => {
      try {
        const indexPath = path.resolve(distPath, 'index.html');
        const rawHtml = fs.readFileSync(indexPath, 'utf-8');
        const html = await renderHtmlWithSeo(rawHtml);
        res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
      } catch (err: any) {
        res.status(500).send('Failed to render application HTML: ' + err.message);
      }
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      },
      appType: 'custom'
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api') || /\.[a-z0-9]+$/i.test(req.path)) {
        next();
        return;
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        const rawHtml = fs.readFileSync(indexPath, 'utf-8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        const html = await renderHtmlWithSeo(transformed);
        res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
      } catch (err: any) {
        vite.ssrFixStacktrace?.(err);
        next(err);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Bangla AI Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
