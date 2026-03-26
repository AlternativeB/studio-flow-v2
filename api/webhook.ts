// api/webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

// Supabase с service_role ключом — для чтения данных внутри вебхука
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { secret } = req.query;
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  const { type, table, record, old_record } = req.body;
  let message = '';

  try {

    // ── 1. НОВЫЙ КЛИЕНТ ──────────────────────────────────────────────
    if (table === 'profiles' && type === 'INSERT' && record.role === 'client') {
      message = [
        `🎉 <b>Новый клиент!</b>`,
        `👤 ${record.first_name || '?'} ${record.last_name || ''}`.trim(),
        `📱 ${record.phone || 'телефон не указан'}`,
      ].join('\n');
    }

    // ── 2. ЗАПИСЬ НА УРОК ─────────────────────────────────────────────
    else if (table === 'bookings' && type === 'INSERT' && record.status === 'booked') {
      let clientName = `ID: ${record.user_id}`;
      let sessionInfo = `ID: ${record.session_id}`;

      if (supabase) {
        const [{ data: profile }, { data: session }] = await Promise.all([
          supabase.from('profiles').select('first_name, last_name, phone').eq('id', record.user_id).single(),
          supabase.from('schedule_sessions').select('start_time, class_type:class_types(name)').eq('id', record.session_id).single(),
        ]);

        if (profile) {
          clientName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() + (profile.phone ? ` (${profile.phone})` : '');
        }
        if (session) {
          const date = new Date(session.start_time);
          const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
          const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
          const className = (session as any).class_type?.name || 'Занятие';
          sessionInfo = `${className}, ${dateStr} в ${timeStr}`;
        }
      }

      message = [
        `📝 <b>Новая запись!</b>`,
        `👤 ${clientName}`,
        `🏋️ ${sessionInfo}`,
      ].join('\n');
    }

    // ── 3. ОТМЕНА ЗАПИСИ (клиент удаляет бронь через DELETE) ──────────
    else if (table === 'bookings' && type === 'DELETE') {
      let clientName = `ID: ${record.user_id}`;
      let sessionInfo = `ID: ${record.session_id}`;

      if (supabase) {
        const [{ data: profile }, { data: session }] = await Promise.all([
          supabase.from('profiles').select('first_name, last_name, phone').eq('id', record.user_id).single(),
          supabase.from('schedule_sessions').select('start_time, class_type:class_types(name)').eq('id', record.session_id).single(),
        ]);

        if (profile) {
          clientName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() + (profile.phone ? ` (${profile.phone})` : '');
        }
        if (session) {
          const date = new Date(session.start_time);
          const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
          const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
          const className = (session as any).class_type?.name || 'Занятие';
          sessionInfo = `${className}, ${dateStr} в ${timeStr}`;
        }
      }

      message = [
        `❌ <b>Запись отменена</b>`,
        `👤 ${clientName}`,
        `🏋️ ${sessionInfo}`,
      ].join('\n');
    }

    // ── 4. ВЫДАН АБОНЕМЕНТ (INSERT в user_subscriptions) ──────────────
    else if (table === 'user_subscriptions' && type === 'INSERT') {
      let clientName = `ID: ${record.user_id}`;
      let planName = `ID: ${record.plan_id}`;

      if (supabase) {
        const [{ data: profile }, { data: plan }] = await Promise.all([
          supabase.from('profiles').select('first_name, last_name, phone').eq('id', record.user_id).single(),
          supabase.from('subscription_plans').select('name').eq('id', record.plan_id).single(),
        ]);

        if (profile) {
          clientName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() + (profile.phone ? ` (${profile.phone})` : '');
        }
        if (plan) planName = plan.name;
      }

      message = [
        `💳 <b>Новый абонемент!</b>`,
        `👤 ${clientName}`,
        `📦 ${planName}`,
        `📅 до ${record.end_date || '?'}`,
      ].join('\n');
    }

    if (message) {
      const sent = await sendTelegramMessage(message);
      if (!sent) {
        console.error('Failed to send Telegram message');
        return res.status(500).send('Telegram send failed');
      }
      return res.status(200).json({ success: true });
    }

    return res.status(200).send('No notification needed');

  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).send('Internal Server Error');
  }
}

async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!TELEGRAM_TOKEN || !CHAT_ID) {
    console.warn('Telegram credentials not configured');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Telegram API error:', err);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Telegram fetch error:', e);
    return false;
  }
}
