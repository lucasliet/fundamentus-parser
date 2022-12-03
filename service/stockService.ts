import { DOMParser, Element, Node } from 'https://deno.land/x/deno_dom@v0.1.36-alpha/deno-dom-wasm.ts';
import { Stock } from '../types/Stock.d.ts';

const DOM_PARSER = new DOMParser();

const INVESTIDOR10_URL = 'https://investidor10.com.br/acoes/rankings/acoes-mais-baratas-benjamin-graham/'
const FUNDAMENTUS_URL = 'https://www.fundamentus.com.br/resultado.php'

export async function getStocks(): Promise<Stock[]> {
  const [fundamentusHtml, investidor10Html] = await Promise.all([
    crawler(FUNDAMENTUS_URL),
    crawler(INVESTIDOR10_URL),
  ]);

  const [fundamentusStocks, grahamStocks] = await Promise.all([
    parseFundamentusStocks(fundamentusHtml),
    parseGrahamStocks(investidor10Html),
  ]);

  const stocks = addGrahamValueTo(fundamentusStocks, grahamStocks);
  return sortStocksByGrahamUpside(stocks);
}

function parseFundamentusStocks(fundamentusHtml: string): Promise<Stock[]> {
  return new Promise((resolve) => {
    const stocksElement = parseElement(fundamentusHtml, '#resultado');
    const headers = parseHeaders(stocksElement);
    const stocks = parseStocks(stocksElement, headers);
    resolve(stocks);
  });
}

function parseGrahamStocks(investidor10Html: string): Promise<Stock[]> {
  return new Promise((resolve) => {
    const stocksElement = parseElement(investidor10Html, '#rankigns');
    const headers = parseHeaders(stocksElement);
    headers[0] = 'Papel';
    const stocks = parseStocks(stocksElement, headers);
    resolve(stocks);
  });
}

async function crawler(url: string): Promise<string> {
  return await fetch(url)
    .then((response: Response) => response.text());
}

function parseElement(html: string, selector: string): Element {
  return DOM_PARSER.parseFromString(html, 'text/html')
    ?.querySelector(selector)!;
}

function parseHeaders(document: Element): string[] {
  return Array.from(document.querySelector('thead tr')!.children)
    .map((element: Element) => element.textContent.replaceAll('\n', '').trim());
}

function parseStocks(document: Element, headers: string[]): Stock[] {
  return Array.from(document.querySelectorAll('tbody tr'))
    .map((row: Node) => {
      const stock: Stock = {};
      Array.from((row as Element).children).map((value: Element, index: number) => {
        stock[headers[index]] = value.textContent.replaceAll('\n', '').trim();
      })
      return stock;
    });
}

function sortStocksByGrahamUpside(stocks: Stock[]) {
  return stocks.sort((a: Stock, b: Stock) => {
    const aUpside = parseFloat(a.upside.replace('%', '').replace(',', '.'));
    const bUpside = parseFloat(b.upside.replace('%', '').replace(',', '.'));
    return bUpside - aUpside;
  });
}

function addGrahamValueTo(stocks: Stock[], grahamStocks: Stock[]) {
  return stocks.map((stock: Stock) => {
    const grahamStock = grahamStocks.find((grahamStock: Stock) => grahamStock.Papel === stock.Papel);
    stock.graham = grahamStock ? grahamStock['Preço Justode Graham'] : '0';
    stock.upside = grahamStock ? grahamStock['Upside(Graham)'] : '0';
    return stock;
  });
}