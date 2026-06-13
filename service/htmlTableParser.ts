import { DOMParser, Element, Node } from "deno-dom";
import { Stock } from '../types/Stock.d.ts';

const DOM_PARSER = new DOMParser();

export function parseElement(html: string, selector: string): Element {
  return DOM_PARSER.parseFromString(html, 'text/html')
    ?.querySelector(selector)!;
}

export function parseHeaders(document: Element): string[] {
  return Array.from(document.querySelector('thead tr')!.children)
    .map((element: Element) => element.textContent.replaceAll('\n', '').trim());
}

export function parseStocks(document: Element, headers: string[]): Stock[] {
  return Array.from(document.querySelectorAll('tbody tr'))
    .map((row: Node) => {
      const stock: Stock = {};
      Array.from((row as Element).children).forEach((value: Element, index: number) => {
        stock[headers[index]] = value.textContent.replaceAll('\n', '').trim();
      });
      return stock;
    });
}
