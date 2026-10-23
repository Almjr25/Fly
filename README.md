# Fly — Contabilidade local

Versão atual: **1.3.0**, identificada no cabeçalho e no título da janela.

Aplicativo básico para escrituração contábil por um contador, em um único HTML, sem servidor, bibliotecas externas, login ou conexão com a internet.

## Usar

1. Salve `index.html` no computador e abra no navegador.
2. Crie uma empresa e ajuste o plano de contas em **Plano de contas**.
3. Em **Lançamentos**, use o formulário permanente no topo da tela para registrar a abertura dos saldos como um lançamento comum. Depois registre os movimentos. Cada lançamento aceita várias partidas; os débitos e créditos devem conferir.
4. Consulte **Balancete**, **Razão**, **Diário**, **Balanço** e **DRE**, ajustando e aplicando o período.
5. Exporte regularmente um **Backup JSON**. Para recuperar ou transferir dados, use **Dados e empresas → Restaurar backup JSON**.

Não é necessário instalar Node, Python ou qualquer dependência para usar o HTML. Não há transmissão dos dados nem sincronização online. O cadastro começa vazio; as empresas utilizadas pelos testes não fazem parte do aplicativo.

## Plano de contas e pesquisa visual

O plano inicial usa **1 — Ativo**, **2 — Passivo e patrimônio líquido**, **3 — Receitas** e **4 — Despesas e custos**. O passivo circulante fica em `2.1`, o não circulante em `2.2` e o patrimônio líquido em `2.3`. As fontes dos grupos usam azul `#245FA5`, cobre `#B65B22`, roxo `#79509C`, verde `#247A46` e vermelho `#BB3944`, respectivamente.

Ao atualizar uma instalação ou restaurar um backup da versão anterior, os códigos de PL, receitas e despesas são migrados, preservando IDs, lançamentos, saldos e destinos de encerramento. Se uma empresa já usa `2.3` para um ramo do passivo, o PL recebe o próximo ramo disponível. Na atualização dos dados locais, o sistema guarda uma cópia anterior à migração, disponível em **Dados e empresas → Backup anterior à atualização**. Backups antigos também podem ser restaurados diretamente.

Faça um backup JSON antes de substituir o HTML por uma versão nova. Mantenha o mesmo nome e caminho do arquivo para preservar o acesso ao armazenamento local; se mudar de navegador ou endereço, restaure o backup.

Ao lançar, digite parte do código ou do nome da conta. As sugestões aparecem numa caixa flutuante com rolagem e fade, sem completar ou substituir o texto digitado. Clique numa opção ou use **↑/↓** e **Enter** para confirmar; **Esc** fecha as sugestões. Somente contas analíticas são sugeridas e uma conta deve ser selecionada explicitamente. A busca ignora acentos e não corta a lista de resultados.

O formulário fica permanentemente junto da listagem, sem os boxes de resumo anteriores. Em telas de computador, a área de trabalho é compacta, com rolagem interna para listas e muitas partidas; em telas pequenas, a página pode rolar para manter os campos acessíveis. Rascunhos são mantidos em memória por empresa ao navegar ou aplicar filtros; para persistir após fechar a página, salve o lançamento.

## Editar e excluir pelo relatório

- No razão e no diário, selecione uma partida para abrir o lançamento completo.
- No balanço, balancete e DRE, selecione uma conta analítica para abrir seu razão e, em seguida, o lançamento.
- Na tela de lançamentos, a edição usa o formulário permanente; nos relatórios, abre a janela de edição. Ambos permitem alterar todas as partidas ou **Excluir lançamento**, com confirmação. A exclusão é permanente; use backup para recuperação.
- O balanço abre o razão acumulado desde 1900 até sua data de posição. Os demais relatórios preservam o período selecionado.
- O razão mostra os códigos das contas de contrapartida em cada partida. Em lançamentos compostos, mostra todas as contas do lado oposto (sem inventar uma correspondência única entre partidas). A coluna **Documento** só aparece quando pelo menos um lançamento exibido da conta e do período tem documento preenchido; a mesma regra vale para o CSV do razão. Essa supressão não é aplicada à listagem principal.
- O razão inclui encerramentos; por isso, seu saldo final pode ser zero mesmo quando a DRE apresenta movimento no período. A DRE exclui os encerramentos.

Clicar novamente numa conta já selecionada no formulário mantém a edição da partida: não abre o cadastro da conta. Alterações cadastrais são feitas exclusivamente em **Plano de contas**.

## Lançamentos repetitivos

Use **Duplicar** na linha de um lançamento ou na sua edição (inclusive quando aberta por um relatório). O programa prepara um novo lançamento com as contas, valores, histórico e documento da origem, deixando a **data em branco**. Revise os dados — especialmente o documento — e informe a data. Ao salvar, confirme a data na mensagem apresentada.

A cópia só é gravada após a confirmação, recebe novo identificador e número e não altera o lançamento de origem. Se cancelar a confirmação, o formulário permanece disponível para revisão. Havendo alterações não salvas no formulário atual, o programa pede confirmação antes de substituí-las pela cópia do lançamento salvo. Encerramentos automáticos devem ser gerados pela rotina própria e não têm ação de duplicação.

## Contas sintéticas no balancete

No **Balancete**, o botão **Mostrar contas sintéticas / Esconder contas sintéticas** alterna entre somente analíticas e a hierarquia completa. Cada sintética totaliza as contas analíticas descendentes, incluindo seus saldos anteriores e movimentos do período. O grupo `2` inclui tanto passivo quanto patrimônio líquido. O total geral soma apenas as analíticas e permanece igual ao alternar a exibição.

A exportação CSV segue a opção exibida e identifica o tipo de cada conta. A escolha é mantida enquanto o programa permanece aberto. A consulta ao razão continua disponível pelos nomes das contas analíticas.

## Encerrar o resultado

Use **Encerrar resultado**, informe o exercício e selecione uma conta analítica do patrimônio líquido (por padrão, Lucros ou prejuízos acumulados). É gerado um lançamento em 31/12 que zera os saldos de receitas e despesas até essa data e transfere a diferença ao patrimônio líquido. Encerre os exercícios em ordem.

Os lançamentos continuam editáveis e podem ser excluídos, inclusive o próprio encerramento. Alterações em períodos já encerrados sinalizam os encerramentos posteriores para revisão. **Recalcular encerramentos** reconstrói todos eles em ordem e substitui eventuais edições manuais; se não restar saldo a encerrar, remove o encerramento correspondente.

A DRE básica apresenta receitas, deduções, despesas/custos e resultado. O balanço considera todos os lançamentos até a data de posição e apresenta separadamente o resultado ainda não transferido ao patrimônio líquido. Contas sintéticas são subtotais; não devem ser somadas novamente às analíticas. O plano genérico pode ser adaptado, inclusive com contas redutoras.

## Dados locais e backups

Os dados são gravados em **IndexedDB**, um banco local nativo do navegador, em registros separados para empresas, contas e lançamentos. Cada alteração grava apenas os registros afetados, em uma transação: se a gravação falhar, os dados anteriores são mantidos. A tela só confirma sucesso após a transação terminar. Não há servidor ou transmissão dos dados.

Ao abrir a versão 1.3.0 pela primeira vez, dados das versões anteriores presentes em `localStorage` são migrados automaticamente, preservando contas, lançamentos, números, saldos e encerramentos. A origem não é alterada nem apagada. Uma cópia anterior fica disponível em **Dados e empresas → Backup anterior à migração**; a cópia anterior à mudança do plano de contas, quando existente, também é preservada. Depois da migração, o IndexedDB é a fonte dos dados: o conteúdo antigo em `localStorage` não é atualizado. Não volte a usar um HTML anterior à 1.3.0, pois ele pode mostrar apenas os dados antigos.

Faça backup na versão antiga antes de substituir o HTML. Mantenha o mesmo nome e caminho. Navegadores tratam o armazenamento de arquivos locais de formas diferentes; se a nova cópia abrir sem encontrar sua empresa, use **Restaurar backup JSON**. O navegador deve permitir IndexedDB. Se ele estiver indisponível, o Fly informa a falha e não cria silenciosamente um banco vazio; dados antigos acessíveis podem ser exportados pelo botão de backup.

O banco é separado por navegador/perfil e conforme as regras de origem para arquivos locais. Os dados não ficam dentro do HTML. Mover o arquivo ou mudar de navegador pode mudar o armazenamento acessível. Limpar os dados do navegador, usar navegação privada ou uma política de limpeza pode apagar o banco e suas cópias internas. A capacidade é maior que a de `localStorage`, mas depende do espaço e da cota concedida pelo navegador; não é ilimitada. Cópias internas não substituem backups JSON fora do navegador.

O backup JSON continua contendo todas as empresas e lançamentos, sem criptografia. Backups antigos de dados nas versões 1 e 2 são aceitos. A restauração valida o arquivo e substitui o banco inteiro apenas após confirmação e por transação, preservando o banco anterior se falhar. O limite por arquivo foi ampliado para **256 MiB**. Guarde uma cópia antes de restaurar.

Use uma única aba para escriturar. Há controle de revisão por transação e aviso entre abas para impedir que uma aba antiga sobrescreva alterações de outra. Em caso de aviso, recarregue a página. Durante a gravação, novas ações são temporariamente bloqueadas. Esse controle não transforma o programa em um sistema de acesso simultâneo.

A abertura ainda carrega os registros em memória e a listagem ainda monta todas as linhas do período selecionado. Filtre períodos menores para trabalhar com grandes volumes. Consulta paginada, carregamento por empresa/período e virtualização da listagem são melhorias futuras, separadas da migração do armazenamento. Veja [VALIDACAO-ARMAZENAMENTO.md](VALIDACAO-ARMAZENAMENTO.md) para os resultados de carga e os limites dos testes.

Relatórios podem ser exportados em CSV separado por ponto e vírgula, com valores em formato brasileiro. Eles não substituem o backup JSON.

## Escopo

Uso individual e offline, sem integrações, SPED, folha, conciliação bancária, obrigações fiscais ou autenticação de livros. Os relatórios são básicos, sem notas explicativas nem formatação regulatória completa.

## Desenvolvimento e validação

O código da aplicação está integralmente em `index.html`. Não há etapa de build.

Testes de cálculos, centavos, datas, partidas dobradas, lucro/prejuízo, encerramentos, filtros e validação de backup (Node.js 18+):

```sh
node --test tests/accounting.test.cjs
```

Teste de interface opcional: `tests/browser.cjs` usa Playwright e Chromium. Com Playwright disponível para o Node e Chromium em `/usr/bin/chromium` (ou caminho informado em `CHROMIUM_EXECUTABLE`), sirva o diretório apenas para o teste:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Em outro terminal:

```sh
node tests/browser.cjs
node tests/workbench.cjs
node tests/version-1.2.cjs
node tests/storage.cjs
node tests/storage-load.cjs
```

Se Playwright estiver instalado fora do projeto, informe seu diretório de módulos em `NODE_PATH`. `FLY_TEST_URL` permite mudar o endereço usado no teste. Os testes abrem perfis isolados e verificam criação, edição e exclusão, relatórios, encerramento/recálculo, persistência, separação de empresas, backup/restauração, exportação CSV, gravação sem rede e falha de armazenamento. A suíte `workbench.cjs` também verifica migração de dados antigos, preservação de rascunhos, cores, sugestões clicáveis e por teclado, contrapartidas e Documento condicional, além do encaixe em 1366×768 e 1280×720. A suíte `version-1.2.cjs` verifica o clique em contas selecionadas, a duplicação com confirmação da data, a identificação da versão e o balancete sintético, inclusive seu CSV e a preservação dos totais. As suítes `storage.cjs` e `storage-load.cjs` usam IndexedDB real e verificam transações, migração, recuperação, reinício do navegador e carga de 80 mil lançamentos. O servidor é usado apenas na validação automatizada, não faz parte do aplicativo. A política do Chromium deste ambiente bloqueia navegação direta a `file://`; por isso essa modalidade de abertura não foi validada aqui.
