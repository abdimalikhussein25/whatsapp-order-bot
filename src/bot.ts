import { catalog, findProduct } from "./catalog.js";

export interface CartLine {
  productId: string;
  qty: number;
}

export interface Session {
  cart: CartLine[];
  step: "browsing" | "awaiting_address" | "awaiting_confirm";
  address?: string;
}

export interface Order {
  id: string;
  customer: string;
  lines: { name: string; qty: number; price: number }[];
  total: number;
  address: string;
  createdAt: string;
}

export interface BotDeps {
  getSession(customer: string): Promise<Session | undefined>;
  saveSession(customer: string, session: Session): Promise<void>;
  clearSession(customer: string): Promise<void>;
  placeOrder(order: Order): Promise<void>;
  newOrderId(): string;
}

const money = (n: number) => `$${n.toFixed(2)}`;

export const HELP =
  "Ku soo dhawoow! 👋\n\n" +
  "• *menu* – eeg cuntooyinka\n" +
  "• *2x3* – ku dar 3 xabbo oo lambarka 2 ah\n" +
  "• *cart* – eeg dambiilahaaga\n" +
  "• *dalbo* – dhammee dalabka\n" +
  "• *jooji* – tirtir dalabka";

export function renderMenu(): string {
  const lines = catalog.map((p) => `*${p.id}.* ${p.name} — ${money(p.price)}`);
  return `🍽️ *Menu*\n\n${lines.join("\n")}\n\nQor lambarka si aad u dalbato, tusaale *2* ama *2x3*.`;
}

export function cartTotal(cart: CartLine[]): number {
  return cart.reduce((sum, l) => sum + (findProduct(l.productId)?.price ?? 0) * l.qty, 0);
}

export function renderCart(cart: CartLine[]): string {
  if (cart.length === 0) return "Dambiilahaagu waa madhan yahay. Qor *menu* si aad u bilowdo.";
  const lines = cart.map((l) => {
    const p = findProduct(l.productId)!;
    return `${l.qty} × ${p.name} — ${money(p.price * l.qty)}`;
  });
  return `🛒 *Dambiilahaaga*\n\n${lines.join("\n")}\n\n*Wadarta: ${money(cartTotal(cart))}*\n\nQor *dalbo* si aad u dhammaystirto.`;
}

const ADD_PATTERN = /^(\d+)(?:\s*[x×*]\s*(\d+))?$/i;

/**
 * Pure conversation logic: takes one inbound text, returns the reply.
 * Transport (WhatsApp) and storage are injected, so this is easy to test.
 */
export async function handleMessage(customer: string, text: string, deps: BotDeps): Promise<string> {
  const input = text.trim().toLowerCase();
  const session: Session = (await deps.getSession(customer)) ?? { cart: [], step: "browsing" };

  if (["jooji", "cancel", "stop"].includes(input)) {
    await deps.clearSession(customer);
    return "Dalabka waa la tirtiray. Qor *menu* markaad diyaar tahay.";
  }

  if (session.step === "awaiting_address") {
    if (input.length < 4) return "Fadlan qor cinwaan buuxa (xaafadda, wadada, calaamad).";
    session.address = text.trim();
    session.step = "awaiting_confirm";
    await deps.saveSession(customer, session);
    return `${renderCart(session.cart).replace(/\n\nQor \*dalbo\*.*$/s, "")}\n📍 ${session.address}\n\nQor *haa* si aad u xaqiijiso ama *jooji* si aad u tirtirto.`;
  }

  if (session.step === "awaiting_confirm") {
    if (!["haa", "yes", "ok"].includes(input)) return "Qor *haa* si aad u xaqiijiso ama *jooji* si aad u tirtirto.";
    const order: Order = {
      id: deps.newOrderId(),
      customer,
      lines: session.cart.map((l) => {
        const p = findProduct(l.productId)!;
        return { name: p.name, qty: l.qty, price: p.price };
      }),
      total: cartTotal(session.cart),
      address: session.address!,
      createdAt: new Date().toISOString(),
    };
    await deps.placeOrder(order);
    await deps.clearSession(customer);
    return `✅ Dalabkaaga *#${order.id}* waa la helay!\nWadarta: *${money(order.total)}*\n\nWaan kula soo xiriiri doonnaa dhawaan. Mahadsanid! 🙏`;
  }

  if (["menu", "liiska", "1."].includes(input)) return renderMenu();
  if (["cart", "dambiil", "basket"].includes(input)) return renderCart(session.cart);

  if (["dalbo", "order", "checkout"].includes(input)) {
    if (session.cart.length === 0) return "Dambiilahaagu waa madhan yahay. Qor *menu* marka hore.";
    session.step = "awaiting_address";
    await deps.saveSession(customer, session);
    return "📍 Fadlan soo qor cinwaanka gaarsiinta (xaafadda, wadada, calaamad).";
  }

  const match = input.match(ADD_PATTERN);
  if (match) {
    const product = findProduct(match[1]);
    const qty = Number(match[2] ?? 1);
    if (!product) return `Lambarka *${match[1]}* kuma jiro menu-ga. Qor *menu*.`;
    if (qty < 1 || qty > 50) return "Tirada waa inay u dhaxeysaa 1 iyo 50.";

    const line = session.cart.find((l) => l.productId === product.id);
    if (line) line.qty = Math.min(50, line.qty + qty);
    else session.cart.push({ productId: product.id, qty });
    await deps.saveSession(customer, session);
    return `➕ ${qty} × ${product.name} waa lagu daray.\nWadarta hadda: *${money(cartTotal(session.cart))}*\n\nKu dar wax kale, ama qor *dalbo*.`;
  }

  return HELP;
}
