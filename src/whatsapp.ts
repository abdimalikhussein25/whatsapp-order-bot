import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH_VERSION = "v21.0";

/** Verify the X-Hub-Signature-256 header Meta sends with every webhook. */
export function verifySignature(rawBody: string, header: string | undefined, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const received = header.slice("sha256=".length);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}

export interface InboundText {
  from: string;
  text: string;
  messageId: string;
}

/** Pull plain text messages out of a WhatsApp Cloud API webhook payload. */
export function extractTextMessages(payload: any): InboundText[] {
  const out: InboundText[] = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      for (const msg of change?.value?.messages ?? []) {
        const text =
          msg.type === "text"
            ? msg.text?.body
            : msg.type === "interactive"
              ? (msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id)
              : undefined;
        if (typeof text === "string") out.push({ from: msg.from, text, messageId: msg.id });
      }
    }
  }
  return out;
}

export class WhatsAppClient {
  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async sendText(to: string, body: string): Promise<void> {
    const res = await this.fetchImpl(`https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: false } }),
    });
    if (!res.ok) throw new Error(`WhatsApp send failed: HTTP ${res.status} ${await res.text()}`);
  }

  async markRead(messageId: string): Promise<void> {
    await this.fetchImpl(`https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }),
    }).catch(() => undefined);
  }
}
