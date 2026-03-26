// api/webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Токен и ID чата берем из переменных окружения (настроим на шаге 6.3)
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Проверка метода (Supabase шлет POST)
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Проверка секретного ключа (чтобы никто левый не слал фейковые уведомления)
  // Мы зададим этот ключ в URL вебхука в Supabase: /api/webhook?secret=MY_SECRET
  const { secret } = req.query;
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  const { type, table, record, old_record } = req.body;
  let message = '';

  try {
    // === ЛОГИКА УВЕДОМЛЕНИЙ ===

    // 1. Новый клиент (INSERT в таблицу profiles)
    if (table === 'profiles' && type === 'INSERT') {
      message = `
🎉 <b>Новый клиент!</b>
👤 Имя: ${record.first_name || 'Не указано'} ${record.last_name || ''}
📱 Телефон: ${record.phone || 'Нет'}
✉️ Email: ${record.email || 'Нет'}
      `;
    }

    // 2. Запись на урок (INSERT в таблицу bookings)
    // Внимание: webhook присылает только ID, нам может не хватать названий.
    // Для простоты пока шлем ID, в будущем можно докрутить запрос к базе.
    else if (table === 'bookings' && type === 'INSERT' && record.status === 'booked') {
        // Мы знаем user_id и session_id. 
        // В бесплатном варианте без лишних запросов просто оповещаем о факте.
        message = `
📝 <b>Новая запись на урок!</b>
🆔 Бронь ID: <code>${record.id.split('-')[0]}...</code>
👤 Клиент ID: <code>${record.user_id}</code>
      `;
    }

    // 3. Отмена записи клиентом (UPDATE bookings -> cancelled)
    else if (table === 'bookings' && type === 'UPDATE' && record.status === 'cancelled' && old_record.status !== 'cancelled') {
       message = `
❌ <b>Запись отменена!</b>
🆔 Бронь ID: <code>${record.id}</code>
      `;
    }

    // Если сообщение сформировано - отправляем
    if (message) {
      await sendTelegramMessage(message);
      return res.status(200).json({ success: true });
    }

    return res.status(200).send('No notification needed');

  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).send('Internal Server Error');
  }
}

async function sendTelegramMessage(text: string) {
  if (!TELEGRAM_TOKEN || !CHAT_ID) return;
  
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'HTML' // Позволяет использовать жирный шрифт и код
    })
  });
}