# Validação da versão 1.4.0

Executada em 23/10/2026 com Node.js 24, Playwright e Chromium, usando perfis isolados e IndexedDB real. O servidor HTTP local é apenas parte do teste; o aplicativo continua sendo um único HTML sem dependências externas.

## Cobertura

- 25 testes unitários: cálculos contábeis, centavos, encerramentos, migração, partidas dobradas, consistência de backup e persistência incremental; filtros textuais e monetários, E/OU, intervalos inclusivos, limites e ordenação das páginas; referências e códigos dos padrões; cópias independentes e recolhimento por prefixo hierárquico.
- Interface: criação/edição/exclusão e uso dos históricos e lançamentos padrão; preenchimento de duas partidas por valor único; data obrigatória; alteração de histórico sem reescrever lançamentos antigos; proteção das referências; persistência, backup/restauração e isolamento por empresa.
- Paginação real: 1.205 lançamentos, páginas normais de 20, páginas filtradas de 500/500/205, pesquisa somente após aplicação, E/OU, valores entre limites, consulta inválida preservando os resultados anteriores e aviso discreto sem resultados. Período sozinho mantém 20. Rascunho preservado na navegação.
- Balanço, DRE e balancete: recolhimento/reabertura pela linha e pelo teclado, foco preservado, totais idênticos e CSV completo mesmo com grupos recolhidos. O modo analítico do balancete ignora o recolhimento.
- Regressões: editor compacto em 1366×768 e 1280×720, sugestões de contas, duplicação, edição pelos relatórios, encerramentos, cores, contrapartidas e Documento condicional; transações, rollback por falta de espaço, conflitos, migração, reinício do navegador, funcionamento offline e recuperação.

## Carga

Duas empresas, dois exercícios por empresa e 20.000 lançamentos por exercício: **80.000 lançamentos** no total. A consulta de um exercício encontra 20.000 registros, renderizando apenas a página solicitada.

| Operação | Medição desta execução |
| --- | ---: |
| Renderizar página normal, 20 linhas | 64 ms |
| Aplicar filtro e renderizar 500 linhas | 211 ms |
| Salvar uma alteração e atualizar a tela | 155 ms |
| Gravação no IndexedDB dessa alteração | 30 ms |
| Reabrir e renderizar | 1.525 ms |
| Calcular movimentos e balancete | 22 ms |
| JSON compacto de todos os dados | 28,93 MB |
| Backup formatado exportado | 48,85 MB |
| Exportar backup | 2.038 ms |
| Restaurar backup completo | 11.379 ms |

Editar um histórico de lançamento gravou somente **um registro de lançamento e os metadados da revisão**. A restauração do backup maior que 30 MiB preservou os 80.000 lançamentos e seus saldos. As medições são observações neste ambiente, não garantias para qualquer computador.

A paginação limita os elementos desenhados na tela. O carregamento inicial ainda lê os dados locais em memória, e a consulta percorre os lançamentos da empresa antes de ordenar e paginar. Razão e diário continuam relatórios sem paginação nesta versão. Os cálculos usam o conjunto completo de dados, nunca só as linhas visíveis.

A política do Chromium deste ambiente impede abrir `file://` diretamente. A validação automatizada usou origem local, inclusive com rede desativada; a abertura direta do arquivo não foi validada neste ambiente.

## Executar

Com o diretório servido localmente e Playwright/Chromium disponíveis:

```sh
node --test tests/accounting.test.cjs
node tests/browser.cjs
node tests/workbench.cjs
node tests/version-1.2.cjs
node tests/pending-features.cjs
node tests/storage.cjs
node tests/storage-load.cjs
```

Use `NODE_PATH` quando Playwright estiver instalado fora do projeto. Os testes não acessam dados pessoais nem o armazenamento do usuário.
