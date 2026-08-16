# SOLUCAO.md

## Como rodar

```
docker compose up
```
Deploy real testado no Render (frontend e backend, cada um em Docker separado).

Local, sem Docker:
```
cd backend
npm install
npm run dev
```

## Stack

- **Backend:** Node.js + TypeScript + Express
- **Frontend:** React + TypeScript + Vite + Material UI (ainda nÃ£o implementado nesta entrega)
- **ExtraÃ§Ã£o de texto nativo:** `pdfjs-dist`, agrupando itens por coordenada Y/X em linhas e colunas (em vez de concatenar tudo num blob) - necessÃ¡rio porque os documentos sÃ£o tabulares e a ordem/posiÃ§Ã£o do texto carrega significado.
- **OCR:** Tesseract.js (`tesseract.js` + `@napi-rs/canvas` para rasterizar a pÃ¡gina via `pdfjs-dist`). Escolhido por ser puro Node, sem dependÃªncia de conta/serviÃ§o de nuvem - trade-off aceito: qualidade de reconhecimento inferior a serviÃ§os pagos (Textract, Google Vision), mas suficiente para o "melhor esforÃ§o" que o desafio permite.
- **Armazenamento:** em memÃ³ria (`Map`), sem banco. Simples o suficiente para o escopo (1 recurso, sem relaÃ§Ã£o entre entidades). Risco conhecido: nÃ£o sobrevive a restart do processo - aceitÃ¡vel para o prazo, documentado como o que quebra primeiro em produÃ§Ã£o.
- **Fila/processamento assÃ­ncrono:** sem fila externa (Redis/Kafka/etc) - um worker em processo, disparado via `setImmediate`/`async` direto no `POST`, respondendo `202` antes de terminar. Overengineering evitado dado o volume esperado.

## Contrato HTTP

Implementado literalmente conforme o README: `POST /api/transcricoes`, `GET /api/transcricoes/:id`, `PUT /api/transcricoes/:id`, `GET /api/transcricoes/:id/planilha`, `GET /healthz`.

## ExtraÃ§Ã£o - Holerite

TrÃªs layouts reais nos exemplos, cada um com parser prÃ³prio (`holeriteTabular.ts`, `holeriteFichaFinanceira.ts`, `holeriteDeclaracao.ts`), roteados em sequÃªncia por `holeriteRouter.ts` (`payroll-03` â†’ tabular; `payroll-01` â†’ ficha financeira multi-competÃªncia; `payroll-02` â†’ declaraÃ§Ã£o). Se nenhum layout bate, a pÃ¡gina fica marcada como vazia (`fields: [], bases: []`) em vez de inventar dado ou quebrar - cobre tanto layout desconhecido quanto o caso do `payroll-04` (tem camada de texto, mas sÃ³ o carimbo de assinatura, sem dado real).

**DecisÃ£o - `payroll-01` (ficha financeira):** uma pÃ¡gina do PDF contÃ©m vÃ¡rias competÃªncias (blocos "Folha Normal MÃªs: X", "Adiantamento - PLR", "13 Salario"). Decidimos desdobrar em uma entrada por competÃªncia no array `pages[]`, todas compartilhando o mesmo nÃºmero de `page` - trade-off entre fidelidade ao dado real (vÃ¡rias competÃªncias existem de fato) e a suposiÃ§Ã£o implÃ­cita de "1 pÃ¡gina = 1 competÃªncia" que o restante do contrato sugere.

**DecisÃ£o - separaÃ§Ã£o `fields`/`bases`:** cada layout usa heurÃ­stica prÃ³pria (lista fechada de rÃ³tulos conhecidos como "BASEDECALCULODOINSS", "Base I.N.S.S.:", ou regex genÃ©rico `RÃ³tulo: valor` na zona apÃ³s a tabela de verbas, dependendo do layout). Ã‰ o ponto mais arriscado de errar silenciosamente - documentado por layout no cÃ³digo.

## ExtraÃ§Ã£o - CartÃ£o de ponto

**Texto nativo (`cartaoPontoTexto.ts`):** agrupa linhas por dia (`N - SEG`), removendo a coluna "Jornada" (sempre repetida, nÃ£o Ã© batida) e a coluna "Qtde" de horas extras (que tambÃ©m estÃ¡ em formato HH:MM e seria confundida com batida se nÃ£o filtrada por palavra-chave de OcorrÃªncia precedente).

**DecisÃ£o - `date_raw` reconstruÃ­do:** o documento nÃ£o imprime a data completa por linha, sÃ³ o dia do mÃªs (`17 - TER`). `date_raw` Ã© reconstruÃ­do como `DD/MM/AAAA` a partir do dia da linha + `MÃªs/Ano` do cabeÃ§alho da pÃ¡gina - nÃ£o Ã© uma leitura literal, Ã© uma inferÃªncia decidida conscientemente (a alternativa seria nÃ£o preencher `date_raw` de jeito nenhum, o que quebraria o contrato).

**OCR (`cartaoPontoOCR.ts`):** usado para pÃ¡ginas sem camada de texto (`time-card-02/03/04`). Layout diferente do texto nativo (colunas "Entrada/SaÃ­da/Intervalo" numa Ãºnica linha por dia, sem repetiÃ§Ã£o de dia em mÃºltiplas linhas). Extrai pares `HH:MM-HH:MM` da linha via regex.

**DecisÃ£o - reconstruÃ§Ã£o de horÃ¡rio sem `:`:** o OCR Ã s vezes lÃª "1815" em vez de "18:15" (perde o separador). Quando o resultado tem exatamente 4 dÃ­gitos, reconstruÃ­mos `HH:MM` - Ã© uma inferÃªncia assumida conscientemente (documentada aqui), nÃ£o uma leitura direta. Fora esse padrÃ£o (ruÃ­do sem forma reconhecÃ­vel), o valor nÃ£o vira batida - preferimos honestidade a chute.

## Avisos derivados

Calculados em `avisos.ts`, como funÃ§Ãµes puras - nunca armazenados no JSON da transcriÃ§Ã£o, calculados sob demanda (na hora de exibir na UI e na hora de gerar a planilha). Cobre os 4 casos do enunciado: batidas Ã­mpares, data nÃ£o sequencial (cartÃ£o de ponto), pÃ¡gina vazia e mÃªs nÃ£o sequencial (holerite) - incluindo os dois casos-armadilha do enunciado: dezembroâ†’janeiro conta como sequencial, e competÃªncias ilegÃ­veis nÃ£o quebram a cadeia (compara-se com a Ãºltima legÃ­vel).

**Risco em aberto:** essa lÃ³gica hoje sÃ³ existe no backend. Quando o frontend for implementado, ele vai precisar da mesma lÃ³gica para destacar a tabela de revisÃ£o - como backend e frontend sÃ£o pacotes npm separados (sem workspace compartilhado), isso vai gerar duplicaÃ§Ã£o de cÃ³digo entre os dois lados, ou exigir um endpoint extra nÃ£o previsto no contrato. DecisÃ£o de como resolver isso ainda pendente.

## SeguranÃ§a

- Upload validado por magic bytes (`%PDF-`), nÃ£o sÃ³ extensÃ£o - um `.txt` renomeado para `.pdf` Ã© rejeitado com `400`.
- Limite de tamanho de upload: 20MB (`multer`), retorna `400` em vez de derrubar o processo.
- (Pendente: timeout de processamento, polÃ­tica de retenÃ§Ã£o explÃ­cita, revisÃ£o de logs sem PII.)

## O que ainda falta (nesta entrega em progresso)

- Frontend (upload, tabela de revisÃ£o, PDF ao lado, download) - nÃ£o implementado ainda.
- GeraÃ§Ã£o de planilha (xlsx/csv/json) - `GET /planilha` retorna `501` para `xlsx`/`csv` no momento; sÃ³ `json` funciona.
- OCR para holerite (hoje sÃ³ cartÃ£o de ponto usa fallback de OCR - holerite sem layout reconhecido vira pÃ¡gina vazia direto, sem tentar OCR).
- CI minima (lint + testes no GitHub Actions) - nao implementada.
- Testes automatizados.

## Riscos conhecidos / o que provavelmente quebra primeiro em produÃ§Ã£o

- Armazenamento em memÃ³ria: reinÃ­cio do processo perde todas as transcriÃ§Ãµes em andamento.
- OCR Ã© lento (~segundos por pÃ¡gina) e roda de forma sÃ­ncrona dentro do worker - um PDF escaneado grande pode deixar o processamento visivelmente lento; nÃ£o hÃ¡ timeout nem cancelamento.
- Layouts de holerite fora dos 3 conhecidos caem direto para "pÃ¡gina vazia" (sem tentativa de OCR) - cobertura de layout Ã© limitada aos exemplos vistos.

## Onde nÃ£o confio 100% no que foi entregue

- OCR do cartÃ£o de ponto: alguns dias do mÃªs somem silenciosamente quando o nÃºmero do dia em si Ã© mal reconhecido pelo Tesseract (nÃ£o Ã© filtrado de propÃ³sito - o parser simplesmente nÃ£o encontra um padrÃ£o de dia vÃ¡lido naquela linha). Validado contra `time-card-02.pdf`: pÃ¡ginas 2 e 3 tÃªm menos de 30/31 dias reconhecidos.
- SeparaÃ§Ã£o `fields`/`bases` nos 3 layouts de holerite foi validada manualmente contra os exemplos fornecidos, mas as heurÃ­sticas sÃ£o especÃ­ficas desses layouts - um holerite de layout diferente nÃ£o seria reconhecido (cairia como pÃ¡gina vazia).

## Frontend - Upload

Formulario de upload (`UploadForm.tsx`) com escolha do tipo, envio via `FormData`, e polling do status a cada 2s (timeout de ~2min) ate `concluido`/`erro`.

**Decisao - URL da API configuravel:** `VITE_API_URL` via variavel de ambiente, com fallback pra `http://localhost:3000` em dev. Precisa ser setada corretamente no Docker Compose/deploy final.

**Decisao - tipos duplicados:** `frontend/src/types.ts` espelha manualmente os tipos do backend (`backend/src/types.ts`) - sem workspace compartilhado entre os dois pacotes npm, entao qualquer mudanca no contrato precisa ser replicada nos dois lados manualmente. Mesmo risco ja documentado para a logica de avisos derivados.

## PDF original em memoria

O buffer do PDF enviado e guardado em memoria (Map separado, `buffersPdf` em `store.ts`), servido via `GET /api/transcricoes/:id/pdf`, so para alimentar o visualizador no frontend (`<embed>` nativo do navegador). Decisao especifica para o escopo do desafio - evita complexidade de armazenamento persistente sem necessidade. Em producao, exigiria definir estrategia adequada de armazenamento e retencao/PII para os PDFs originais (hoje ficam na memoria pelo tempo de vida do processo, sem limite nem expiracao).

## Seguranca - revisao final

- Timeout de processamento: 3 minutos por transcricao (`worker.ts`). Protege contra status preso em "processando" indefinidamente (OCR travado, PDF corrompido) - mas nao cancela o trabalho de fato, so evita que o status fique preso. Cancelamento real exigiria propagar AbortController ate o Tesseract, fora do escopo.
- Sem PII em log: confirmado por revisao manual - o unico console.log que roda em producao (index.ts) e "Backend rodando na porta X", sem dado de documento algum. Scripts de depuracao (testarX.ts) tem logs de conteudo real, mas nunca rodam dentro do servidor Express - sao scripts standalone chamados manualmente via ts-node, nao fazem parte do runtime.
- Upload: magic bytes (%PDF-) + limite de 20MB, ambos retornando 400 sem derrubar o processo.

## Politica de retencao

- PDFs originais e transcricoes ficam em memoria (Map), pelo tempo de vida do processo - sem persistencia em disco, sem banco.
- Nao ha expiracao/limpeza automatica implementada: os dados ficam ate o processo reiniciar (redeploy, restart do container, ou o servico "dormir" no free tier).
- Uploads simultaneos: sem fila/limite - cada requisicao processa de forma independente e concorrente. Em memoria RAM limitada (free tier: 512MB), um numero grande de uploads simultaneos de PDFs grandes poderia esgotar memoria - risco conhecido, nao mitigado nesta entrega (fora do escopo dado o volume esperado no desafio).
- Em producao real, isso exigiria: expiracao automatica dos dados (ex: TTL de X horas), armazenamento persistente com politica de retencao explicita (ex: apagar PDF original apos N dias, manter so a transcricao), e criptografia em repouso dado que os documentos contem CPF, salario e dados pessoais sensiveis.

## Layout desconhecido de cartao de ponto

`time-card-03.pdf` e `time-card-04.pdf` sao layouts de cartao de ponto que a aplicacao nao sabe ler - descoberto testando contra o ambiente de producao real. O `03` e escaneado com um formato de cabecalho diferente do que o parser de OCR reconhece (usa "Periodo: DD/MM/AAAA a DD/MM/AAAA", enquanto nosso parser (`cartaoPontoOCR.ts`) procura o padrao "Mes/Ano: MM/AAAA" visto no `time-card-02`, que foi o unico exemplo escaneado usado pra construir esse parser). O `04` e um layout totalmente diferente (ficha manuscrita/preenchida a mao, formato "1.QUINZENA" com colunas Manha/Tarde/Extra). Em ambos os casos a aplicacao reconhece corretamente que nao sabe ler o documento e devolve tabela vazia, honesta, em vez de inventar dado ou quebrar - mas isso significa que, dos 4 cartoes de ponto de exemplo, apenas 2 (`time-card-01`, texto nativo, e `time-card-02`, OCR) tem extracao de fato implementada. Decisao consciente de escopo dado o tempo disponivel: cobrir bem os layouts que geraram parser dedicado, em vez de tentar suportar todo layout possivel - conforme a propria orientacao do enunciado ("nao existe uma unica resposta certa" para registros que nao fazem sentido, e "responder 'nao sei ler' e melhor que devolver lixo").







