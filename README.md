# Fly — Contabilidade local

Aplicativo básico para escrituração contábil por um contador, em um único HTML, sem servidor, bibliotecas externas, login ou conexão com a internet.

## Usar

1. Salve `index.html` no computador e abra no navegador.
2. Crie uma empresa e ajuste o plano de contas em **Plano de contas**.
3. Em **Lançamentos**, registre a abertura dos saldos como um lançamento comum. Depois registre os movimentos. Cada lançamento aceita várias partidas; os débitos e créditos devem conferir.
4. Consulte **Balancete**, **Razão**, **Diário**, **Balanço** e **DRE**, ajustando e aplicando o período.
5. Exporte regularmente um **Backup JSON**. Para recuperar ou transferir dados, use **Dados e empresas → Restaurar backup JSON**.

Não é necessário instalar Node, Python ou qualquer dependência para usar o HTML. Não há transmissão dos dados nem sincronização online. O cadastro começa vazio; as empresas utilizadas pelos testes não fazem parte do aplicativo.

## Editar e excluir pelo relatório

- No razão e no diário, selecione uma partida para abrir o lançamento completo.
- No balanço, balancete e DRE, selecione uma conta analítica para abrir seu razão e, em seguida, o lançamento.
- A janela de edição permite alterar todas as partidas ou **Excluir lançamento**, com confirmação. A exclusão é permanente; use backup para recuperação.
- O balanço abre o razão acumulado desde 1900 até sua data de posição. Os demais relatórios preservam o período selecionado.
- O razão inclui encerramentos; por isso, seu saldo final pode ser zero mesmo quando a DRE apresenta movimento no período. A DRE exclui os encerramentos.

## Encerrar o resultado

Use **Encerrar resultado**, informe o exercício e selecione uma conta analítica do patrimônio líquido (por padrão, Lucros ou prejuízos acumulados). É gerado um lançamento em 31/12 que zera os saldos de receitas e despesas até essa data e transfere a diferença ao patrimônio líquido. Encerre os exercícios em ordem.

Os lançamentos continuam editáveis e podem ser excluídos, inclusive o próprio encerramento. Alterações em períodos já encerrados sinalizam os encerramentos posteriores para revisão. **Recalcular encerramentos** reconstrói todos eles em ordem e substitui eventuais edições manuais; se não restar saldo a encerrar, remove o encerramento correspondente.

A DRE básica apresenta receitas, deduções, despesas/custos e resultado. O balanço considera todos os lançamentos até a data de posição e apresenta separadamente o resultado ainda não transferido ao patrimônio líquido. Contas sintéticas são subtotais; não devem ser somadas novamente às analíticas. O plano genérico pode ser adaptado, inclusive com contas redutoras.

## Dados locais e backups

Os dados são gravados em `localStorage`, separadamente por navegador/perfil e conforme as regras de armazenamento de cada navegador para arquivos locais. Não são gravados dentro do HTML. Mantenha o arquivo no mesmo local: renomear ou mover o HTML pode mudar o armazenamento acessível. Navegadores e computadores diferentes não compartilham dados. Limpar dados do navegador ou usar navegação privada pode apagá-los. O armazenamento disponível também tem limite.

O backup JSON contém todas as empresas e seus lançamentos, sem criptografia. A restauração valida os dados antes de substituir o banco local inteiro e exige confirmação. Guarde uma cópia antes de restaurar. Falhas ao gravar não são apresentadas como sucesso; dados inválidos existentes não são sobrescritos automaticamente. Use uma única aba para escriturar; alterações detectadas em outra aba exigem recarregamento.

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
```

Se Playwright estiver instalado fora do projeto, informe seu diretório de módulos em `NODE_PATH`. `FLY_TEST_URL` permite mudar o endereço usado no teste. O teste abre um perfil isolado e verifica criação, edição e exclusão, relatórios, encerramento/recálculo, persistência, separação de empresas, backup/restauração, exportação CSV, gravação sem rede e falha de armazenamento. O servidor é usado apenas na validação automatizada, não faz parte do aplicativo. A política do Chromium deste ambiente bloqueia navegação direta a `file://`; por isso essa modalidade de abertura não foi validada aqui.
