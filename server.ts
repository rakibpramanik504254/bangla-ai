import express, { Request, Response } from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import { db, User, verifyPassword, hashPassword } from './src/db/database.ts';
import { authenticate, requireAdmin, generateToken, AuthenticatedRequest } from './src/server/auth.ts';
import { AiService } from './src/server/ai-service.ts';
import { isSubscriptionActive, calculateUsageStats, PLANS } from './src/utils/billing.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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
  const usageStats = calculateUsageStats(user.usage_limit || 50000, user.current_usage || 0);

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

app.post('/api/subscription/checkout', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId, paymentMethod, trxId, senderNumber } = req.body;
    if (!planId || !paymentMethod || !trxId) {
      res.status(400).json({ error: 'Plan, payment gateway, and Transaction ID (TrxID) are required.' });
      return;
    }

    if (planId !== 'monthly' && planId !== 'yearly') {
      res.status(400).json({ error: 'Invalid subscription plan specified.' });
      return;
    }

    const result = db.createOrRenewSubscription({
      userId: req.user!.id,
      planId,
      paymentMethod,
      trxId: trxId.trim(),
      senderNumber: senderNumber || req.user!.phone
    });

    res.json({
      message: 'Subscription successfully activated. Welcome to Bangla AI!',
      subscription: result.subscription,
      payment: result.payment
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Payment processing error: ' + err.message });
  }
});

app.get('/api/payments/history', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const payments = db.listPayments(req.user!.id);
  res.json(payments);
});

// ==========================================
// 3. AI Models & Public Info Endpoints
// ==========================================

app.get('/api/models', (_req: Request, res: Response) => {
  const models = db.listModels(true);
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
  const { chatId, message, modelId } = req.body;

  if (!message || !message.trim()) {
    res.status(400).json({ error: 'Message content cannot be empty.' });
    return;
  }

  let targetChat = chatId ? db.getChat(chatId, user.id) : null;
  if (!targetChat) {
    targetChat = db.createChat(user.id, message.slice(0, 32), modelId || 'mod_gemini_2_5_flash');
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
  const userMsg = db.addMessage(targetChat.id, 'user', message.trim(), model.id);

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial metadata
  res.write(`data: ${JSON.stringify({ type: 'start', chatId: targetChat.id, userMessage: userMsg })}\n\n`);

  // Prepare history
  const previousMessages = db.getMessages(targetChat.id);
  const formattedHistory = previousMessages.map(m => ({
    role: m.role,
    content: m.content
  }));

  try {
    await AiService.streamCompletion(user, model, provider, formattedHistory, {
      onChunk: (chunk: string) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
      },
      onDone: (fullText: string, promptTokens: number, completionTokens: number) => {
        const assistantMsg = db.addMessage(targetChat!.id, 'assistant', fullText, model.id, completionTokens);
        const usageRecord = db.recordUsage(user.id, targetChat!.id, model.id, promptTokens, completionTokens);

        const updatedUser = db.getUserById(user.id);
        const usageStats = calculateUsageStats(updatedUser?.usage_limit || 50000, updatedUser?.current_usage || 0);

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
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'এআই সার্ভারে সমস্যা হয়েছে: ' + err.message })}\n\n`);
        res.end();
      }
    });
  } catch (err: any) {
    console.error('Stream completion failed:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
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

app.get('/api/admin/providers', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const providers = db.listProviders().map(p => ({
    ...p,
    api_key_masked: p.api_key ? (p.api_key.slice(0, 7) + '...' + p.api_key.slice(-4)) : ''
  }));
  res.json(providers);
});

app.put('/api/admin/providers/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, api_key, base_url, is_active } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (base_url !== undefined) updates.base_url = base_url;
  if (is_active !== undefined) updates.is_active = is_active;
  if (api_key !== undefined && api_key !== '') {
    updates.api_key = api_key;
  }

  const updated = db.updateProvider(req.params.id, updates);
  if (!updated) {
    res.status(404).json({ error: 'Provider not found.' });
    return;
  }
  res.json(updated);
});

app.get('/api/admin/models', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const models = db.listModels(false);
  res.json(models);
});

app.put('/api/admin/models/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { is_enabled, is_default, badge, display_name } = req.body;
  const updated = db.updateModel(req.params.id, {
    ...(is_enabled !== undefined && { is_enabled }),
    ...(is_default !== undefined && { is_default }),
    ...(badge !== undefined && { badge }),
    ...(display_name !== undefined && { display_name })
  });
  if (!updated) {
    res.status(404).json({ error: 'Model not found.' });
    return;
  }
  res.json(updated);
});

app.get('/api/admin/settings', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json(db.getSettings());
});

app.put('/api/admin/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.updateSettings(req.body);
  res.json(updated);
});

// ==========================================
// 6. Vite Middleware Integration
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
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
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Bangla AI Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
