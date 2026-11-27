import crypto from 'node:crypto';
import { isSyntheticPhoneEmail } from './expressCheckout.ts';

export const DEFAULT_TELEGRAM_ADMIN_CHAT_ID = '6060470915';
export const DEFAULT_TELEGRAM_WEBHOOK_URL = 'https://bangla-ai.pro/api/telegram/webhook';
export const MOTION_STUDIO_ACTION_URL = 'https://motionstudio.design/api/telegram/action';

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const TELEGRAM_REQUEST_TIMEOUT_MS = 10_000;
const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

export interface TelegramConfig {
  botToken: string;
  adminChatId: string;
  webhookSecret: string;
  webhookUrl: string;
}

export interface TelegramOrderPayload {
  orderId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  planName: string;
  amount: number;
  gateway: string;
  senderNumber: string;
  trxId: string;
}

export type ParsedTelegramCallback =
  | { target: 'bangla_ai'; action: 'approve' | 'reject'; orderId: string }
  | { target: 'motion_studio'; callbackData: string }
  | { target: 'unknown' };

export function getTelegramConfig(env: NodeJS.ProcessEnv = process.env): TelegramConfig {
  return {
    botToken: (env.TELEGRAM_BOT_TOKEN || '').trim(),
    adminChatId: (env.TELEGRAM_ADMIN_CHAT_ID || DEFAULT_TELEGRAM_ADMIN_CHAT_ID).trim(),
    webhookSecret: (env.TELEGRAM_WEBHOOK_SECRET || '').trim(),
    webhookUrl: (env.TELEGRAM_WEBHOOK_URL || DEFAULT_TELEGRAM_WEBHOOK_URL).trim()
  };
}

/**
 * Constant-time secret comparison using SHA-256 digests so lengths never leak.
 */
export function timingSafeSecretMatch(
  provided: string | undefined | null,
  expected: string | undefined | null
): boolean {
  const a = typeof provided === 'string' ? provided.trim() : '';
  const b = typeof expected === 'string' ? expected.trim() : '';
  if (!a || !b) return false;
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Verifies an incoming Telegram webhook callback came from the configured admin chat
 * and carries the registered X-Telegram-Bot-Api-Secret-Token header.
 */
export function verifyTelegramWebhookAuthorization(params: {
  chatId?: string | number | null;
  fromId?: string | number | null;
  secretTokenHeader?: string | null;
  config: TelegramConfig;
}): { authorized: boolean; reason?: string } {
  const { chatId, fromId, secretTokenHeader, config } = params;

  if (!config.webhookSecret) {
    return { authorized: false, reason: 'Webhook secret is not configured.' };
  }
  if (!timingSafeSecretMatch(secretTokenHeader, config.webhookSecret)) {
    return { authorized: false, reason: 'Invalid webhook secret token.' };
  }
  if (!config.adminChatId) {
    return { authorized: false, reason: 'Admin chat ID is not configured.' };
  }

  const normalizedChatId = chatId !== undefined && chatId !== null ? String(chatId).trim() : '';
  if (normalizedChatId !== config.adminChatId) {
    return { authorized: false, reason: 'Unauthorized chat ID.' };
  }

  if (fromId !== undefined && fromId !== null) {
    const normalizedFromId = String(fromId).trim();
    if (normalizedFromId && normalizedFromId !== config.adminChatId) {
      return { authorized: false, reason: 'Unauthorized sender ID.' };
    }
  }

  return { authorized: true };
}

export function formatGatewayLabel(gateway: string): string {
  const normalized = (gateway || '').trim().toLowerCase();
  if (normalized === 'bkash') return 'bKash';
  if (normalized === 'nagad') return 'Nagad';
  if (normalized === 'rocket') return 'Rocket';
  return gateway ? gateway.trim() : 'Manual MFS';
}

export function formatTelegramNewOrderMessage(order: TelegramOrderPayload): string {
  const cleanName = (order.customerName || '').trim() || 'Customer';
  const rawEmail = (order.customerEmail || '').trim();
  const displayEmail = rawEmail && !isSyntheticPhoneEmail(rawEmail) ? rawEmail : 'Not provided';
  const formattedAmount = Number.isFinite(Number(order.amount))
    ? `৳${Number(order.amount).toLocaleString('en-US')} BDT`
    : String(order.amount);

  return [
    '🟢 [Bangla AI] New Order',
    '',
    `Customer: ${cleanName}`,
    `Email: ${displayEmail}`,
    `Plan: ${order.planName}`,
    `Amount: ${formattedAmount}`,
    `Method: ${formatGatewayLabel(order.gateway)}`,
    `Sender: ${order.senderNumber}`,
    `TrxID: ${order.trxId}`
  ].join('\n');
}

export function buildOrderInlineKeyboard(orderId: string): {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
} {
  return {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `bangla_ai:approve:${orderId}` },
        { text: '❌ Reject', callback_data: `bangla_ai:reject:${orderId}` }
      ]
    ]
  };
}

export function parseTelegramCallbackData(rawCallbackData: unknown): ParsedTelegramCallback {
  if (typeof rawCallbackData !== 'string') {
    return { target: 'unknown' };
  }
  const data = rawCallbackData.trim();
  if (!data || data.length > 128) {
    return { target: 'unknown' };
  }

  const banglaMatch = /^bangla_ai:(approve|reject):([a-zA-Z0-9_-]{1,64})$/.exec(data);
  if (banglaMatch) {
    return {
      target: 'bangla_ai',
      action: banglaMatch[1] as 'approve' | 'reject',
      orderId: banglaMatch[2]
    };
  }

  if (data.startsWith('motion_studio:') && data.length > 'motion_studio:'.length) {
    return {
      target: 'motion_studio',
      callbackData: data
    };
  }

  return { target: 'unknown' };
}

export function appendTelegramStatusLine(originalText: string | undefined, statusLine: string): string {
  const base = (originalText || '').trimEnd();
  const cleanStatus = statusLine.trim();
  if (!cleanStatus) return base;
  if (base.endsWith(cleanStatus)) return base;

  const combined = base ? `${base}\n\n${cleanStatus}` : cleanStatus;
  if (combined.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
    return combined;
  }
  const allowedBaseLen = Math.max(0, TELEGRAM_MAX_MESSAGE_LENGTH - cleanStatus.length - 5);
  return `${base.slice(0, allowedBaseLen)}...\n\n${cleanStatus}`;
}

async function callTelegramBotApi(
  method: string,
  payload: Record<string, unknown>,
  config: TelegramConfig
): Promise<{ ok: boolean; status: number; data: any }> {
  if (!config.botToken) {
    return {
      ok: false,
      status: 0,
      data: { ok: false, description: 'TELEGRAM_BOT_TOKEN is not configured.' }
    };
  }

  const url = `${TELEGRAM_API_BASE}/bot${encodeURIComponent(config.botToken)}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS)
  });

  const data = await response.json().catch(() => ({ ok: false, description: 'Non-JSON Telegram API response' }));
  return {
    ok: response.ok && Boolean(data?.ok),
    status: response.status,
    data
  };
}

export async function sendTelegramOrderNotification(
  order: TelegramOrderPayload,
  config: TelegramConfig = getTelegramConfig()
): Promise<boolean> {
  if (!config.botToken || !config.adminChatId) {
    return false;
  }

  try {
    const result = await callTelegramBotApi(
      'sendMessage',
      {
        chat_id: config.adminChatId,
        text: formatTelegramNewOrderMessage(order),
        reply_markup: buildOrderInlineKeyboard(order.orderId)
      },
      config
    );
    if (!result.ok) {
      console.error('[Telegram] Failed to send order notification:', result.status, result.data?.description || '');
    }
    return result.ok;
  } catch (err: any) {
    console.error('[Telegram] Order notification error:', err?.message || err);
    return false;
  }
}

export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text?: string,
  config: TelegramConfig = getTelegramConfig()
): Promise<boolean> {
  if (!config.botToken || !callbackQueryId) return false;
  try {
    const result = await callTelegramBotApi(
      'answerCallbackQuery',
      {
        callback_query_id: callbackQueryId,
        ...(text ? { text: text.slice(0, 180) } : {})
      },
      config
    );
    return result.ok;
  } catch (err: any) {
    console.error('[Telegram] answerCallbackQuery error:', err?.message || err);
    return false;
  }
}

export async function editTelegramMessageText(params: {
  chatId: string | number;
  messageId: number;
  text: string;
  config?: TelegramConfig;
}): Promise<boolean> {
  const config = params.config || getTelegramConfig();
  if (!config.botToken) return false;
  try {
    const result = await callTelegramBotApi(
      'editMessageText',
      {
        chat_id: params.chatId,
        message_id: params.messageId,
        text: params.text,
        reply_markup: { inline_keyboard: [] }
      },
      config
    );
    if (!result.ok) {
      console.error('[Telegram] editMessageText failed:', result.status, result.data?.description || '');
    }
    return result.ok;
  } catch (err: any) {
    console.error('[Telegram] editMessageText error:', err?.message || err);
    return false;
  }
}

export async function forwardMotionStudioCallbackAction(
  callbackData: string,
  config: TelegramConfig = getTelegramConfig()
): Promise<{ ok: boolean; statusText: string }> {
  if (!config.webhookSecret) {
    return { ok: false, statusText: '⚠️ Action failed: webhook secret not configured' };
  }

  try {
    const response = await fetch(MOTION_STUDIO_ACTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': config.webhookSecret
      },
      body: JSON.stringify({ callback_data: callbackData }),
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS)
    });

    const data = await response.json().catch(() => null);
    const returnedStatus =
      typeof data?.statusText === 'string' && data.statusText.trim()
        ? data.statusText.trim()
        : response.ok
        ? '✅ Processed'
        : `⚠️ Action failed (${response.status})`;

    return { ok: response.ok, statusText: returnedStatus };
  } catch (err: any) {
    console.error('[Telegram] Motion Studio forward error:', err?.message || err);
    return { ok: false, statusText: '⚠️ Failed to reach Motion Studio' };
  }
}

export async function registerTelegramWebhook(
  config: TelegramConfig = getTelegramConfig()
): Promise<{ ok: boolean; status: number; data: any }> {
  return callTelegramBotApi(
    'setWebhook',
    {
      url: config.webhookUrl,
      secret_token: config.webhookSecret,
      allowed_updates: ['callback_query']
    },
    config
  );
}
