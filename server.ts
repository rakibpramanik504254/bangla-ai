import express, { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { db, User, verifyPassword, hashPassword } from './src/db/database.ts';
import { authenticate, requireAdmin, generateToken, AuthenticatedRequest } from './src/server/auth.ts';
import { AiService } from './src/server/ai-service.ts';
import { buildNewFreeModelsFromOpenRouterApi } from './src/server/openrouter-free-models.ts';
import { sanitizeModelForWorkspace } from './src/server/model-sanitizer.ts';
import { normalizeApiKey, buildProviderUpdatePayload } from './src/server/openrouter.ts';
import { isSubscriptionActive, calculateUsageStats, PLANS } from './src/utils/billing.ts';
import { sanitizeIncomingAttachments } from './src/utils/chatAttachments.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Request logger for API calls
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// ==========================================
// 1. Authentication Endpoints
// ==========================================

app.post('/api/auth/register', (req: Request, res: Response) => {
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

    const existing = db.getUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    const newUser = db.createUser({
      email,
      password,
      name,
      phone: phone || '',
      role: 'user'
    });

    const token = generateToken(newUser);
    const sub = db.getSubscriptionByUserId(newUser.id);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
        usage_limit: newUser.usage_limit,
        current_usage: newUser.current_usage,
        subscription: sub || null,
        isSubscribed: isSubscriptionActive(sub)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Please provide both email and password.' });
      return;
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
      return;
    }

    if (!verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken(user);
    const sub = db.getSubscriptionByUserId(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        usage_limit: user.usage_limit,
        current_usage: user.current_usage,
        subscription: sub || null,
        isSubscribed: user.role === 'admin' || isSubscriptionActive(sub)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Login error: ' + err.message });
  }
});

app.post('/api/auth/google', (req: Request, res: Response) => {
  try {
    const { email, name, photoURL, uid } = req.body;
    if (!email || !uid) {
      res.status(400).json({ error: 'Valid Google account credentials required.' });
      return;
    }

    const user = db.upsertGoogleUser({
      email,
      name: name || email.split('@')[0],
      uid,
      avatar_url: photoURL
    });

    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
      return;
    }

    const token = generateToken(user);
    const sub = db.getSubscriptionByUserId(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        usage_limit: user.usage_limit,
        current_usage: user.current_usage,
        avatar_url: user.avatar_url,
        subscription: sub || null,
        isSubscribed: user.role === 'admin' || isSubscriptionActive(sub)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Google authentication error: ' + err.message });
  }
});

app.get('/api/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const sub = db.getSubscriptionByUserId(user.id);
  const usageLimit = user.usage_limit !== undefined ? user.usage_limit : 0;
  const usageStats = calculateUsageStats(usageLimit, user.current_usage || 0);

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    usage: usageStats,
    subscription: sub || null,
    isSubscribed: user.role === 'admin' || isSubscriptionActive(sub)
  });
});

app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email address is required.' });
    return;
  }
  const user = db.getUserByEmail(email);
  if (!user) {
    res.json({ message: 'If this email is registered, password reset instructions have been dispatched.' });
    return;
  }

  const resetToken = 'RESET-' + Math.floor(100000 + Math.random() * 900000);
  db.updateUser(user.id, {
    reset_token: resetToken,
    reset_token_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  });

  res.json({
    message: 'Password reset OTP has been generated.',
    demoOtp: resetToken
  });
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }
  const user = db.getUserByEmail(email);
  if (!user || user.reset_token !== token) {
    res.status(400).json({ error: 'Invalid or expired reset code.' });
    return;
  }

  db.updateUser(user.id, {
    password_hash: hashPassword(newPassword),
    reset_token: null,
    reset_token_expires_at: null
  });

  res.json({ message: 'Password successfully updated. You may now sign in with your new password.' });
});

// ==========================================
// 2. Subscription & Payment Endpoints
// ==========================================

app.get('/api/subscription/plans', (_req: Request, res: Response) => {
  res.json(PLANS);
});

app.get('/api/settings/public', (_req: Request, res: Response) => {
  const settings = db.getSettings();
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
});

app.get('/api/payment/settings', (_req: Request, res: Response) => {
  const settings = db.getSettings();
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
});

// Common handler for both /api/payments/verify and /api/subscription/checkout
const handlePaymentSubmission = (req: AuthenticatedRequest, res: Response) => {
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

    const cleanSender = (senderNumber || req.user!.phone || '').trim().replace(/[^0-9]/g, '');
    if (cleanSender.length < 11) {
      res.status(400).json({ error: 'Valid 11-digit Bangladeshi mobile number is required.' });
      return;
    }

    const payment = db.createPendingPayment({
      userId: req.user!.id,
      planId: selectedPlan,
      gateway: selectedGateway,
      trxId: cleanTrx,
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

app.post('/api/payments/verify', authenticate, handlePaymentSubmission);
app.post('/api/subscription/checkout', authenticate, handlePaymentSubmission);

app.get('/api/payments/history', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const payments = db.listPayments(req.user!.id);
  res.json(payments);
});

// ==========================================
// 3. AI Models & Public Info Endpoints
// ==========================================

app.get('/api/models', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const models = db.listModels(true).map(sanitizeModelForWorkspace);
  res.json(models);
});

// ==========================================
// 4. Chat Endpoints
// ==========================================

app.get('/api/chats', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const chats = db.listChats(req.user!.id);
  res.json(chats);
});

app.post('/api/chats', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { title, modelId } = req.body;
  const defaultModel = db.listModels(true).find(m => m.is_default) || db.listModels(true)[0];
  const chat = db.createChat(req.user!.id, title || 'New Chat', modelId || defaultModel?.id || 'mod_gemini_2_5_flash');
  res.status(201).json(chat);
});

app.get('/api/chats/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const chat = db.getChat(req.params.id, req.user!.id);
  if (!chat) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  const messages = db.getMessages(chat.id);
  res.json({ chat, messages });
});

app.patch('/api/chats/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { title, pinned } = req.body;
  const updated = db.updateChat(req.params.id, req.user!.id, {
    ...(title !== undefined && { title }),
    ...(pinned !== undefined && { pinned })
  });
  if (!updated) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  res.json(updated);
});

app.delete('/api/chats/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const success = db.deleteChat(req.params.id, req.user!.id);
  if (!success) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  res.json({ success: true, message: 'Conversation successfully removed.' });
});

// Streaming Chat Completion Endpoint (SSE)
app.post('/api/chat/stream', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { chatId, message, modelId, attachments: rawAttachments } = req.body;
  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  const attachments = sanitizeIncomingAttachments(rawAttachments);

  if (!cleanMessage && attachments.length === 0) {
    res.status(400).json({ error: 'Message content or at least one attachment is required.' });
    return;
  }

  let targetChat = chatId ? db.getChat(chatId, user.id) : null;
  if (!targetChat) {
    const initialTitle = (cleanMessage || attachments[0]?.name || 'New Chat').slice(0, 32);
    targetChat = db.createChat(user.id, initialTitle, modelId || 'mod_gemini_2_5_flash');
  }

  // 1. Subscription & usage verification gating
  const accessCheck = AiService.validateAccess(user);
  if (!accessCheck.allowed) {
    res.status(accessCheck.statusCode || 403).json({ error: accessCheck.reason });
    return;
  }

  // Resolve model & provider
  const selectedModelId = modelId || targetChat.model_id || 'mod_gemini_2_5_flash';
  const model = db.getModelById(selectedModelId) || db.listModels(true)[0];
  const provider = db.getProviderById(model.provider_id) || db.listProviders()[0];

  // Save user message to database
  const userMsg = db.addMessage(targetChat.id, 'user', cleanMessage, model.id, 0, attachments);

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
  const previousMessages = db.getMessages(targetChat.id);
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
        onDone: (fullText: string, promptTokens: number, completionTokens: number) => {
          if (streamAbortController.signal.aborted || res.writableEnded) return;
          const assistantMsg = db.addMessage(targetChat!.id, 'assistant', fullText, model.id, completionTokens);
          const usageRecord = db.recordUsage(user.id, targetChat!.id, model.id, promptTokens, completionTokens);

          const updatedUser = db.getUserById(user.id);
          const usageLimit = updatedUser?.usage_limit !== undefined ? updatedUser.usage_limit : 0;
          const usageStats = calculateUsageStats(usageLimit, updatedUser?.current_usage || 0);

          res.write(`data: ${JSON.stringify({
            type: 'done',
            assistantMessage: assistantMsg,
            usageRecord,
            usageStats
          })}\n\n`);
          res.end();
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
});

// ==========================================
// 5. Admin Panel Endpoints (Role Protected)
// ==========================================

app.get('/api/admin/stats', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const stats = db.getAdminStats();
  res.json(stats);
});

app.get('/api/admin/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { search, role, status } = req.query as { search?: string; role?: string; status?: string };
  const users = db.listUsers(search, role, status);
  const userListWithSubs = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    status: u.status,
    usage_limit: u.usage_limit,
    current_usage: u.current_usage,
    created_at: u.created_at,
    subscription: db.getSubscriptionByUserId(u.id) || null
  }));
  res.json(userListWithSubs);
});

app.put('/api/admin/users/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { status, role, usage_limit } = req.body;
  const updated = db.updateUser(req.params.id, {
    ...(status && { status }),
    ...(role && { role }),
    ...(usage_limit !== undefined && { usage_limit: parseInt(usage_limit, 10) })
  });
  if (!updated) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  res.json(updated);
});

app.delete('/api/admin/users/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (req.params.id === req.user!.id) {
    res.status(400).json({ error: 'Cannot delete own administrator account.' });
    return;
  }
  const deleted = db.deleteUser(req.params.id);
  res.json({ success: deleted });
});

app.post('/api/admin/users/:id/subscription', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { planId, days } = req.body;
  const user = db.getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const result = db.createOrRenewSubscription({
    userId: user.id,
    planId: planId === 'yearly' ? 'yearly' : 'monthly',
    paymentMethod: 'admin_grant',
    trxId: 'ADMIN_GRANT_' + Date.now()
  });

  if (days && parseInt(days, 10) > 0) {
    const customExpiry = new Date(Date.now() + parseInt(days, 10) * 86400 * 1000).toISOString();
    db.updateSubscription(result.subscription.id, { expires_at: customExpiry });
    result.subscription.expires_at = customExpiry;
  }

  res.json(result);
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

app.get('/api/admin/providers', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const providers = db.listProviders().map(sanitizeProvider);
  res.json(providers);
});

app.put('/api/admin/providers/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const updates = buildProviderUpdatePayload(req.body || {});
  const updated = db.updateProvider(req.params.id, updates);
  if (!updated) {
    res.status(404).json({ error: 'Provider not found.' });
    return;
  }
  res.json(sanitizeProvider(updated));
});

app.post('/api/admin/providers/:id/test', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const provider = db.getProviderById(req.params.id);
  if (!provider) {
    res.status(404).json({ error: 'Provider not found.' });
    return;
  }

  const candidateKey = normalizeApiKey(req.body?.api_key || provider.api_key);
  if (!candidateKey) {
    res.status(400).json({ error: 'Please enter and save an API key first.' });
    return;
  }

  try {
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

app.get('/api/admin/models', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const models = db.listModels(false);
  res.json(models);
});

app.put('/api/admin/models/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { is_enabled, is_default, badge, display_name, openrouter_model_id } = req.body;
  const trimmedName = typeof display_name === 'string' ? display_name.trim() : undefined;
  if (display_name !== undefined && !trimmedName) {
    res.status(400).json({ error: 'Model display name cannot be empty.' });
    return;
  }
  const updated = db.updateModel(req.params.id, {
    ...(is_enabled !== undefined && { is_enabled }),
    ...(is_default !== undefined && { is_default }),
    ...(badge !== undefined && { badge }),
    ...(trimmedName !== undefined && { display_name: trimmedName }),
    ...(openrouter_model_id !== undefined && { openrouter_model_id })
  });
  if (!updated) {
    res.status(404).json({ error: 'Model not found.' });
    return;
  }
  res.json(updated);
});

app.post('/api/admin/models/sync-openrouter-free', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const openrouter = db.getProviderBySlug('openrouter');
    const baseUrl = (openrouter?.base_url || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
    const resp = await fetch(`${baseUrl}/models`);
    if (!resp.ok) {
      res.status(502).json({ error: `Failed to fetch OpenRouter catalog (HTTP ${resp.status}).` });
      return;
    }
    const payload: any = await resp.json();
    const apiModels = Array.isArray(payload?.data) ? payload.data : [];
    const now = new Date().toISOString();
    const newFreeModels = buildNewFreeModelsFromOpenRouterApi(apiModels, db.listModels(false), now);
    const addedCount = db.addModels(newFreeModels);
    res.json({
      success: true,
      addedCount,
      models: db.listModels(false),
      message: addedCount > 0
        ? `Synced ${addedCount} new OpenRouter free model(s) (turned OFF by default).`
        : 'All live OpenRouter free models are already in your catalog.'
    });
  } catch (err: any) {
    res.status(500).json({ error: `OpenRouter sync failed: ${err.message}` });
  }
});

app.post('/api/admin/models/free/toggle-all', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const enabled = Boolean(req.body?.is_enabled);
  const updatedCount = db.bulkToggleFreeModels(enabled);
  res.json({
    success: true,
    updatedCount,
    is_enabled: enabled,
    models: db.listModels(false),
    message: `${updatedCount} OpenRouter free model(s) turned ${enabled ? 'ON' : 'OFF'} for Workspace.`
  });
});

app.get('/api/admin/settings', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const settings = db.getSettings();
  const openrouter = db.getProviderBySlug('openrouter');
  res.json({
    ...settings,
    openrouter_configured: Boolean(openrouter?.api_key),
    openrouter_key_masked: maskSecretKey(openrouter?.api_key),
    openrouter_base_url: openrouter?.base_url || 'https://openrouter.ai/api/v1',
    openrouter_enabled: openrouter ? openrouter.is_active : true
  });
});

app.put('/api/admin/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const {
    openrouter_api_key,
    openrouter_base_url,
    openrouter_enabled,
    openrouter_configured: _oc,
    openrouter_key_masked: _okm,
    ...settingsUpdates
  } = req.body || {};

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
      db.updateProvider('prov_openrouter', providerUpdates);
    }
  }

  const updated = db.updateSettings(settingsUpdates);
  const openrouter = db.getProviderBySlug('openrouter');
  res.json({
    ...updated,
    openrouter_configured: Boolean(openrouter?.api_key),
    openrouter_key_masked: maskSecretKey(openrouter?.api_key),
    openrouter_base_url: openrouter?.base_url || 'https://openrouter.ai/api/v1',
    openrouter_enabled: openrouter ? openrouter.is_active : true
  });
});

// Admin Payments Verification Endpoints
app.get('/api/admin/payments', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const payments = db.listAllPayments();
  res.json(payments);
});

// Helper to fire Meta Conversions API (CAPI) server-side Purchase event
async function sendMetaConversionsPurchase(payment: any, settings: any): Promise<boolean> {
  if (!settings.facebook_pixel_id || !settings.facebook_pixel_access_token || !settings.facebook_pixel_enabled) {
    return false;
  }

  try {
    const user = db.getUserById(payment.user_id);
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
    const result = db.approvePayment(id, req.user!.id);
    const settings = db.getSettings();

    // Trigger Meta Conversions API Purchase Event
    const pixelFired = await sendMetaConversionsPurchase(result.payment, settings);

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

app.post('/api/admin/payments/:id/reject', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const rejected = db.rejectPayment(id, req.user!.id, note);
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
    const settings = db.getSettings();
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

async function startServer() {
  const distPath = path.resolve(process.cwd(), 'dist');

  if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Bangla AI Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
