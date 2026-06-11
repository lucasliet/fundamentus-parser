# Fundamentus Parser

Este projeto é uma API desenvolvida com [Deno](https://deno.land/) e o framework [Hono](https://hono.dev/) que realiza a coleta (*web scraping*) e a análise de dados de ações brasileiras a partir do site [Fundamentus](https://www.fundamentus.com.br/).

Além de coletar os dados, a API calcula o **Preço Justo de Graham** e o respectivo potencial de valorização (*upside*) de cada ação em relação à sua cotação atual.

## Funcionalidades

- **Coleta de dados**: Varre o site Fundamentus buscando dados atualizados de ações.
- **Cálculo da Fórmula de Graham**:
  $$\text{Valor Graham} = \sqrt{22,5 \times \text{LPA} \times \text{VPA}}$$
  - **LPA**: Lucro por Ação
  - **VPA**: Valor Patrimonial por Ação
- **Ordenação por Potencial (Upside)**: As ações são retornadas ordenadas decrescentemente pelo percentual de *upside* em relação à cotação atual.
- **Busca por papel**: Filtro rápido para obter dados de uma ação específica.

## Arquivos e Estrutura do Projeto

- [deno.json](file:///home/lucas/fundamentus-parser/deno.json): Configuração e definição de tarefas do Deno.
- [main.ts](file:///home/lucas/fundamentus-parser/main.ts): Ponto de entrada do servidor Hono e definição das rotas da API.
- [service/stockService.ts](file:///home/lucas/fundamentus-parser/service/stockService.ts): Serviço que realiza a raspagem, processamento, cálculo do valor de Graham e ordenação das ações.
- [types/Stock.d.ts](file:///home/lucas/fundamentus-parser/types/Stock.d.ts): Definição de tipo TypeScript para as ações brasileiras coletadas.
- [static/robots.txt](file:///home/lucas/fundamentus-parser/static/robots.txt): Configurações para rastreadores web.

## Como Executar

### Pré-requisitos
É necessário possuir o [Deno](https://deno.land/) instalado na máquina.

### Executando a API
Para iniciar o servidor local, execute o seguinte comando na raiz do projeto:

```bash
deno task start
```

Isso iniciará o servidor na porta `3333`.

## Endpoints da API

### Listar todas as ações
Retorna a lista de ações que possuem P/L e *upside* positivos em relação ao valor de Graham, ordenadas pelo maior *upside*.

- **Rota**: `GET /`
- **Exemplo de Resposta**:
  ```json
  [
    {
      "Papel": "PETR4",
      "Cotação": "38,50",
      "P/L": "4,10",
      "P/VP": "1,15",
      "graham": "61,20",
      "upside": "58,96%",
      "lpa": "9,39",
      "vpa": "33,48"
    }
  ]
  ```

### Buscar ação por papel
Retorna as informações detalhadas de uma ação específica pelo seu símbolo/papel.

- **Rota**: `GET /:paper` (ex: `GET /vale3`)
- **Exemplo de Resposta**:
  ```json
  {
    "Papel": "VALE3",
    "Cotação": "62,10",
    "P/L": "5,30",
    "P/VP": "1,35",
    "graham": "78,40",
    "upside": "26,25%",
    "lpa": "11,71",
    "vpa": "46,00"
  }
  ```
