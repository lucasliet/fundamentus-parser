import { DOMParser, Element, Node } from "deno-dom";
import { Stock } from '../types/Stock.d.ts';

const DOM_PARSER = new DOMParser();

const NUMBER_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FUNDAMENTUS_URL = 'https://www.fundamentus.com.br/resultado.php?&interface=classic'

export async function getStocks(): Promise<Stock[]> {
  const fundamentusHtml = await crawler(FUNDAMENTUS_URL);
  const fundamentusStocks = await parseFundamentusStocks(fundamentusHtml);
  const stocks = addGrahamValueTo(fundamentusStocks);

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

async function crawler(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder('iso-8859-1');
  return decoder.decode(buffer);
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
  return stocks.filter((stock: Stock) =>
    stock.graham !== null && parseFloat(stock.graham) > 0 &&
    stock['P/L'] !== null && parseFloat(stock['P/L'].replace(',', '.')) > 0
  ).sort((a: Stock, b: Stock) => {
    const aUpside = parseFloat(a.upside!.replace('%', '').replace(',', '.'));
    const bUpside = parseFloat(b.upside!.replace('%', '').replace(',', '.'));
    return bUpside - aUpside;
  });
}

function addGrahamValueTo(stocks: Stock[]) {
  return stocks.map((stock: Stock) => {
    const plStr = stock['P/L'];
    const pvpStr = stock['P/VP'];
    const priceStr = stock['Cotação'];
    if (!plStr || !pvpStr || !priceStr) {
      return { ...stock, lpa: null, vpa: null, graham: null, upside: null };
    }
    const pl = parseFloat(plStr.replace(',', '.'));
    const pvp = parseFloat(pvpStr.replace(',', '.'));
    const price = parseFloat(priceStr.replace(',', '.'));
    const lpa = price / pl;
    const vpa = price / pvp;
    const grahamProduct = 22.5 * lpa * vpa;
    const grahamValue = grahamProduct > 0 ? Math.sqrt(grahamProduct) : 0;
    const upside = ((grahamValue / price) - 1) * 100;
    return {
      ...stock,
      lpa: NUMBER_FORMATTER.format(lpa),
      vpa: NUMBER_FORMATTER.format(vpa),
      graham: NUMBER_FORMATTER.format(grahamValue),
      upside: formatPercentValue(upside),
    };
  });
}

function formatPercentValue(value: number): string {
  return NUMBER_FORMATTER.format(value)+'%'
}

/**
 * Scrapes details for a single stock paper and calculates its Graham value metrics.
 *
 * @param paper The stock ticker symbol.
 * @returns A promise that resolves to the stock object or null if not found.
 */
export async function scrapeStockDetail(paper: string): Promise<Stock | null> {
  const url = `https://www.fundamentus.com.br/detalhes.php?papel=${paper}`;
  const html = await crawler(url);
  if (html.includes('Nenhum papel encontrado')) {
    return null;
  }
  const document = parseElement(html, 'body');
  const stock = parseStockDetails(document, paper);
  const stocks = addGrahamValueTo([stock]);
  return stocks[0];
}

/**
 * Parses the labels and values from the stock detail page.
 *
 * @param document The Element of the page.
 * @param paper The stock ticker symbol.
 * @returns The populated stock object.
 */
const CANONICAL_FIELDS = [
  'Papel',
  'Cotação',
  'P/L',
  'P/VP',
  'PSR',
  'Div.Yield',
  'P/Ativo',
  'P/Cap.Giro',
  'P/EBIT',
  'P/Ativ Circ.Liq',
  'EV/EBIT',
  'EV/EBITDA',
  'Mrg Bruta',
  'Mrg Ebit',
  'Mrg. Líq.',
  'Liq. Corr.',
  'ROIC',
  'ROE',
  'Liq.2meses',
  'Patrim. Líq',
  'Dív.Líq/ Patrim.',
  'Cresc. Rec.5a',
];

const DETAIL_LABEL_TO_HEADER: Record<string, string> = {
  'Cotação': 'Cotação',
  'P/L': 'P/L',
  'P/VP': 'P/VP',
  'PSR': 'PSR',
  'Div. Yield': 'Div.Yield',
  'P/Ativos': 'P/Ativo',
  'P/Cap. Giro': 'P/Cap.Giro',
  'P/EBIT': 'P/EBIT',
  'P/Ativ Circ Liq': 'P/Ativ Circ.Liq',
  'EV / EBIT': 'EV/EBIT',
  'EV / EBITDA': 'EV/EBITDA',
  'Marg. Bruta': 'Mrg Bruta',
  'Marg. EBIT': 'Mrg Ebit',
  'Marg. Líquida': 'Mrg. Líq.',
  'Liquidez Corr': 'Liq. Corr.',
  'ROIC': 'ROIC',
  'ROE': 'ROE',
  'Patrim. Líq': 'Patrim. Líq',
  'Dív Líq / Patrim': 'Dív.Líq/ Patrim.',
  'Vol $ méd (2m)': 'Liq.2meses',
  'Cres. Rec (5a)': 'Cresc. Rec.5a',
};

const MIN_EXPECTED_DETAIL_FIELDS = 5;

function buildStockInCanonicalOrder(raw: Record<string, string | null>): Stock {
  const stock: Stock = {};
  for (const field of CANONICAL_FIELDS) {
    if (raw[field] !== undefined) {
      stock[field] = raw[field];
    }
  }
  for (const key of Object.keys(raw)) {
    if (stock[key] === undefined) {
      stock[key] = raw[key];
    }
  }
  return stock;
}

function parseStockDetails(document: Element, paper: string): Stock {
  const labels = Array.from(document.querySelectorAll('td.label'))
    .map((element: Element) => element.textContent.replaceAll('?', '').trim());
  const data = Array.from(document.querySelectorAll('td.data'))
    .map((element: Element) => element.textContent.trim());
  const raw: Record<string, string | null> = { 'Papel': paper };
  labels.forEach((label: string, index: number) => {
    const header = DETAIL_LABEL_TO_HEADER[label];
    if (header && raw[header] === undefined) {
      raw[header] = data[index];
    }
  });
  const fieldCount = Object.keys(raw).length - 1;
  if (fieldCount < MIN_EXPECTED_DETAIL_FIELDS) {
    console.warn(`[parseStockDetails] ${paper}: only ${fieldCount} fields parsed — DETAIL_LABEL_TO_HEADER may be out of date`);
  }
  return buildStockInCanonicalOrder(raw);
}
