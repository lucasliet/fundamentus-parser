import opine, { json } from 'https://deno.land/x/opine@2.3.3/mod.ts';
import { DOMParser, Element, Node } from 'https://deno.land/x/deno_dom@v0.1.36-alpha/deno-dom-wasm.ts';

const app = opine();

app.use(json());

const fundamentusData: string =
  await fetch('https://www.fundamentus.com.br/resultado.php')
    .then((response) => response.text());

const stocksElement: Element =
  new DOMParser().parseFromString(fundamentusData, 'text/html')
    ?.querySelector('#resultado')!;

const headers: string[] =
  Array.from(stocksElement!.querySelector('thead tr')!.children)
    .map((headerEl: Element) => headerEl.textContent);

type Stock = { [header: string]: string };
const stocks: Stock[] =
  Array.from(stocksElement!.querySelectorAll('tbody tr'))
    .map((row: Node) =>{
      const stock: Stock = {};
      Array.from((row as Element).children).map((value: Element, index: number) => {
        stock[headers[index]] = value.textContent;
      })
      return stock;
    });

console.info(`📈 collected ${stocks.length} stocks, ${JSON.stringify(stocks[0])}...`);

app.get("/", (_, res) => res.send(stocks));

app.get("/:paper", (req, res) => {
  const paper = req.params.paper.toUpperCase();
  const stock = stocks.find((stock) => stock.Papel === paper);
  if (stock) {
    res.send(stock);
  } else {
    res.status = 404;
    res.send({ error: `stock ${paper} not found` });
  }
});

app.listen(3333);