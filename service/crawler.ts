export async function crawler(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return new TextDecoder('iso-8859-1').decode(buffer);
}
