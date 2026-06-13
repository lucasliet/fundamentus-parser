import { Stock } from '../types/Stock.d.ts';

const NUMBER_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPercentValue(value: number): string {
  return NUMBER_FORMATTER.format(value) + '%';
}

export function addGrahamValueTo(stocks: Stock[]) {
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

function parseUpsidePercent(value: string): number {
  return parseFloat(value.replace('%', '').replace(',', '.'));
}

export function sortStocksByGrahamUpside(stocks: Stock[]) {
  return stocks.filter((stock: Stock) =>
    stock.graham !== null && parseFloat(stock.graham) > 0 &&
    stock['P/L'] !== null && parseFloat(stock['P/L'].replace(',', '.')) > 0
  ).sort((a: Stock, b: Stock) =>
    parseUpsidePercent(b.upside as string) - parseUpsidePercent(a.upside as string)
  );
}
