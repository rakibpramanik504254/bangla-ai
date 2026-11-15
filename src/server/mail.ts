export interface MailConfigInput {
  mail_enabled?: boolean;
  mail_webhook_url?: string;
  mail_webhook_secret?: string;
  mail_notify_admin_on_payment?: boolean;
  support_email?: string;
}

export interface ResolvedMailConfig {
  enabled: boolean;
  configured: boolean;
  webhookUrl: string;
  secret: string;
  notifyAdminOnPayment: boolean;
  supportEmail: string;
  source: 'admin_settings' | 'env' | 'none';
}

export interface EmailMessagePayload {
  to: string;
  subject: string;
  text: string;
  html: string;
  senderName?: string;
  replyTo?: string;
}

export interface SendMailResult {
  ok: boolean;
  skipped?: boolean;
  sentTo?: string;
  error?: string;
}

export const DEFAULT_SENDER_NAME = 'Bangla AI';
export const DEFAULT_SUPPORT_EMAIL = 'ourbangla.ai@gmail.com';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `const SHARED_SECRET = 'PASTE_OPTIONAL_SECRET_OR_LEAVE_AS_IS';
const SENDER_NAME = 'Bangla AI';

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var data = JSON.parse(raw);

    if (SHARED_SECRET && SHARED_SECRET !== 'PASTE_OPTIONAL_SECRET_OR_LEAVE_AS_IS') {
      if (data.secret !== SHARED_SECRET) {
        return jsonResponse({ ok: false, error: 'Unauthorized webhook secret' });
      }
    }

    if (!data.to || !data.subject) {
      return jsonResponse({ ok: false, error: 'Missing required recipient or subject' });
    }

    var options = {
      name: data.senderName || SENDER_NAME,
      htmlBody: data.html || undefined,
      replyTo: data.replyTo || undefined
    };

    MailApp.sendEmail(String(data.to).trim(), String(data.subject), String(data.text || ''), options);
    return jsonResponse({ ok: true, sentTo: String(data.to).trim() });
  } catch (err) {
    return jsonResponse({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: 'Bangla AI Mail Webhook Active' });
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export function normalizeMailWebhookUrl(raw?: string | null): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

export function validateAppsScriptWebhookUrl(raw?: string | null): { valid: boolean; url: string; error?: string } {
  const trimmed = normalizeMailWebhookUrl(raw);
  if (!trimmed) {
    return { valid: false, url: '', error: 'Google Apps Script Web App URL is required.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, url: trimmed, error: 'Please enter a valid HTTPS URL.' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, url: trimmed, error: 'Webhook URL must use HTTPS.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== 'script.google.com' && host !== 'script.googleusercontent.com') {
    return {
      valid: false,
      url: trimmed,
      error: 'URL must be a Google Apps Script endpoint (https://script.google.com/macros/s/.../exec).'
    };
  }

  if (parsed.pathname.endsWith('/edit')) {
    return {
      valid: false,
      url: trimmed,
      error: 'You pasted the script editor (/edit) link. Please deploy as a Web App and paste the /exec URL.'
    };
  }

  return { valid: true, url: trimmed };
}

export function maskMailWebhookUrl(raw?: string | null): string {
  const url = normalizeMailWebhookUrl(raw);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^(.*\/s\/)([^/]+)(\/.*)$/);
    if (match) {
      const id = match[2];
      const maskedId = id.length > 10 ? `${id.slice(0, 6)}••••••${id.slice(-4)}` : '••••••••';
      return `${parsed.origin}${match[1]}${maskedId}${match[3]}`;
    }
    return `${parsed.origin}/••••••`;
  } catch {
    return 'https://script.google.com/••••••';
  }
}

export function resolveMailRuntimeConfig(
  settings: MailConfigInput | null | undefined,
  env: Record<string, string | undefined> = process.env
): ResolvedMailConfig {
  const dbUrl = normalizeMailWebhookUrl(settings?.mail_webhook_url);
  const envUrl = normalizeMailWebhookUrl(env.GOOGLE_APPS_SCRIPT_URL);
  const webhookUrl = dbUrl || envUrl;

  const dbSecret = typeof settings?.mail_webhook_secret === 'string' ? settings.mail_webhook_secret.trim() : '';
  const envSecret = typeof env.MAIL_WEBHOOK_SECRET === 'string' ? env.MAIL_WEBHOOK_SECRET.trim() : '';
  const secret = dbSecret || envSecret;

  const supportEmail =
    (typeof settings?.support_email === 'string' && settings.support_email.trim()) || DEFAULT_SUPPORT_EMAIL;

  const source: ResolvedMailConfig['source'] = dbUrl ? 'admin_settings' : envUrl ? 'env' : 'none';
  const enabled = settings?.mail_enabled !== false;
  const configured = Boolean(webhookUrl);
  const notifyAdminOnPayment = settings?.mail_notify_admin_on_payment !== false;

  return {
    enabled,
    configured,
    webhookUrl,
    secret,
    notifyAdminOnPayment,
    supportEmail,
    source
  };
}

export function escapeHtml(input: string): string {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapEmailLayout(title: string, badge: string, bodyHtml: string, supportEmail: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:24px 12px;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <tr>
      <td style="background:#131314;padding:22px 26px;">
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#34d399;font-weight:700;margin-bottom:6px;">${escapeHtml(badge)}</div>
        <div style="font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">${escapeHtml(title)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:26px;font-size:14px;line-height:1.65;color:#1f2937;">
        ${bodyHtml}
      </td>
    </tr>
    <tr>
      <td style="padding:18px 26px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#6b7280;">
        <strong style="color:#111827;">Bangla AI</strong> &middot; Banani Commercial Area, Dhaka-1213, Bangladesh<br/>
        Website: <a href="https://bangla-ai.pro" style="color:#059669;text-decoration:none;">bangla-ai.pro</a> &middot;
        Support: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#059669;text-decoration:none;">${escapeHtml(supportEmail)}</a>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildPasswordResetOtpEmail(params: {
  to: string;
  name?: string;
  otp: string;
  expiresInMinutes?: number;
  supportEmail?: string;
}): EmailMessagePayload {
  const supportEmail = params.supportEmail || DEFAULT_SUPPORT_EMAIL;
  const expires = params.expiresInMinutes ?? 15;
  const displayName = params.name?.trim() || 'there';

  const html = wrapEmailLayout(
    'Password Reset Verification Code',
    'Bangla AI Security',
    `<p style="margin:0 0 14px;">Hello ${escapeHtml(displayName)},</p>
     <p style="margin:0 0 16px;">We received a request to reset your Bangla AI account password. Enter the verification code below to continue:</p>
     <div style="margin:18px 0;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;text-align:center;">
       <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#047857;font-weight:700;margin-bottom:4px;">Your Verification Code</div>
       <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:22px;font-weight:700;letter-spacing:0.06em;color:#065f46;">${escapeHtml(params.otp)}</div>
     </div>
     <p style="margin:0 0 10px;">This code will expire in <strong>${expires} minutes</strong>.</p>
     <p style="margin:0;color:#6b7280;font-size:13px;">If you did not request a password reset, you can safely ignore this email.</p>`,
    supportEmail
  );

  return {
    to: params.to.trim(),
    subject: 'Bangla AI — Password Reset Verification Code',
    senderName: DEFAULT_SENDER_NAME,
    replyTo: supportEmail,
    text: `Hello ${displayName},\n\nYour Bangla AI password reset code is: ${params.otp}\n\nThis code expires in ${expires} minutes.\nIf you did not request this, please ignore this email.\n\nBangla AI Support (${supportEmail})`,
    html
  };
}

export function buildWelcomeEmail(params: {
  to: string;
  name: string;
  usageLimit?: number;
  supportEmail?: string;
}): EmailMessagePayload {
  const supportEmail = params.supportEmail || DEFAULT_SUPPORT_EMAIL;
  const limitLabel = (params.usageLimit || 10000).toLocaleString('en-US');

  const html = wrapEmailLayout(
    'Welcome to Bangla AI',
    'Account Ready',
    `<p style="margin:0 0 14px;">Hello ${escapeHtml(params.name)},</p>
     <p style="margin:0 0 14px;">Welcome to <strong>Bangla AI</strong>! Your unified workspace is now active with top global AI models including Gemini, Claude, GPT, DeepSeek, Grok, and AI Image Generation.</p>
     <div style="margin:16px 0;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
       <div><strong>Account Email:</strong> ${escapeHtml(params.to)}</div>
       <div><strong>Starter Token Quota:</strong> ${escapeHtml(limitLabel)} tokens</div>
     </div>
     <p style="margin:14px 0 0;">Start chatting anytime at <a href="https://bangla-ai.pro" style="color:#059669;font-weight:600;text-decoration:none;">bangla-ai.pro</a>.</p>`,
    supportEmail
  );

  return {
    to: params.to.trim(),
    subject: 'Welcome to Bangla AI — Your Account is Ready!',
    senderName: DEFAULT_SENDER_NAME,
    replyTo: supportEmail,
    text: `Hello ${params.name},\n\nWelcome to Bangla AI! Your account (${params.to}) is now active with ${limitLabel} starter tokens.\n\nVisit https://bangla-ai.pro to get started.\n\nBangla AI Support (${supportEmail})`,
    html
  };
}

export function buildPaymentSubmittedUserEmail(params: {
  to: string;
  name: string;
  planName: string;
  amountBdt: number;
  gateway: string;
  trxId: string;
  senderNumber: string;
  supportEmail?: string;
}): EmailMessagePayload {
  const supportEmail = params.supportEmail || DEFAULT_SUPPORT_EMAIL;
  const gw = params.gateway.toUpperCase();

  const html = wrapEmailLayout(
    'Payment Request Received',
    'Payment Verification Pending',
    `<p style="margin:0 0 14px;">Hello ${escapeHtml(params.name)},</p>
     <p style="margin:0 0 14px;">Thank you! We received your MFS payment verification request. Our billing team is reviewing it now.</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="6" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;font-size:13px;">
       <tr><td style="color:#6b7280;">Plan</td><td style="font-weight:600;text-align:right;">${escapeHtml(params.planName)}</td></tr>
       <tr><td style="color:#6b7280;">Amount</td><td style="font-weight:600;text-align:right;">৳${escapeHtml(String(params.amountBdt))} BDT</td></tr>
       <tr><td style="color:#6b7280;">Gateway</td><td style="font-weight:600;text-align:right;">${escapeHtml(gw)}</td></tr>
       <tr><td style="color:#6b7280;">Sender Number</td><td style="font-family:monospace;text-align:right;">${escapeHtml(params.senderNumber)}</td></tr>
       <tr><td style="color:#6b7280;">TrxID</td><td style="font-family:monospace;font-weight:700;color:#059669;text-align:right;">${escapeHtml(params.trxId)}</td></tr>
     </table>
     <p style="margin:14px 0 0;color:#4b5563;">You will receive another email as soon as your subscription is activated.</p>`,
    supportEmail
  );

  return {
    to: params.to.trim(),
    subject: `Bangla AI — Payment Received (TrxID: ${params.trxId})`,
    senderName: DEFAULT_SENDER_NAME,
    replyTo: supportEmail,
    text: `Hello ${params.name},\n\nWe received your ${gw} payment request for ${params.planName} (৳${params.amountBdt} BDT).\nSender: ${params.senderNumber}\nTrxID: ${params.trxId}\n\nWe will email you as soon as admin verifies and activates your subscription.\n\nBangla AI (${supportEmail})`,
    html
  };
}

export function buildPaymentSubmittedAdminEmail(params: {
  to: string;
  userName: string;
  userEmail: string;
  planName: string;
  amountBdt: number;
  gateway: string;
  trxId: string;
  senderNumber: string;
  supportEmail?: string;
}): EmailMessagePayload {
  const supportEmail = params.supportEmail || DEFAULT_SUPPORT_EMAIL;
  const gw = params.gateway.toUpperCase();

  const html = wrapEmailLayout(
    `New ${gw} Payment Pending Verification`,
    'Admin Billing Alert',
    `<p style="margin:0 0 14px;">A new subscription payment was submitted on <strong>bangla-ai.pro</strong> and awaits verification in Admin Console &gt; Payments Verification.</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="6" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;font-size:13px;">
       <tr><td style="color:#6b7280;">Customer</td><td style="font-weight:600;text-align:right;">${escapeHtml(params.userName)} (${escapeHtml(params.userEmail)})</td></tr>
       <tr><td style="color:#6b7280;">Plan</td><td style="font-weight:600;text-align:right;">${escapeHtml(params.planName)}</td></tr>
       <tr><td style="color:#6b7280;">Amount</td><td style="font-weight:700;text-align:right;">৳${escapeHtml(String(params.amountBdt))} BDT</td></tr>
       <tr><td style="color:#6b7280;">Gateway</td><td style="font-weight:600;text-align:right;">${escapeHtml(gw)}</td></tr>
       <tr><td style="color:#6b7280;">Sender Number</td><td style="font-family:monospace;text-align:right;">${escapeHtml(params.senderNumber)}</td></tr>
       <tr><td style="color:#6b7280;">TrxID</td><td style="font-family:monospace;font-weight:700;color:#059669;text-align:right;">${escapeHtml(params.trxId)}</td></tr>
     </table>`,
    supportEmail
  );

  return {
    to: params.to.trim(),
    subject: `[Admin Alert] New ${gw} Payment ৳${params.amountBdt} — TrxID: ${params.trxId}`,
    senderName: DEFAULT_SENDER_NAME,
    replyTo: params.userEmail || supportEmail,
    text: `New ${gw} payment submitted on Bangla AI:\nCustomer: ${params.userName} (${params.userEmail})\nPlan: ${params.planName}\nAmount: ৳${params.amountBdt} BDT\nSender: ${params.senderNumber}\nTrxID: ${params.trxId}\n\nReview in Admin Console > Payments Verification.`,
    html
  };
}

export function buildPaymentApprovedEmail(params: {
  to: string;
  name: string;
  planName: string;
  amountBdt: number;
  gateway: string;
  trxId: string;
  expiresAt?: string;
  usageLimit?: number;
  supportEmail?: string;
}): EmailMessagePayload {
  const supportEmail = params.supportEmail || DEFAULT_SUPPORT_EMAIL;
  const expiryFormatted = params.expiresAt ? new Date(params.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Active';
  const quotaLabel = params.usageLimit ? `${params.usageLimit.toLocaleString('en-US')} tokens` : 'Updated quota';

  const html = wrapEmailLayout(
    'Subscription Activated!',
    'Payment Approved',
    `<p style="margin:0 0 14px;">Hello ${escapeHtml(params.name)},</p>
     <p style="margin:0 0 14px;">Great news! Your MFS payment has been verified and your <strong>${escapeHtml(params.planName)}</strong> subscription is now active.</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="6" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;font-size:13px;">
       <tr><td style="color:#065f46;">Plan</td><td style="font-weight:700;color:#065f46;text-align:right;">${escapeHtml(params.planName)}</td></tr>
       <tr><td style="color:#065f46;">Paid Amount</td><td style="font-weight:600;color:#065f46;text-align:right;">৳${escapeHtml(String(params.amountBdt))} BDT (${escapeHtml(params.gateway.toUpperCase())})</td></tr>
       <tr><td style="color:#065f46;">TrxID</td><td style="font-family:monospace;font-weight:700;color:#065f46;text-align:right;">${escapeHtml(params.trxId)}</td></tr>
       <tr><td style="color:#065f46;">Token Quota</td><td style="font-weight:600;color:#065f46;text-align:right;">${escapeHtml(quotaLabel)}</td></tr>
       <tr><td style="color:#065f46;">Valid Until</td><td style="font-weight:600;color:#065f46;text-align:right;">${escapeHtml(expiryFormatted)}</td></tr>
     </table>
     <p style="margin:16px 0 0;">Open your AI Workspace anytime at <a href="https://bangla-ai.pro" style="color:#059669;font-weight:600;text-decoration:none;">bangla-ai.pro</a>.</p>`,
    supportEmail
  );

  return {
    to: params.to.trim(),
    subject: `Bangla AI — Payment Approved & Subscription Active (${params.planName})`,
    senderName: DEFAULT_SENDER_NAME,
    replyTo: supportEmail,
    text: `Hello ${params.name},\n\nYour payment (TrxID: ${params.trxId}, ৳${params.amountBdt} BDT via ${params.gateway.toUpperCase()}) has been approved!\nPlan: ${params.planName}\nQuota: ${quotaLabel}\nValid Until: ${expiryFormatted}\n\nVisit https://bangla-ai.pro to start using your plan.`,
    html
  };
}

export function buildPaymentRejectedEmail(params: {
  to: string;
  name: string;
  planName: string;
  amountBdt: number;
  gateway: string;
  trxId: string;
  note?: string;
  supportEmail?: string;
}): EmailMessagePayload {
  const supportEmail = params.supportEmail || DEFAULT_SUPPORT_EMAIL;
  const reason = params.note?.trim() || 'Transaction ID or sender number could not be verified on our MFS statement.';

  const html = wrapEmailLayout(
    'Payment Verification Update',
    'Action Needed',
    `<p style="margin:0 0 14px;">Hello ${escapeHtml(params.name)},</p>
     <p style="margin:0 0 14px;">Unfortunately, we could not verify your recent MFS payment submission.</p>
     <div style="margin:14px 0;padding:14px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;font-size:13px;color:#991b1b;">
       <div><strong>Plan:</strong> ${escapeHtml(params.planName)} (৳${escapeHtml(String(params.amountBdt))} BDT)</div>
       <div><strong>Gateway / TrxID:</strong> ${escapeHtml(params.gateway.toUpperCase())} &middot; <span style="font-family:monospace;">${escapeHtml(params.trxId)}</span></div>
       <div style="margin-top:8px;"><strong>Reason:</strong> ${escapeHtml(reason)}</div>
     </div>
     <p style="margin:0;">If you believe this is a mistake, please reply to this email or contact us at <a href="mailto:${escapeHtml(supportEmail)}" style="color:#059669;">${escapeHtml(supportEmail)}</a> with your payment screenshot.</p>`,
    supportEmail
  );

  return {
    to: params.to.trim(),
    subject: `Bangla AI — Payment Verification Could Not Be Completed (${params.trxId})`,
    senderName: DEFAULT_SENDER_NAME,
    replyTo: supportEmail,
    text: `Hello ${params.name},\n\nWe could not verify your ${params.gateway.toUpperCase()} payment (TrxID: ${params.trxId}, ৳${params.amountBdt} BDT for ${params.planName}).\nReason: ${reason}\n\nPlease reply or contact ${supportEmail} with your payment details if you need assistance.`,
    html
  };
}

export function buildTestEmail(params: { to: string; supportEmail?: string }): EmailMessagePayload {
  const supportEmail = params.supportEmail || DEFAULT_SUPPORT_EMAIL;
  const timestamp = new Date().toISOString();

  const html = wrapEmailLayout(
    'Google Apps Script Mail System Connected',
    'Connection Test Passed',
    `<p style="margin:0 0 12px;">Your <strong>Bangla AI</strong> transactional email system is working cleanly via Google Apps Script!</p>
     <p style="margin:0 0 12px;color:#4b5563;">Password reset OTPs, welcome emails, customer payment receipts, and admin payment alerts will now be delivered automatically.</p>
     <div style="padding:10px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;font-family:monospace;font-size:12px;color:#374151;">
       Sent at: ${escapeHtml(timestamp)}
     </div>`,
    supportEmail
  );

  return {
    to: params.to.trim(),
    subject: 'Bangla AI — Test Email Successful',
    senderName: DEFAULT_SENDER_NAME,
    replyTo: supportEmail,
    text: `Your Bangla AI Google Apps Script mail system is connected and working! Sent at ${timestamp}.`,
    html
  };
}

export async function sendMailViaAppsScript(
  params: {
    webhookUrl: string;
    secret?: string;
    message: EmailMessagePayload;
    timeoutMs?: number;
  },
  fetchImpl: typeof fetch = fetch
): Promise<SendMailResult> {
  const validation = validateAppsScriptWebhookUrl(params.webhookUrl);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const recipient = (params.message.to || '').trim();
  if (!recipient || !recipient.includes('@')) {
    return { ok: false, error: 'Valid recipient email address is required.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 12000);

  try {
    const response = await fetchImpl(validation.url, {
      method: 'POST',
      headers: {
        // text/plain avoids strict CORS preflight issues while preserving raw JSON in e.postData.contents
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        secret: params.secret || '',
        to: recipient,
        subject: params.message.subject,
        text: params.message.text,
        html: params.message.html,
        senderName: params.message.senderName || DEFAULT_SENDER_NAME,
        replyTo: params.message.replyTo || DEFAULT_SUPPORT_EMAIL
      }),
      redirect: 'follow',
      signal: controller.signal
    });

    const finalUrl = response.url || '';
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const rawBody = await response.text();

    if (finalUrl.includes('accounts.google.com') || (contentType.includes('text/html') && rawBody.includes('ServiceLogin'))) {
      return {
        ok: false,
        error: 'Google Apps Script asked for login. In Apps Script Deploy settings, set "Execute as: Me" and "Who has access: Anyone".'
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: `Google Apps Script returned HTTP ${response.status}.`
      };
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return {
        ok: false,
        error: 'Unexpected non-JSON response from Google Apps Script. Verify you pasted the Web App /exec URL with doPost(e).'
      };
    }

    if (!parsed || parsed.ok !== true) {
      return {
        ok: false,
        error: parsed?.error || 'Google Apps Script reported an error sending the email.'
      };
    }

    return {
      ok: true,
      sentTo: parsed.sentTo || recipient
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { ok: false, error: 'Google Apps Script request timed out after 12 seconds.' };
    }
    return {
      ok: false,
      error: err?.message || 'Network error calling Google Apps Script webhook.'
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendMailSafe(
  settings: MailConfigInput | null | undefined,
  message: EmailMessagePayload,
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<SendMailResult> {
  const config = resolveMailRuntimeConfig(settings, env);
  if (!config.enabled) {
    return { ok: false, skipped: true, error: 'Email system is disabled in Admin Settings.' };
  }
  if (!config.configured) {
    return { ok: false, skipped: true, error: 'Google Apps Script webhook URL is not configured.' };
  }

  try {
    const result = await sendMailViaAppsScript(
      {
        webhookUrl: config.webhookUrl,
        secret: config.secret,
        message
      },
      fetchImpl
    );
    if (!result.ok) {
      console.error('[Mail] Delivery failed:', result.error);
    }
    return { ...result, skipped: false };
  } catch (err: any) {
    console.error('[Mail] Unexpected delivery error:', err);
    return { ok: false, skipped: false, error: err?.message || 'Unexpected mail failure.' };
  }
}
