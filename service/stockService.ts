import { Stock } from '../types/Stock.d.ts';
import { crawler } from './crawler.ts';
import { parseElement, parseHeaders, parseStocks } from './parser.ts';
import { parseStockDetails } from './detailMapper.ts';
import { addGrahamValueTo, sortStocksByGrahamUpside } from './graham.ts';

const FUNDAMENTUS_URL = 'https://www.fundamentus.com.br/resultado.php?&interface=classic';

export async function getStocks(): Promise<Stock[]> {
  const fundamentusHtml = await crawler(FUNDAMENTUS_URL);
  const fundamentusStocks = parseFundamentusStocks(fundamentusHtml);
  const stocks = addGrahamValueTo(fundamentusStocks);
  return sortStocksByGrahamUpside(stocks);
}

function parseFundamentusStocks(fundamentusHtml: string): Stock[] {
  const stocksElement = parseElement(fundamentusHtml, '#resultado');
  const headers = parseHeaders(stocksElement);
  return parseStocks(stocksElement, headers);
}

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
