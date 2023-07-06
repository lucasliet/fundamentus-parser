import { DOMParser, Element, Node } from 'https://deno.land/x/deno_dom@v0.1.36-alpha/deno-dom-wasm.ts';
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
    const grahamValue = Math.sqrt(22.5 * lpa * vpa);
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