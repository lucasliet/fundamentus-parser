import { Element } from "deno-dom";
import { Stock } from '../types/Stock.d.ts';

export const CANONICAL_FIELDS = [
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

export function parseStockDetails(document: Element, paper: string): Stock {
  const labels = Array.from(document.querySelectorAll('td.label'))
    .map((element: Element) => element.textContent.replaceAll('?', '').trim());
  const cellValues = Array.from(document.querySelectorAll('td.data'))
    .map((element: Element) => element.textContent.trim());
  const raw: Record<string, string | null> = { 'Papel': paper };
  labels.forEach((label: string, index: number) => {
    const header = DETAIL_LABEL_TO_HEADER[label];
    if (header && raw[header] === undefined) {
      raw[header] = cellValues[index];
    }
  });
  const fieldCount = Object.keys(raw).length - 1;
  if (fieldCount < MIN_EXPECTED_DETAIL_FIELDS) {
    console.warn(`[parseStockDetails] ${paper}: only ${fieldCount} fields parsed — DETAIL_LABEL_TO_HEADER may be out of date`);
  }
  return buildStockInCanonicalOrder(raw);
}
