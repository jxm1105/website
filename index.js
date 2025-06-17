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

// ✅ From frontend
app.post('/paypal-webhook', async (req, res) => {
  const { orderId, email, items, total, shipping } = req.body;
  console.log("📦 Frontend webhook received:", { email, items, total, shipping });

  try {
    await sendToSheets(email, items, total, shipping);
    res.status(200).send("✅ Order saved from frontend");
  } catch (err) {
    console.error("❌ Frontend webhook error:", err);
    res.status(500).send("❌ Failed to log order");
  }
});

// ✅ From PayPal webhook
app.post('/paypal-ipn', async (req, res) => {
  const event = req.body;
  console.log("🔔 Webhook event received:", event.event_type);

  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED' && event.resource?.status === 'COMPLETED') {
    const capture = event.resource;
    const payer = capture.payer || {};
    const email = payer.email_address || 'unknown@unknown.com';
    const amount = capture.amount?.value || '0.00';
    const shipping = capture.shipping?.address?.address_line_1 || 'Unknown';
    const items = ['Webhook Purchase'];

    console.log("✅ Payment confirmed for:", email);

    try {
      await sendToSheets(email, items, amount, shipping);
      console.log("📄 Google Sheets updated");

      await sendEmail(email, items, amount, shipping);
      console.log("📧 Email sent via EmailJS");

    } catch (err) {
      console.error("❌ Webhook processing error:", err);
    }
  }

  res.status(200).send('OK');
});

// 📄 Google Sheets
async function sendToSheets(email, items, total, shipping) {
  const response = await fetch('https://script.google.com/macros/s/AKfycby6w--CWNdH2gTPEjccSBHTpnwLHIykOGTNvldNqLhwd0pB6_jLmvzpW2NtnThVGa4b/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, items, total, shipping })
  });

  if (!response.ok) throw new Error(`Google Sheets failed: ${response.status}`);
}

// 📧 EmailJS
async function sendEmail(email, items, total, shipping) {
  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  if (!response.ok) throw new Error(`EmailJS failed: ${response.status}`);
}

// Fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

