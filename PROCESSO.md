# PROCESSO.md

## Ferramentas usadas

Claude (via chat, modelo Sonnet), usado como parceiro técnico durante praticamente todo o desenvolvimento — desde a análise inicial do enunciado e decisões de arquitetura até a escrita de cada parser, o backend, o frontend e a infraestrutura de deploy. A condução foi minha: eu tomava as decisões de trade-off quando havia mais de uma resposta razoável, testava cada trecho de código no meu ambiente antes de seguir pro próximo passo, e mandava de volta o resultado real (incluindo erros e logs) pra confirmar ou corrigir o próximo passo.

## Pontos em que o agente errou

1. **Regex cruzando quebra de linha no parser da ficha financeira (`holeriteFichaFinanceira.ts`).** Uma primeira versão do parser de campos usava um regex sem âncora de linha, que acabou capturando o final da string `abr-17` (do cabeçalho de competência) como se fosse o código de um campo da linha seguinte, deslocando todos os valores em cascata. Só percebemos rodando contra o texto real extraído do PDF — o resultado batia visualmente estranho (campos com nomes e valores sem sentido), o que levou a isolar e corrigir o regex pra trabalhar linha por linha.

2. **Corrupção de encoding em regex com acento (`holeriteTabular.ts`).** Depois de validar esse parser funcionando, uma edição posterior (feita via terminal do Windows) corrompeu os caracteres acentuados dentro de uma expressão regular — `ç`, `ã`, `í` viraram caracteres de substituição inválidos, quebrando silenciosamente a detecção de assinatura do layout (`Descrição` deixou de bater). O sintoma foi o parser, que já tinha funcionado, começar a retornar `null` pra todas as páginas depois de uma mudança aparentemente não relacionada. A correção definitiva foi trocar todo acento usado dentro de regex por escape Unicode (`\u00e7` em vez de `ç`), que é imune a esse tipo de problema de codificação do terminal.

3. **Bug de "Regras dos Hooks" do React só visível em produção.** Uma correção de ordem de hooks (`useMemo`) no componente de tabela do frontend levou a computar as duas tabelas possíveis (cartão de ponto e holerite) sempre, mas sem checar se o formato do dado batia com a função chamada — rodando a lógica de cartão de ponto em cima de dado de holerite (e vice-versa) quando o tipo do documento mudava entre um upload e outro na mesma sessão do navegador. Isso não apareceu nos testes locais (só tinha testado um tipo por vez, recarregando a página entre eles) e só quebrou depois do deploy real, ao alternar holerite → cartão de ponto sem recarregar. A correção foi adicionar uma guarda explícita por tipo antes de rodar cada transformação.

## O que foi decidido manualmente

Todo o código foi efetivamente escrito pelo agente, mas nada foi aceito sem eu rodar e conferir contra dado real antes de seguir — inclusive vários dos pontos acima só foram pegos porque eu testava cada etapa contra os PDFs de exemplo (ou, depois, contra o ambiente de produção) antes de avançar. As decisões de arquitetura, trade-off e prioridade (o que implementar primeiro, quando cortar escopo, quando inverter a ordem planejada) foram sempre minhas, com o agente apresentando as opções e argumentos.

## Três decisões com mais de uma resposta razoável

1. **Stack do desafio: Node.js/TypeScript no lugar de Java/Spring Boot.** Minha fluência real hoje é maior em Java, e o desafio permite qualquer linguagem. Escolhi Node/React mesmo assim porque são as tecnologias citadas como diferencial na vaga, e a sessão de extensão ao vivo depois da entrega provavelmente usaria essa stack — o ganho de sinal pra vaga pesou mais que a fluência ligeiramente menor.

2. **`payroll-01` (ficha financeira): uma entrada por competência, não uma por página.** O documento tem várias competências de folha de pagamento numa única página física do PDF. Decidimos desdobrar isso em várias entradas no array `pages[]`, todas compartilhando o mesmo número de página — mais fiel ao dado real, mesmo indo contra a suposição implícita de "1 página = 1 competência" que parece natural no resto do contrato.

3. **PDF original guardado em memória, sem persistência**, só para alimentar o visualizador de PDF no frontend. Evita complexidade de armazenamento sem necessidade pro escopo do desafio, mas é uma decisão que não escalaria pra produção real sem definir política de retenção e armazenamento adequados (documentado no SOLUCAO.md).

## O que quebra primeiro em produção

Armazenamento em memória: um restart do processo (deploy novo, crash, ou o serviço "dormindo" no free tier) apaga todas as transcrições em andamento — não há persistência nenhuma. Em segundo lugar, o OCR é lento e roda sem paralelismo real; num ambiente de CPU fraca (como o free tier usado no deploy), processar vários PDFs escaneados grandes ao mesmo tempo degradaria a experiência rapidamente, mesmo com o timeout de 3 minutos que adicionamos (que evita o status ficar preso, mas não cancela o trabalho de verdade em andamento).

## Onde não confio 100% no que foi entregue

O OCR do cartão de ponto (usado nos documentos escaneados) às vezes perde dias inteiros do mês quando o próprio número do dia é mal reconhecido pelo Tesseract — não é um filtro deliberado, é o parser simplesmente não encontrando um padrão de dia válido naquela linha de texto reconhecido. Validamos isso contra um dos PDFs de exemplo e confirmamos que páginas específicas saem com menos dias que o esperado. Também não confio totalmente nas heurísticas de separação `fields`/`bases` dos três layouts de holerite fora dos exemplos vistos — cada uma foi ajustada e validada contra um layout específico, e um holerite de layout diferente dos três conhecidos cairia direto como página vazia, sem tentativa de extração.

## Um quarto ponto (descoberto durante o deploy real)

**Timeouts de frontend e backend descasados.** Adicionamos um timeout de processamento no backend (inicialmente 3 minutos, depois aumentado pra 6 no free tier) sem revisar se o polling do frontend esperava tempo suficiente - o frontend desistia sozinho depois de 2 minutos (`MAX_TENTATIVAS_POLLING = 60`, criado antes do timeout do backend existir), mesmo quando o backend ainda tinha margem pra terminar. O sintoma foi um cartao de ponto escaneado (que passa por OCR, mais lento) aparentar estar "travado" no navegador, quando na verdade o problema era o frontend desistindo de esperar antes da hora. So percebemos isso testando contra o ambiente de producao real (Render free tier, CPU mais fraca que a maquina de desenvolvimento, onde o OCR demora mais e o descompasso ficou visivel). Corrigido alinhando os dois timeouts com folga entre si (6min no backend, 8min no polling do frontend).

