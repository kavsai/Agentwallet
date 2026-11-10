require("dotenv").config();
const express = require("express");
const app = express();
app.use(express.json());
app.use(express.static("public"));

const BASE = "https://api-m.sandbox.paypal.com";

async function getToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

// Create an order for an exact amount
app.post("/api/orders", async (req, res) => {
  const { amount, description } = req.body;
  const token = await getToken();
  const r = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        { description, amount: { currency_code: "USD", value: String(amount) } },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: "http://localhost:3000/success.html",
            cancel_url: "http://localhost:3000/cancel.html",
          },
        },
      },
    }),
  });
  res.json(await r.json());
});

// Capture after the buyer approves
app.post("/api/orders/:id/capture", async (req, res) => {
  const token = await getToken();
  const r = await fetch(`${BASE}/v2/checkout/orders/${req.params.id}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  res.json(await r.json());
});

app.listen(process.env.PORT, () =>
  console.log(`Running on http://localhost:${process.env.PORT}`)
);