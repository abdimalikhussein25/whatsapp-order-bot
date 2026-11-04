# whatsapp-order-bot

A WhatsApp ordering bot that speaks **Somali**. Customers browse the menu, build a cart, send their delivery address and confirm — the shop owner gets every order instantly on WhatsApp.

Built on the **official WhatsApp Cloud API** (no unofficial libraries, no risk of the number getting banned), in plain Node.js + TypeScript.

![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=nodedotjs&logoColor=white)
![WhatsApp Cloud API](https://img.shields.io/badge/WhatsApp-Cloud%20API-25D366?logo=whatsapp&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

## The conversation

```
Customer: menu
Bot:      🍽️ Menu
          1. Canjeero + Suqaar — $3.00
          2. Bariis iyo Hilib Ari — $6.50
          ...
Customer: 2x2
Bot:      ➕ 2 × Bariis iyo Hilib Ari waa lagu daray. Wadarta hadda: $13.00
Customer: dalbo
Bot:      📍 Fadlan soo qor cinwaanka gaarsiinta
Customer: Hodan, Taleex, agagaarka suuqa
Bot:      🛒 ... 📍 Hodan, Taleex ... Qor haa si aad u xaqiijiso
Customer: haa
Bot:      ✅ Dalabkaaga #1001 waa la helay!
```

And the owner receives:

```
🆕 Dalab #1001
2 × Bariis iyo Hilib Ari
Wadar: $13.00
📍 Hodan, Taleex, agagaarka suuqa
📞 +252615000000
```

## Features

- Menu, cart with quantities (`2x3`), checkout, address, explicit confirmation, cancel at any step
- Owner notification for every order, plus an `orders.jsonl` log
- Webhook **signature verification** (`X-Hub-Signature-256`) and duplicate-delivery protection
- Conversation logic is a pure function with injected storage — fully unit-tested, easy to move to Redis/Postgres
- Zero runtime dependencies

## Setup

1. Create an app at [developers.facebook.com](https://developers.facebook.com) and add the **WhatsApp** product.
2. Copy `.env.example` to `.env` and fill in the phone number ID, access token and app secret.
3. Run it:

   ```bash
   npm install
   npm run build
   node --env-file=.env dist/server.js
   ```

4. Expose it over HTTPS (any host, or a tunnel while testing) and set the webhook URL in Meta to `https://your-host/webhook` with the same `WA_VERIFY_TOKEN`. Subscribe to the `messages` field.

Edit [`src/catalog.ts`](src/catalog.ts) to put in your own products and prices.

## Project layout

| File | What it does |
|---|---|
| `src/bot.ts` | Conversation state machine (pure, testable) |
| `src/whatsapp.ts` | Cloud API client, signature check, payload parsing |
| `src/store.ts` | In-memory sessions with 2h expiry + order log |
| `src/server.ts` | HTTP webhook server |
| `src/catalog.ts` | Products |

## Roadmap

- [ ] Pay with EVC Plus / Zaad / Sahal at checkout using [somali-payments](https://github.com/abdimalikhussein25/somali-payments)
- [ ] Interactive list messages for the menu
- [ ] English / Arabic language switch
- [ ] Postgres store and a small admin dashboard

## Tests

```bash
npm test
```

## License

MIT © Abdimalik Salad Hussein — [Fiddo Technology](https://fiddotechnology.com)
