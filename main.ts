import opine, { json } from 'https://deno.land/x/opine@2.3.3/mod.ts';
import { DOMParser, Element, Node } from 'https://deno.land/x/deno_dom@v0.1.36-alpha/deno-dom-wasm.ts';

const app = opine();

app.use(json());

const fundamentusData: string =
  await fetch('https://www.fundamentus.com.br/resultado.php')
    .then((response) => response.text())

const stocksElement: Element =
  new DOMParser().parseFromString(fundamentusData, 'text/html')
    ?.querySelector('#resultado')!;

const headers: string[] =
  Array.from(stocksElement!.querySelector('thead tr')!.children)
    .map((headerEl: Element) => headerEl.textContent);

const stocks: { [header: string]: string }[][] =
  Array.from(stocksElement!.querySelectorAll('tbody tr'))
    .map((row: Node) =>
      Array.from((row as Element).children).map((value: Element, index: number) =>
        ({ [headers[index]]: value.textContent })
      )
    );

app.get("/", (_, res) => res.send(stocks));

app.listen(3333);