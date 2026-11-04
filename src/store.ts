import { appendFile } from "node:fs/promises";
import type { BotDeps, Order, Session } from "./bot.js";

/**
 * In-memory sessions + JSONL order log. Good enough for a single instance;
 * swap for Redis/Postgres when you run more than one.
 */
export function memoryStore(ordersFile = "orders.jsonl", onOrder?: (o: Order) => void): BotDeps {
  const sessions = new Map<string, { session: Session; touched: number }>();
  const TTL = 2 * 60 * 60 * 1000; // abandon carts after 2h
  let counter = 1000;

  return {
    async getSession(customer) {
      const hit = sessions.get(customer);
      if (!hit || Date.now() - hit.touched > TTL) return undefined;
      return structuredClone(hit.session);
    },
    async saveSession(customer, session) {
      sessions.set(customer, { session: structuredClone(session), touched: Date.now() });
    },
    async clearSession(customer) {
      sessions.delete(customer);
    },
    async placeOrder(order) {
      await appendFile(ordersFile, JSON.stringify(order) + "\n");
      onOrder?.(order);
    },
    newOrderId() {
      return String(++counter);
    },
  };
}
