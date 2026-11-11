import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PLANS, calculateExpiryDate } from '../utils/billing.ts';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  usage_limit: number; // Tokens per billing cycle
  current_usage: number;
  firebase_uid?: string;
  avatar_url?: string;
  reset_token?: string | null;
  reset_token_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: 'monthly' | 'yearly';
  plan_name: string;
  amount: number;
  currency: 'BDT';
  status: 'active' | 'expired' | 'cancelled';
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  payment_method: string;
  trx_id: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id?: string;
  amount: number;
  currency: 'BDT';
  gateway: 'bkash' | 'nagad' | 'rocket' | 'sslcommerz';
  trx_id: string;
  sender_number: string;
  status: 'completed' | 'pending' | 'failed';
  gateway_response?: string;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  model_id: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_id: string;
  tokens_used: number;
  created_at: string;
}

export interface AiProvider {
  id: string;
  name: string;
  slug: string;
  api_key: string;
  base_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiModel {
  id: string;
  provider_id: string;
  model_name: string;
  display_name: string;
  description_en: string;
  badge: 'super_fast' | 'reasoning' | 'coding' | 'balanced';
  is_enabled: boolean;
  is_default: boolean;
  context_window: number;
  max_output_tokens: number;
  sort_order: number;
  created_at: string;
}

export interface UsageRecord {
  id: string;
  user_id: string;
  chat_id?: string;
  model_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  created_at: string;
}

export interface SystemSettings {
  global_usage_limit: number;
  default_monthly_price: number;
  default_yearly_price: number;
  support_email: string;
  support_phone: string;
  announcement?: string;
}

interface DatabaseData {
  users: User[];
  subscriptions: Subscription[];
  payments: Payment[];
  chats: Chat[];
  messages: Message[];
  ai_providers: AiProvider[];
  ai_models: AiModel[];
  usage_records: UsageRecord[];
  settings: SystemSettings;
}

// Password hashing utility using scrypt
export function hashPassword(password: string): string {
  const salt = 'bangla_ai_salt_2026';
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

class Database {
  private dataFile: string;
  private data: DatabaseData;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dataFile = path.resolve(dataDir, 'bangla_ai.json');
    this.data = this.loadOrSeed();
  }

  private save(): void {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save database to disk:', err);
    }
  }

  private loadOrSeed(): DatabaseData {
    if (fs.existsSync(this.dataFile)) {
      try {
        const raw = fs.readFileSync(this.dataFile, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure models and settings have English fields
        if (parsed.ai_models && parsed.ai_models[0]?.description_bn) {
          return this.createSeedData();
        }
        return parsed;
      } catch (err) {
        console.warn('Corrupted database file, reseeding initial data:', err);
      }
    }

    return this.createSeedData();
  }

  private createSeedData(): DatabaseData {
    const now = new Date().toISOString();
    const futureMonthly = calculateExpiryDate('monthly').toISOString();
    const futureYearly = calculateExpiryDate('yearly').toISOString();

    const adminId = 'usr_admin_001';
    const subscriberId = 'usr_sub_002';
    const unpaidId = 'usr_unpaid_003';

    const users: User[] = [
      {
        id: adminId,
        email: 'rakib504254@gmail.com',
        password_hash: '',
        name: 'Rakib (Owner & Admin)',
        phone: '+8801700000000',
        role: 'admin',
        status: 'active',
        usage_limit: 1000000,
        current_usage: 0,
        created_at: now,
        updated_at: now
      },
      {
        id: 'usr_admin_backup',
        email: 'admin@bangla.ai',
        password_hash: hashPassword('AdminPassword123!'),
        name: 'Super Admin',
        phone: '+8801711000000',
        role: 'admin',
        status: 'active',
        usage_limit: 1000000,
        current_usage: 1240,
        created_at: now,
        updated_at: now
      },
      {
        id: subscriberId,
        email: 'subscriber@bangla.ai',
        password_hash: hashPassword('UserPassword123!'),
        name: 'Tanvir Ahmed',
        phone: '+8801812345678',
        role: 'user',
        status: 'active',
        usage_limit: 50000,
        current_usage: 4850,
        created_at: now,
        updated_at: now
      },
      {
        id: unpaidId,
        email: 'unpaid@bangla.ai',
        password_hash: hashPassword('UserPassword123!'),
        name: 'Rakibul Hasan',
        phone: '+8801911223344',
        role: 'user',
        status: 'active',
        usage_limit: 50000,
        current_usage: 0,
        created_at: now,
        updated_at: now
      }
    ];

    const subscriptions: Subscription[] = [
      {
        id: 'sub_admin_001',
        user_id: adminId,
        plan_id: 'yearly',
        plan_name: 'Admin Enterprise Plan',
        amount: 9999,
        currency: 'BDT',
        status: 'active',
        started_at: now,
        expires_at: futureYearly,
        auto_renew: true,
        payment_method: 'system',
        trx_id: 'SYS_ADMIN_LIFETIME',
        created_at: now,
        updated_at: now
      },
      {
        id: 'sub_user_002',
        user_id: subscriberId,
        plan_id: 'monthly',
        plan_name: 'Monthly Plan (৳1,299)',
        amount: 1299,
        currency: 'BDT',
        status: 'active',
        started_at: now,
        expires_at: futureMonthly,
        auto_renew: true,
        payment_method: 'bkash',
        trx_id: 'BKB8792019X',
        created_at: now,
        updated_at: now
      }
    ];

    const payments: Payment[] = [
      {
        id: 'pay_001',
        user_id: subscriberId,
        subscription_id: 'sub_user_002',
        amount: 1299,
        currency: 'BDT',
        gateway: 'bkash',
        trx_id: 'BKB8792019X',
        sender_number: '01812345678',
        status: 'completed',
        created_at: now
      }
    ];

    const ai_providers: AiProvider[] = [
      {
        id: 'prov_gemini',
        name: 'Google Gemini',
        slug: 'gemini',
        api_key: process.env.GEMINI_API_KEY || '',
        base_url: 'https://generativelanguage.googleapis.com',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 'prov_openai',
        name: 'OpenAI',
        slug: 'openai',
        api_key: process.env.OPENAI_API_KEY || '',
        base_url: 'https://api.openai.com/v1',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 'prov_anthropic',
        name: 'Anthropic Claude',
        slug: 'anthropic',
        api_key: process.env.ANTHROPIC_API_KEY || '',
        base_url: 'https://api.anthropic.com/v1',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: 'prov_deepseek',
        name: 'DeepSeek AI',
        slug: 'deepseek',
        api_key: process.env.DEEPSEEK_API_KEY || '',
        base_url: 'https://api.deepseek.com/v1',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];

    const ai_models: AiModel[] = [
      {
        id: 'mod_gemini_2_5_flash',
        provider_id: 'prov_gemini',
        model_name: 'gemini-2.5-flash',
        display_name: 'Gemini 2.5 Flash',
        description_en: 'Ultra-low latency with exceptional context processing. Ideal for everyday writing and rapid query resolution.',
        badge: 'super_fast',
        is_enabled: true,
        is_default: true,
        context_window: 1000000,
        max_output_tokens: 8192,
        sort_order: 1,
        created_at: now
      },
      {
        id: 'mod_gpt_4o',
        provider_id: 'prov_openai',
        model_name: 'gpt-4o',
        display_name: 'OpenAI GPT-4o',
        description_en: 'Flagship multimodal intelligence. Excels at nuanced reasoning, creative synthesis, and full-stack coding.',
        badge: 'balanced',
        is_enabled: true,
        is_default: false,
        context_window: 128000,
        max_output_tokens: 4096,
        sort_order: 2,
        created_at: now
      },
      {
        id: 'mod_claude_3_5_sonnet',
        provider_id: 'prov_anthropic',
        model_name: 'claude-3-5-sonnet',
        display_name: 'Claude 3.5 Sonnet',
        description_en: 'Industry-leading software engineering and prose refinement. Unmatched code generation and architecture review.',
        badge: 'coding',
        is_enabled: true,
        is_default: false,
        context_window: 200000,
        max_output_tokens: 8192,
        sort_order: 3,
        created_at: now
      },
      {
        id: 'mod_deepseek_r1',
        provider_id: 'prov_deepseek',
        model_name: 'deepseek-r1',
        display_name: 'DeepSeek R1',
        description_en: 'Advanced chain-of-thought reasoning powerhouse. Specialized in mathematics, logic proofs, and complex algorithms.',
        badge: 'reasoning',
        is_enabled: true,
        is_default: false,
        context_window: 64000,
        max_output_tokens: 4096,
        sort_order: 4,
        created_at: now
      }
    ];

    const demoChatId = 'chat_demo_001';
    const chats: Chat[] = [
      {
        id: demoChatId,
        user_id: subscriberId,
        title: 'E-commerce Launch & Growth Strategy',
        model_id: 'mod_gemini_2_5_flash',
        pinned: true,
        created_at: now,
        updated_at: now
      }
    ];

    const messages: Message[] = [
      {
        id: 'msg_001',
        chat_id: demoChatId,
        role: 'user',
        content: 'What are the essential steps to launch a scalable e-commerce business in Bangladesh?',
        model_id: 'mod_gemini_2_5_flash',
        tokens_used: 120,
        created_at: now
      },
      {
        id: 'msg_002',
        chat_id: demoChatId,
        role: 'assistant',
        content: `Launching a successful, scalable e-commerce venture in Bangladesh requires a structured strategy across four core pillars:

### 1. Legal & Regulatory Compliance
* **Trade License:** Obtain from your respective City Corporation or Union Parishad.
* **e-TIN & BIN:** Register for tax identification and VAT compliance with the NBR.
* **DBID (Digital Business ID):** Mandatory registration from the Ministry of Commerce.

### 2. Payment Infrastructure
* **Mobile Financial Services (MFS):** Integrate direct merchant accounts with bKash and Nagad (covering >80% of digital transactions).
* **Payment Gateway Aggregators:** SSLCommerz or Shurjopay for Visa, Mastercard, and internet banking.

### 3. Last-Mile Logistics & Fulfillment
* Partner with dependable courier networks such as Pathao Courier, Steadfast, or RedX with automated API tracking.
* Set up a clear Reverse Logistics & Return Management SOP.

### 4. Digital Marketing & Customer Retention
* Run targeted Meta Ads with engaging video content and WhatsApp/Messenger chat conversion funnels.
* Offer reliable Cash on Delivery (COD) alongside frictionless MFS pre-payments.`,
        model_id: 'mod_gemini_2_5_flash',
        tokens_used: 350,
        created_at: now
      }
    ];

    const usage_records: UsageRecord[] = [
      {
        id: 'usg_001',
        user_id: subscriberId,
        chat_id: demoChatId,
        model_id: 'mod_gemini_2_5_flash',
        prompt_tokens: 120,
        completion_tokens: 350,
        total_tokens: 470,
        created_at: now
      }
    ];

    const settings: SystemSettings = {
      global_usage_limit: 50000,
      default_monthly_price: 1299,
      default_yearly_price: 9999,
      support_email: 'support@bangla.ai',
      support_phone: '+880 9612-000000',
      announcement: 'Welcome to Bangla AI — The Premier Unified Multi-Model AI Hub.'
    };

    const initialData: DatabaseData = {
      users,
      subscriptions,
      payments,
      chats,
      messages,
      ai_providers,
      ai_models,
      usage_records,
      settings
    };

    fs.writeFileSync(this.dataFile, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  // --- User Operations ---
  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByFirebaseUid(uid: string): User | undefined {
    return this.data.users.find(u => u.firebase_uid === uid);
  }

  public upsertGoogleUser(googleData: {
    email: string;
    name: string;
    uid: string;
    avatar_url?: string;
  }): User {
    const emailNormalized = googleData.email.toLowerCase().trim();
    let existing = this.data.users.find(
      u => u.firebase_uid === googleData.uid || u.email.toLowerCase() === emailNormalized
    );

    const isAdminUser = emailNormalized === 'rakib504254@gmail.com' || existing?.role === 'admin';

    if (existing) {
      existing.firebase_uid = googleData.uid;
      if (googleData.avatar_url) existing.avatar_url = googleData.avatar_url;
      if (googleData.name && (!existing.name || existing.name === 'User')) existing.name = googleData.name;
      if (isAdminUser) {
        existing.role = 'admin';
        existing.usage_limit = Math.max(existing.usage_limit, 1000000);
      }
      existing.updated_at = new Date().toISOString();
      this.save();
      return existing;
    }

    // Create new Google User
    const now = new Date().toISOString();
    const newUser: User = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      email: emailNormalized,
      password_hash: '', // Managed by Firebase Google OAuth
      name: googleData.name || emailNormalized.split('@')[0],
      phone: '',
      role: isAdminUser ? 'admin' : 'user',
      status: 'active',
      usage_limit: isAdminUser ? 1000000 : (this.data.settings.global_usage_limit || 50000),
      current_usage: 0,
      firebase_uid: googleData.uid,
      avatar_url: googleData.avatar_url || '',
      created_at: now,
      updated_at: now
    };

    this.data.users.push(newUser);

    // If admin, grant enterprise subscription automatically
    if (isAdminUser) {
      const futureYearly = calculateExpiryDate('yearly').toISOString();
      this.data.subscriptions.push({
        id: `sub_admin_${newUser.id}`,
        user_id: newUser.id,
        plan_id: 'yearly',
        plan_name: 'Admin Enterprise Plan',
        amount: 9999,
        currency: 'BDT',
        status: 'active',
        started_at: now,
        expires_at: futureYearly,
        auto_renew: true,
        payment_method: 'system',
        trx_id: `SYS_GOOGLE_ADMIN_${googleData.uid.slice(0, 8)}`,
        created_at: now,
        updated_at: now
      });
    }

    this.save();
    return newUser;
  }

  public createUser(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: 'user' | 'admin';
  }): User {
    const now = new Date().toISOString();
    const newUser: User = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      email: userData.email.toLowerCase(),
      password_hash: hashPassword(userData.password),
      name: userData.name,
      phone: userData.phone || '',
      role: userData.role || 'user',
      status: 'active',
      usage_limit: this.data.settings.global_usage_limit || 50000,
      current_usage: 0,
      created_at: now,
      updated_at: now
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.getUserById(id);
    if (!user) return undefined;

    Object.assign(user, updates, { updated_at: new Date().toISOString() });
    this.save();
    return user;
  }

  public deleteUser(id: string): boolean {
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    this.data.subscriptions = this.data.subscriptions.filter(s => s.user_id !== id);
    this.data.chats = this.data.chats.filter(c => c.user_id !== id);
    this.save();
    return this.data.users.length < initialLen;
  }

  public listUsers(search?: string, role?: string, status?: string): User[] {
    return this.data.users.filter(u => {
      if (role && u.role !== role) return false;
      if (status && u.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q);
      }
      return true;
    });
  }

  // --- Subscriptions ---
  public getSubscriptionByUserId(userId: string): Subscription | undefined {
    return this.data.subscriptions
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  }

  public createOrRenewSubscription(params: {
    userId: string;
    planId: 'monthly' | 'yearly';
    paymentMethod: string;
    trxId: string;
    senderNumber?: string;
  }): { subscription: Subscription; payment: Payment } {
    const plan = PLANS[params.planId];
    const user = this.getUserById(params.userId);
    const existing = this.getSubscriptionByUserId(params.userId);

    const now = new Date().toISOString();
    const expiresAt = calculateExpiryDate(
      params.planId,
      existing && existing.status === 'active' ? existing.expires_at : null
    ).toISOString();

    const subId = `sub_${crypto.randomUUID().slice(0, 8)}`;
    const newSub: Subscription = {
      id: subId,
      user_id: params.userId,
      plan_id: params.planId,
      plan_name: plan.name,
      amount: plan.priceBDT,
      currency: 'BDT',
      status: 'active',
      started_at: now,
      expires_at: expiresAt,
      auto_renew: true,
      payment_method: params.paymentMethod,
      trx_id: params.trxId,
      created_at: now,
      updated_at: now
    };

    this.data.subscriptions = this.data.subscriptions.filter(s => s.user_id !== params.userId);
    this.data.subscriptions.push(newSub);

    const paymentId = `pay_${crypto.randomUUID().slice(0, 8)}`;
    const newPayment: Payment = {
      id: paymentId,
      user_id: params.userId,
      subscription_id: subId,
      amount: plan.priceBDT,
      currency: 'BDT',
      gateway: params.paymentMethod as any,
      trx_id: params.trxId,
      sender_number: params.senderNumber || user?.phone || '',
      status: 'completed',
      created_at: now
    };
    this.data.payments.push(newPayment);

    if (user) {
      user.current_usage = 0;
      if (params.planId === 'yearly') {
        user.usage_limit = 750000;
      } else {
        user.usage_limit = 50000;
      }
    }

    this.save();
    return { subscription: newSub, payment: newPayment };
  }

  public updateSubscription(id: string, updates: Partial<Subscription>): Subscription | undefined {
    const sub = this.data.subscriptions.find(s => s.id === id);
    if (!sub) return undefined;
    Object.assign(sub, updates, { updated_at: new Date().toISOString() });
    this.save();
    return sub;
  }

  public listPayments(userId?: string): Payment[] {
    if (userId) {
      return this.data.payments.filter(p => p.user_id === userId);
    }
    return this.data.payments;
  }

  // --- Chats & Messages ---
  public listChats(userId: string): Chat[] {
    return this.data.chats
      .filter(c => c.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  public getChat(id: string, userId: string): Chat | undefined {
    return this.data.chats.find(c => c.id === id && c.user_id === userId);
  }

  public createChat(userId: string, title: string, modelId: string): Chat {
    const now = new Date().toISOString();
    const chat: Chat = {
      id: `chat_${crypto.randomUUID().slice(0, 8)}`,
      user_id: userId,
      title: title || 'New Chat',
      model_id: modelId,
      pinned: false,
      created_at: now,
      updated_at: now
    };
    this.data.chats.unshift(chat);
    this.save();
    return chat;
  }

  public updateChat(id: string, userId: string, updates: Partial<Chat>): Chat | undefined {
    const chat = this.getChat(id, userId);
    if (!chat) return undefined;
    Object.assign(chat, updates, { updated_at: new Date().toISOString() });
    this.save();
    return chat;
  }

  public deleteChat(id: string, userId: string): boolean {
    const chat = this.getChat(id, userId);
    if (!chat) return false;
    this.data.chats = this.data.chats.filter(c => c.id !== id);
    this.data.messages = this.data.messages.filter(m => m.chat_id !== id);
    this.save();
    return true;
  }

  public getMessages(chatId: string): Message[] {
    return this.data.messages
      .filter(m => m.chat_id === chatId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  public addMessage(chatId: string, role: 'user' | 'assistant' | 'system', content: string, modelId: string, tokensUsed: number = 0): Message {
    const now = new Date().toISOString();
    const msg: Message = {
      id: `msg_${crypto.randomUUID().slice(0, 8)}`,
      chat_id: chatId,
      role,
      content,
      model_id: modelId,
      tokens_used: tokensUsed,
      created_at: now
    };
    this.data.messages.push(msg);

    const chat = this.data.chats.find(c => c.id === chatId);
    if (chat) {
      chat.updated_at = now;
      if ((chat.title === 'New Chat' || chat.title === 'নতুন চ্যাট') && role === 'user') {
        chat.title = content.slice(0, 36) + (content.length > 36 ? '...' : '');
      }
    }

    this.save();
    return msg;
  }

  // --- AI Providers & Models ---
  public listProviders(): AiProvider[] {
    return this.data.ai_providers;
  }

  public getProviderById(id: string): AiProvider | undefined {
    return this.data.ai_providers.find(p => p.id === id);
  }

  public updateProvider(id: string, updates: Partial<AiProvider>): AiProvider | undefined {
    const provider = this.getProviderById(id);
    if (!provider) return undefined;
    Object.assign(provider, updates, { updated_at: new Date().toISOString() });
    this.save();
    return provider;
  }

  public listModels(enabledOnly: boolean = false): AiModel[] {
    let models = this.data.ai_models;
    if (enabledOnly) {
      models = models.filter(m => m.is_enabled);
    }
    return models.sort((a, b) => a.sort_order - b.sort_order);
  }

  public getModelById(id: string): AiModel | undefined {
    return this.data.ai_models.find(m => m.id === id);
  }

  public updateModel(id: string, updates: Partial<AiModel>): AiModel | undefined {
    const model = this.getModelById(id);
    if (!model) return undefined;
    Object.assign(model, updates);
    this.save();
    return model;
  }

  // --- Usage Tracking ---
  public recordUsage(userId: string, chatId: string | undefined, modelId: string, promptTokens: number, completionTokens: number): UsageRecord {
    const now = new Date().toISOString();
    const totalTokens = promptTokens + completionTokens;
    const record: UsageRecord = {
      id: `usg_${crypto.randomUUID().slice(0, 8)}`,
      user_id: userId,
      chat_id: chatId,
      model_id: modelId,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      created_at: now
    };
    this.data.usage_records.push(record);

    const user = this.getUserById(userId);
    if (user) {
      user.current_usage = (user.current_usage || 0) + totalTokens;
      user.updated_at = now;
    }

    this.save();
    return record;
  }

  // --- Settings & Admin Stats ---
  public getSettings(): SystemSettings {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    Object.assign(this.data.settings, updates);
    this.save();
    return this.data.settings;
  }

  public getAdminStats() {
    const totalUsers = this.data.users.length;
    const now = Date.now();
    const activeSubscribers = this.data.subscriptions.filter(s => s.status === 'active' && new Date(s.expires_at).getTime() > now).length;
    const totalRevenue = this.data.payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
    const totalTokensUsed = this.data.usage_records.reduce((sum, r) => sum + r.total_tokens, 0);

    const modelUsageMap: Record<string, number> = {};
    for (const r of this.data.usage_records) {
      modelUsageMap[r.model_id] = (modelUsageMap[r.model_id] || 0) + r.total_tokens;
    }

    return {
      totalUsers,
      activeSubscribers,
      totalRevenue,
      totalTokensUsed,
      modelUsageMap,
      totalChats: this.data.chats.length,
      totalMessages: this.data.messages.length
    };
  }
}

export const db = new Database();
