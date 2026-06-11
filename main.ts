import { Hono } from "hono";
import { cors } from "hono/cors";

import { getStocks, scrapeStockDetail } from "./service/stockService.ts";
import type { Stock } from "./types/Stock.d.ts";

const app = new Hono();

// Middleware de logging
app.use(async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.url} - ${ms}ms`);
});

// Middleware para servir o robots.txt
app.use(async (c, next) => {
  if (c.req.path === "/robots.txt") {
    try {
      const robotsTxt = await Deno.readTextFile("./static/robots.txt");
      return c.text(robotsTxt);
    } catch (_error) {
      return c.text("User-agent: *\nDisallow: /");
    }
  }
  await next();
});

app.use("*", cors());

const stocks = await getStocks();

console.info(`📈 collected ${stocks.length} stocks, ${JSON.stringify(stocks[0])}`);

app.get("/", (c) => c.json(stocks));

app.get("/:paper", async (c) => {
  const paper = c.req.param("paper").toUpperCase();
  const stock = stocks.find((stock: Stock) => stock.Papel === paper);
  if (stock) {
    return c.json(stock);
  }
  try {
    const scrapedStock = await scrapeStockDetail(paper);
    if (scrapedStock) {
      stocks.push(scrapedStock);
      return c.json(scrapedStock);
    }
  } catch (error) {
    console.error(error);
  }
  return c.json({ error: `stock ${paper} not found` }, 404);
});

Deno.serve({ port: 3333 }, app.fetch);
