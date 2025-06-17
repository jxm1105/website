import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// ✅ From frontend: capture payment and send to Google Sheets + frontend handles emailjs
app.post('/paypal-webhook', async (req, res) => {
  const { orderId, email, items, total, shipping } = req.body;

  await sendToSheets(email, items, total, shipping);
  res.status(200).send("Order logged from frontend.");
});

// ✅ From PayPal: delayed confirmation
app.post('/paypal-ipn', async (req, res) => {
  const event = req.body;

  if (
    event.event_type === 'PAYMENT.CAPTURE.COMPLETED' &&
    event.resource?.status === 'COMPLETED'
  ) {
    const capture = event.resource;
    const payer = capture.payer || {};
    const email = payer.email_address || 'unknown@unknown.com';
    const amount = capture.amount?.value || '0.00';
    const shipping = capture.shipping?.address?.address_line_1 || 'Unknown';

    const items = ['Webhook purchase'];

    await sendToSheets(email, items, amount, shipping);
    await sendEmail(email, items, amount, shipping);
    console.log('✅ Webhook order saved & email sent');
  }

  res.status(200).send('OK');
});

async function sendToSheets(email, items, total, shipping) {
  try {
    await fetch('https://script.google.com/macros/s/AKfycby6w--CWNdH2gTPEjccSBHTpnwLHIykOGTNvldNqLhwd0pB6_jLmvzpW2NtnThVGa4b/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, items, total, shipping })
    });
  } catch (err) {
    console.error("❌ Sheets error", err);
  }
}

async function sendEmail(email, items, total, shipping) {
  try {
    await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        service_id: "service_lkx8hde",
        template_id: "template_j6e2hbv",
        user_id: "X5EyJsvtspdoQsts0",
        template_params: {
          to_email: email,
          order_id: "webhook-capture",
          item_list: items.join(', '),
          total_cost: total,
          shipping_address: shipping
        }
      })
    });
  } catch (err) {
    console.error("❌ EmailJS error", err);
  }
}

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
