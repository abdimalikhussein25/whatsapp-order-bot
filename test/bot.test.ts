import { describe, it, expect, beforeEach } from "vitest";
import { handleMessage, type BotDeps, type Order, type Session } from "../src/bot.js";

function fakeDeps() {
  const sessions = new Map<string, Session>();
  const orders: Order[] = [];
  const deps: BotDeps = {
    getSession: async (c) => structuredClone(sessions.get(c)),
    saveSession: async (c, s) => void sessions.set(c, structuredClone(s)),
    clearSession: async (c) => void sessions.delete(c),
    placeOrder: async (o) => void orders.push(o),
    newOrderId: () => "1001",
  };
  return { deps, orders, sessions };
}

describe("order conversation", () => {
  let ctx: ReturnType<typeof fakeDeps>;
  const say = (text: string) => handleMessage("252615000000", text, ctx.deps);

  beforeEach(() => (ctx = fakeDeps()));

  it("shows help for unknown input", async () => {
    expect(await say("salaan")).toContain("Ku soo dhawoow");
  });

  it("shows the menu", async () => {
    expect(await say("menu")).toContain("Bariis iyo Hilib Ari");
  });

  it("runs a full order: add, add, checkout, address, confirm", async () => {
    expect(await say("2x2")).toContain("$13.00");
    expect(await say("5")).toContain("$13.75");
    expect(await say("2")).toContain("$20.25"); // merges into the existing line
    expect(await say("dalbo")).toContain("cinwaan");
    expect(await say("Hodan, Taleex, agagaarka suuqa")).toContain("haa");
    expect(await say("haa")).toContain("#1001");

    expect(ctx.orders).toHaveLength(1);
    expect(ctx.orders[0]).toMatchObject({ total: 20.25, address: "Hodan, Taleex, agagaarka suuqa" });
    expect(ctx.orders[0].lines).toEqual([
      { name: "Bariis iyo Hilib Ari", qty: 3, price: 6.5 },
      { name: "Shaah Somali", qty: 1, price: 0.75 },
    ]);
    expect(ctx.sessions.size).toBe(0);
  });

  it("refuses checkout with an empty cart", async () => {
    expect(await say("dalbo")).toContain("madhan");
  });

  it("rejects unknown products and silly quantities", async () => {
    expect(await say("99")).toContain("kuma jiro");
    expect(await say("1x500")).toContain("1 iyo 50");
  });

  it("cancels at any step", async () => {
    await say("1");
    await say("dalbo");
    expect(await say("jooji")).toContain("tirtiray");
    expect(ctx.sessions.size).toBe(0);
  });

  it("waits for explicit confirmation", async () => {
    await say("1");
    await say("dalbo");
    await say("Wadajir, KM4");
    expect(await say("maybe")).toContain("haa");
    expect(ctx.orders).toHaveLength(0);
  });
});
