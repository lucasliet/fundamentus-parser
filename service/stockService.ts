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

  for (const paper of ["AGRO3", "TUPY3"]) {
    if (!stocks.some((stock) => stock.Papel === paper)) {
      const stockDetail = await scrapeStockDetail(paper);
      if (stockDetail) {
        stocks.push(stockDetail);
      }
    }
  }

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
  return await fetch(url)
    .then((response: Response) => response.text())
    .then((html: string) =>
      html.replace(/Cota��o/g, 'Cotação')
        .replace(/D�v.Brut\/ Patrim./g, 'Dív.Brut/Patrim.')
        .replace(/Mrg\. L�q\./g, 'Mrg. Líq.')
        .replace(/Patrim\. L�q/g, 'Patrim. Líq')
        .replace(/D�v\.Brut\/ Patrim\./g, 'Dív.Brut/Patrim.')
    );
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
  return stocks.filter((stock: Stock) => parseFloat(stock.graham) > 0)
    .filter((stock: Stock) => parseFloat(stock['P/L'].replace(',', '.')) > 0)
    .sort((a: Stock, b: Stock) => {
      const aUpside = parseFloat(a.upside.replace('%', '').replace(',', '.'));
      const bUpside = parseFloat(b.upside.replace('%', '').replace(',', '.'));
      return bUpside - aUpside;
    });
}

function addGrahamValueTo(stocks: Stock[]) {
  return stocks.map((stock: Stock) => {
    const pl = parseFloat(stock['P/L'].replace(',', '.'));
    const pvp = parseFloat(stock['P/VP'].replace(',', '.'));
    const price = parseFloat(stock['Cotação'].replace(',', '.'));
    const lpa = price / pl;
    const vpa = price / pvp;
    const grahamProduct = 22.5 * lpa * vpa;
    const grahamValue = grahamProduct > 0 ? Math.sqrt(grahamProduct) : 0;
    const upside = ((grahamValue / price) - 1) * 100;
    stock.lpa = NUMBER_FORMATTER.format(lpa);
    stock.vpa = NUMBER_FORMATTER.format(vpa);
    stock.graham = NUMBER_FORMATTER.format(grahamValue);
    stock.upside = formatPercentValue(upside);
    return stock;
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
  const details = parseStockDetails(document, paper);
  const stock: Stock = {
    'Papel': paper,
    'Cotação': details['Cotação'] || '0,00',
    'P/L': details['P/L'] || '0,00',
    'P/VP': details['P/VP'] || '0,00'
  };
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
function parseStockDetails(document: Element, paper: string): Stock {
  const labels = Array.from(document.querySelectorAll('td.label'))
    .map((element: Element) => element.textContent.replaceAll('?', '').trim());
  const data = Array.from(document.querySelectorAll('td.data'))
    .map((element: Element) => element.textContent.trim());
  const stock: Stock = { 'Papel': paper };
  labels.map((label: string, index: number) => {
    stock[label] = data[index];
  });
  return stock;
}