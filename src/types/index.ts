export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  usage_limit: number;
  current_usage: number;
  firebase_uid?: string;
  avatar_url?: string;
  created_at?: string;
  subscription?: Subscription | null;
  isSubscribed: boolean;
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
}

export interface Payment {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  subscription_id?: string;
  plan_id?: 'monthly' | 'yearly';
  plan_name?: string;
  amount: number;
  currency: 'BDT';
  gateway: 'bkash' | 'nagad' | 'rocket';
  trx_id: string;
  sender_number: string;
  phone?: string;
  status: 'completed' | 'pending' | 'rejected';
  admin_note?: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
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

export interface AiModel {
  id: string;
  provider_id: string;
  model_name: string;
  display_name: string;
  description_en: string;
  badge: 'super_fast' | 'reasoning' | 'coding' | 'balanced' | 'max' | 'high' | 'xhigh';
  is_enabled: boolean;
  is_default: boolean;
  context_window: number;
  max_output_tokens: number;
  sort_order: number;
  openrouter_model_id?: string;
}

export interface AiProvider {
  id: string;
  name: string;
  slug: string;
  api_key_masked?: string;
  has_api_key?: boolean;
  base_url?: string;
  is_active: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeSubscribers: number;
  totalRevenue: number;
  totalTokensUsed: number;
  modelUsageMap: Record<string, number>;
  totalChats: number;
  totalMessages: number;
  pendingPaymentsCount?: number;
}

export interface UsageStats {
  limit: number;
  used: number;
  remaining: number;
  percentage: number;
}

export interface PublicSettings {
  bkash_number: string;
  nagad_number: string;
  rocket_number: string;
  support_phone?: string;
  support_email?: string;
  facebook_pixel_id?: string;
  facebook_pixel_enabled?: boolean;
  facebook_page_url?: string;
}
