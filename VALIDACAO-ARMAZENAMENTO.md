# Armazenamento local — versão 1.3.0

Esta atualização migra a persistência para IndexedDB. Não implementa os novos módulos pendentes nem a expansão/recolhimento de contas nos relatórios.

## Estrutura e garantias verificadas

- Empresas, contas e lançamentos ficam em registros separados. As chaves de contas e lançamentos incluem a empresa.
- Índices por empresa, empresa/data e empresa/número ficam disponíveis. O número do lançamento é único dentro de cada empresa.
- Alterações usuais gravam somente os registros afetados e a revisão do banco. Uma edição de histórico gravou **um lançamento e um metadado**, sem regravar as contas ou outras empresas.
- Gravações e restaurações usam transação atômica. A interface aguarda `oncomplete`; erros cancelam a transação e não substituem os dados em memória por uma tentativa que falhou.
- A migração aceita dados anteriores nas versões 1 e 2, preserva IDs, números, partidas, saldos e destinos de encerramento. A mudança de códigos do plano, quando necessária para a versão 1, segue a regra já existente.
- O conteúdo original de `localStorage` não é alterado ou apagado. Uma cópia anterior à migração fica em `archives`, exportável pela tela de dados. As cópias da atualização do plano de contas também são preservadas.
- Uma revisão conferida dentro da transação impede sobrescrever mudanças de outra aba, mesmo sem receber o aviso de atualização.
- Após a inicialização, a operação normal não depende de leitura ou gravação em `localStorage`.
- Backup JSON continua compatível e restaura o banco por uma única transação. Limite de arquivo: 256 MiB.

## Testes executados

Os 19 testes de `tests/accounting.test.cjs` passaram: incluem cálculos, partidas dobradas, encerramentos, migração de códigos, balancete sintético e planejamento das gravações incrementais.

Cinco suítes em Chromium passaram:

| Suíte | Cobertura principal |
|---|---|
| `tests/browser.cjs` | Cadastro, lançamentos, exclusão/edição, relatórios, recálculo, backup, CSV, falha ao gravar e operação sem rede |
| `tests/workbench.cjs` | Compatibilidade da migração antiga, sugestões de contas, rascunhos, cores, contrapartidas e Documento condicional |
| `tests/version-1.2.cjs` | Duplicação, confirmação de data, edição restrita ao plano e balancete sintético |
| `tests/storage.cjs` | IndexedDB real, migração de versões 1 e 2, preservação do legado, transações, recuperação e reinício real do navegador |
| `tests/storage-load.cjs` | 80 mil lançamentos, edição incremental, relatórios, índices e backup/restauração acima de 30 MB |

Os cenários de falha incluem quota simulada após uma operação já enfileirada, violação assíncrona de índice único e falha durante uma restauração após `clear()`. Em todos esses casos, a revisão e os dados anteriores permaneceram intactos. Também foi testada a recuperação, por backup válido, de um banco contendo uma referência de conta danificada.

IndexedDB indisponível e JSON legado inválido produziram erros sem inicializar um banco vazio por cima dos dados. Dados legados acessíveis puderam ser exportados. A persistência foi confirmada fechando e reabrindo um Chromium com o mesmo perfil temporário. A abertura, a gravação e a reabertura também foram exercitadas com a rede desativada, entregando o HTML do disco pela interceptação do teste.

## Medição de carga

Dados fictícios, duas empresas e dois exercícios por empresa, com **20.000 lançamentos por empresa/ano**: 80.000 lançamentos no total, duas partidas por lançamento. Medição neste ambiente de desenvolvimento com Chromium; não é uma garantia de velocidade em outros computadores.

| Operação | Resultado aproximado |
|---|---:|
| JSON compacto do conjunto | 28,93 MB |
| Gravação inicial dos 80 mil lançamentos | 10,15 s |
| Leitura e validação dos dados persistidos | 1,39 s |
| Construção da listagem com 20 mil linhas, incluindo dois frames | 4,05 s |
| Transação de uma edição individual | 87 ms |
| Editar, validar, gravar e reconstruir a listagem | 1,20 s |
| Reabrir a página, carregar os dados e montar a tela | 8,83 s |
| Cálculos de movimentos, saldos anteriores e balancete de uma empresa | 53 ms |
| Exportação do backup | 1,99 s |
| Tamanho do backup JSON formatado | 48,85 MB |
| Restauração desse backup | 11,20 s |

O teste confirmou os saldos anteriores e finais, o resultado anual, o balanço equilibrado, a separação de empresas, a quantidade de registros após restauração e a consulta pelo índice de empresa/data. A edição individual em carga escreveu um único registro de lançamento, além da revisão. O teste contém limites amplos para detectar regressões graves nessa edição, sem tratar os tempos da tabela como requisitos para qualquer máquina.

Durante a investigação, o bloqueio de todos os botões de uma listagem grande mostrou custo excessivo. O bloqueio foi limitado aos controles de navegação/formulário, com impedimento temporário de novos eventos durante a gravação. A segurança da transação foi mantida sem alterar o estado de dezenas de milhares de botões.

## Limites e atualização da instalação

1. O IndexedDB tem capacidade maior que `localStorage`, mas sua cota depende do navegador e do espaço disponível. Ele não é armazenamento ilimitado nem substitui backups externos.
2. O programa ainda mantém os dados carregados em memória e monta todas as linhas do período. Paginação, virtualização e carregamento por empresa/período não fazem parte desta atualização. Usar períodos menores reduz a quantidade de linhas exibidas.
3. As gravações incrementais não eliminam toda a validação do conjunto da empresa alterada. Os dados das empresas intactas não são clonados nem regravados.
4. As cópias internas e o banco principal podem ser apagados ao limpar os dados do navegador. Faça backup JSON antes de atualizar ou mudar de perfil, navegador ou caminho do HTML.
5. O conteúdo antigo de `localStorage` é apenas uma cópia anterior: abrir um Fly anterior à versão 1.3.0 não mostra as novas gravações. Não alterne a escrituração entre versões antigas e novas.
6. O ambiente bloqueia navegação `file://` com `ERR_BLOCKED_BY_ADMINISTRATOR`. Por isso os testes usaram entrega local do HTML; a abertura direta por arquivo não foi validada neste ambiente. O produto continua sendo um HTML autônomo, sem servidor ou dependência externa. Se o navegador da instalação não permitir IndexedDB para arquivos locais, o Fly informa o problema e preserva os dados acessíveis.

Para atualizar: faça backup na versão atual, substitua o HTML mantendo nome e caminho, abra a versão 1.3.0 e confira as empresas e os saldos. Se mudar de origem ou navegador, restaure o JSON. As etapas reproduzíveis de teste estão no README.
