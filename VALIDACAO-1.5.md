# Validação da versão 1.5.0 — Demonstrações

Executada em 24/10/2026 (horário de Brasília), com Node.js 24, Playwright, Chromium e IndexedDB real em perfis de teste isolados.

## Regras implementadas

- Aba Demonstrações entre DRE e Dados e empresas, com seis relatórios internos.
- Balanço lado a lado, totais gerais alinhados, comparativo anterior à esquerda e atual à direita. Resultado não transferido identificado separadamente e incluído na apresentação do PL. Sem coluna anterior quando não existem dados até a posição anterior.
- DRE por movimento, excluindo encerramentos; balanço acumulado incluindo encerramentos. Todos os relatórios refletem os dados atuais.
- Configuração por empresa, com herança da classificação sintética e prevalência da conta mais específica, sem duplicação das analíticas.
- DFC pelo método de variações dos saldos aprovado pelo usuário: resultado da DRE, variações patrimoniais classificadas, sem buscar contrapartidas nem identificar movimentos sem caixa. Resultado retirado de financiamento para não duplicar seu efeito. Conciliação em centavos com disponíveis iniciais/finais e diferença explícita, sem valor de fechamento artificial.
- DMPL com colunas configuráveis do PL, resultado não transferido, totais, movimentos complementares digitáveis e conciliação com os saldos do balanço. Valores complementares não geram nem alteram lançamentos.
- Liquidez corrente, liquidez geral, solvência geral, endividamento percentual e liquidez de recursos próprios (inverso da solvência geral, por definição solicitada). Divisão por zero não produz Infinity ou valor fictício.
- Notas com seções e parágrafos numerados, identificação editável, títulos por relatório/período, local/data e assinaturas. Folha editável, exibida somente na impressão. Impressão/PDF nativa em A4, sem interface do aplicativo.
- Configurações, identificação, notas e complementos salvos localmente e incluídos no backup; valores calculados dos relatórios não são armazenados como versões fechadas.

## Testes

**31 testes unitários passaram**, incluindo os anteriores e os novos casos:

- DFC conciliada com capital, lucro, imobilizado comprado a prazo e transferência entre disponíveis.
- Encerramento preservando o fluxo e evitando dupla contagem do lucro.
- DMPL com aporte e distribuição de lucros, antes e depois do encerramento.
- Falta de classificação gerando diferença real, sem preenchimento automático.
- Classificação específica, realizável a longo prazo, fórmulas dos índices, denominador zero e limites de datas.
- Abertura imediatamente anterior ao período e preservação dos lançamentos.
- Rejeição de referências inválidas, colunas sobrepostas e valores fora da precisão segura.

**Interface e persistência:** a suíte `tests/statements.cjs` passou com comparativo real de dois exercícios, totais alinhados, seis relatórios, classificação, DMPL editável e conciliada, notas com texto contendo HTML inofensivo, identificação e assinaturas, folha invisível na tela e visível na impressão, PDF A4, CSV, atualização após alterar lançamentos, restauração de backup, isolamento por empresa e período. Falha simulada na gravação de notas preservou a configuração anterior e manteve o formulário disponível.

As suítes existentes `browser.cjs`, `workbench.cjs`, `version-1.2.cjs`, `pending-features.cjs` e `storage.cjs` passaram: escrituração, relatórios normais, encerramentos, sugestões, rascunhos, layout, filtros/paginação, padrões, IndexedDB, rollback, migração, reinício do navegador e funcionamento offline.

**Carga:** `storage-load.cjs` passou com duas empresas, dois exercícios e 20 mil lançamentos por empresa/exercício, totalizando 80 mil. A DFC e a DMPL de um exercício também foram verificadas nessa base, com diferença zero. Permanecem os testes de gravação incremental de um único lançamento, cálculos contábeis, reabertura e backup/restauração de aproximadamente 48,85 MB.

A revisão visual incluiu imagem da tela e PDF de balanço em A4 com uma página, fundo branco, duas metades, totais alinhados, número de folha e assinaturas. Os dados utilizados são inteiramente sintéticos.

## Reprodução

Sirva o diretório localmente apenas para a validação e execute:

```sh
node --test tests/accounting.test.cjs
node tests/statements.cjs
node tests/browser.cjs
node tests/workbench.cjs
node tests/version-1.2.cjs
node tests/pending-features.cjs
node tests/storage.cjs
node tests/storage-load.cjs
```

As suítes de navegador requerem Playwright e Chromium; `NODE_PATH`, `CHROMIUM_EXECUTABLE` e `FLY_TEST_URL` permitem informar instalações e endereços alternativos. A aplicação não depende dessas ferramentas. A política do Chromium deste ambiente bloqueia abertura direta de `file://`; a validação utiliza origem HTTP local, inclusive em modo offline. Não houve acesso a dados pessoais do usuário.
