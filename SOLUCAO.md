# SOLUCAO.md

## Como rodar

```
docker compose up
```
(Preencher/confirmar quando o Docker Compose final estiver pronto - passo pendente.)

Local, sem Docker:
```
cd backend
npm install
npm run dev
```

## Stack

- **Backend:** Node.js + TypeScript + Express
- **Frontend:** React + TypeScript + Vite + Material UI (ainda não implementado nesta entrega)
- **Extração de texto nativo:** `pdfjs-dist`, agrupando itens por coordenada Y/X em linhas e colunas (em vez de concatenar tudo num blob) - necessário porque os documentos são tabulares e a ordem/posição do texto carrega significado.
- **OCR:** Tesseract.js (`tesseract.js` + `@napi-rs/canvas` para rasterizar a página via `pdfjs-dist`). Escolhido por ser puro Node, sem dependência de conta/serviço de nuvem - trade-off aceito: qualidade de reconhecimento inferior a serviços pagos (Textract, Google Vision), mas suficiente para o "melhor esforço" que o desafio permite.
- **Armazenamento:** em memória (`Map`), sem banco. Simples o suficiente para o escopo (1 recurso, sem relação entre entidades). Risco conhecido: não sobrevive a restart do processo - aceitável para o prazo, documentado como o que quebra primeiro em produção.
- **Fila/processamento assíncrono:** sem fila externa (Redis/Kafka/etc) - um worker em processo, disparado via `setImmediate`/`async` direto no `POST`, respondendo `202` antes de terminar. Overengineering evitado dado o volume esperado.

## Contrato HTTP

Implementado literalmente conforme o README: `POST /api/transcricoes`, `GET /api/transcricoes/:id`, `PUT /api/transcricoes/:id`, `GET /api/transcricoes/:id/planilha`, `GET /healthz`.

## Extração - Holerite

Três layouts reais nos exemplos, cada um com parser próprio (`holeriteTabular.ts`, `holeriteFichaFinanceira.ts`, `holeriteDeclaracao.ts`), roteados em sequência por `holeriteRouter.ts` (`payroll-03` → tabular; `payroll-01` → ficha financeira multi-competência; `payroll-02` → declaração). Se nenhum layout bate, a página fica marcada como vazia (`fields: [], bases: []`) em vez de inventar dado ou quebrar - cobre tanto layout desconhecido quanto o caso do `payroll-04` (tem camada de texto, mas só o carimbo de assinatura, sem dado real).

**Decisão - `payroll-01` (ficha financeira):** uma página do PDF contém várias competências (blocos "Folha Normal Mês: X", "Adiantamento - PLR", "13 Salario"). Decidimos desdobrar em uma entrada por competência no array `pages[]`, todas compartilhando o mesmo número de `page` - trade-off entre fidelidade ao dado real (várias competências existem de fato) e a suposição implícita de "1 página = 1 competência" que o restante do contrato sugere.

**Decisão - separação `fields`/`bases`:** cada layout usa heurística própria (lista fechada de rótulos conhecidos como "BASEDECALCULODOINSS", "Base I.N.S.S.:", ou regex genérico `Rótulo: valor` na zona após a tabela de verbas, dependendo do layout). É o ponto mais arriscado de errar silenciosamente - documentado por layout no código.

## Extração - Cartão de ponto

**Texto nativo (`cartaoPontoTexto.ts`):** agrupa linhas por dia (`N - SEG`), removendo a coluna "Jornada" (sempre repetida, não é batida) e a coluna "Qtde" de horas extras (que também está em formato HH:MM e seria confundida com batida se não filtrada por palavra-chave de Ocorrência precedente).

**Decisão - `date_raw` reconstruído:** o documento não imprime a data completa por linha, só o dia do mês (`17 - TER`). `date_raw` é reconstruído como `DD/MM/AAAA` a partir do dia da linha + `Mês/Ano` do cabeçalho da página - não é uma leitura literal, é uma inferência decidida conscientemente (a alternativa seria não preencher `date_raw` de jeito nenhum, o que quebraria o contrato).

**OCR (`cartaoPontoOCR.ts`):** usado para páginas sem camada de texto (`time-card-02/03/04`). Layout diferente do texto nativo (colunas "Entrada/Saída/Intervalo" numa única linha por dia, sem repetição de dia em múltiplas linhas). Extrai pares `HH:MM-HH:MM` da linha via regex.

**Decisão - reconstrução de horário sem `:`:** o OCR às vezes lê "1815" em vez de "18:15" (perde o separador). Quando o resultado tem exatamente 4 dígitos, reconstruímos `HH:MM` - é uma inferência assumida conscientemente (documentada aqui), não uma leitura direta. Fora esse padrão (ruído sem forma reconhecível), o valor não vira batida - preferimos honestidade a chute.

## Avisos derivados

Calculados em `avisos.ts`, como funções puras - nunca armazenados no JSON da transcrição, calculados sob demanda (na hora de exibir na UI e na hora de gerar a planilha). Cobre os 4 casos do enunciado: batidas ímpares, data não sequencial (cartão de ponto), página vazia e mês não sequencial (holerite) - incluindo os dois casos-armadilha do enunciado: dezembro→janeiro conta como sequencial, e competências ilegíveis não quebram a cadeia (compara-se com a última legível).

**Risco em aberto:** essa lógica hoje só existe no backend. Quando o frontend for implementado, ele vai precisar da mesma lógica para destacar a tabela de revisão - como backend e frontend são pacotes npm separados (sem workspace compartilhado), isso vai gerar duplicação de código entre os dois lados, ou exigir um endpoint extra não previsto no contrato. Decisão de como resolver isso ainda pendente.

## Segurança

- Upload validado por magic bytes (`%PDF-`), não só extensão - um `.txt` renomeado para `.pdf` é rejeitado com `400`.
- Limite de tamanho de upload: 20MB (`multer`), retorna `400` em vez de derrubar o processo.
- (Pendente: timeout de processamento, política de retenção explícita, revisão de logs sem PII.)

## O que ainda falta (nesta entrega em progresso)

- Frontend (upload, tabela de revisão, PDF ao lado, download) - não implementado ainda.
- Geração de planilha (xlsx/csv/json) - `GET /planilha` retorna `501` para `xlsx`/`csv` no momento; só `json` funciona.
- OCR para holerite (hoje só cartão de ponto usa fallback de OCR - holerite sem layout reconhecido vira página vazia direto, sem tentar OCR).
- Docker Compose final, deploy, CI.
- Testes automatizados.

## Riscos conhecidos / o que provavelmente quebra primeiro em produção

- Armazenamento em memória: reinício do processo perde todas as transcrições em andamento.
- OCR é lento (~segundos por página) e roda de forma síncrona dentro do worker - um PDF escaneado grande pode deixar o processamento visivelmente lento; não há timeout nem cancelamento.
- Layouts de holerite fora dos 3 conhecidos caem direto para "página vazia" (sem tentativa de OCR) - cobertura de layout é limitada aos exemplos vistos.

## Onde não confio 100% no que foi entregue

- OCR do cartão de ponto: alguns dias do mês somem silenciosamente quando o número do dia em si é mal reconhecido pelo Tesseract (não é filtrado de propósito - o parser simplesmente não encontra um padrão de dia válido naquela linha). Validado contra `time-card-02.pdf`: páginas 2 e 3 têm menos de 30/31 dias reconhecidos.
- Separação `fields`/`bases` nos 3 layouts de holerite foi validada manualmente contra os exemplos fornecidos, mas as heurísticas são específicas desses layouts - um holerite de layout diferente não seria reconhecido (cairia como página vazia).
