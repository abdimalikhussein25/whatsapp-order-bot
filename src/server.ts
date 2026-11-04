import { createServer } from "node:http";
import { handleMessage } from "./bot.js";
import { memoryStore } from "./store.js";
import { WhatsAppClient, extractTextMessages, verifySignature } from "./whatsapp.js";

const env = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
};

const VERIFY_TOKEN = env("WA_VERIFY_TOKEN");
const APP_SECRET = env("WA_APP_SECRET");
const OWNER_PHONE = process.env.OWNER_PHONE; // gets a copy of every order
const PORT = Number(process.env.PORT ?? 3000);

const wa = new WhatsAppClient(env("WA_PHONE_NUMBER_ID"), env("WA_ACCESS_TOKEN"));
const store = memoryStore("orders.jsonl", (order) => {
  if (!OWNER_PHONE) return;
  const lines = order.lines.map((l) => `${l.qty} × ${l.name}`).join("\n");
  wa.sendText(OWNER_PHONE, `🆕 Dalab #${order.id}\n${lines}\nWadar: $${order.total.toFixed(2)}\n📍 ${order.address}\n📞 +${order.customer}`)
    .catch((e) => console.error("owner notify failed", e));
});

const seen = new Set<string>(); // Meta retries webhooks; don't answer twice

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (url.pathname === "/health") return void res.end("ok");

  if (url.pathname !== "/webhook") return void res.writeHead(404).end();

  // Meta's one-time verification handshake
  if (req.method === "GET") {
    const ok = url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === VERIFY_TOKEN;
    res.writeHead(ok ? 200 : 403).end(ok ? (url.searchParams.get("hub.challenge") ?? "") : "");
    return;
  }

  if (req.method !== "POST") return void res.writeHead(405).end();

  let raw = "";
  for await (const chunk of req) raw += chunk;

  if (!verifySignature(raw, req.headers["x-hub-signature-256"] as string | undefined, APP_SECRET)) {
    return void res.writeHead(401).end();
  }

  // Acknowledge immediately; Meta expects a fast 200.
  res.writeHead(200).end();

  for (const msg of extractTextMessages(JSON.parse(raw))) {
    if (seen.has(msg.messageId)) continue;
    seen.add(msg.messageId);
    if (seen.size > 5000) seen.clear();

    try {
      await wa.markRead(msg.messageId);
      const reply = await handleMessage(msg.from, msg.text, store);
      await wa.sendText(msg.from, reply);
    } catch (err) {
      console.error("failed to handle message", msg.messageId, err);
    }
  }
}).listen(PORT, () => console.log(`WhatsApp order bot on :${PORT}`));
