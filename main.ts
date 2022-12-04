import opine, { json } from 'https://deno.land/x/opine@2.3.3/mod.ts';
import { opineCors } from 'https://deno.land/x/cors@v1.2.2/mod.ts';

import { getStocks } from './service/stockService.ts';
import { Stock } from './types/Stock.d.ts';

const app = opine();

app.use(opineCors());
app.use(json());

const stocks = await getStocks();

console.info(`📈 collected ${stocks.length} stocks, ${JSON.stringify(stocks[0])}`,);

app.get('/', (_, res) => res.json(stocks));

app.get('/:paper', (req, res) => {
  const paper = req.params.paper.toUpperCase();
  const stock = stocks.find((stock: Stock) => stock.Papel === paper);
  if (stock) {
    res.json(stock);
  } else {
    res.status = 404;
    res.json({ error: `stock ${paper} not found` });
  }
});

app.listen(3333);