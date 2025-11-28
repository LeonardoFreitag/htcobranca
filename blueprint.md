
# Blueprint: Sistema de Gestão Financeira Pessoal

## Visão Geral

O objetivo deste projeto é construir um aplicativo de gestão financeira pessoal completo, utilizando React, Material-UI e Firebase. A aplicação permitirá que os usuários gerenciem suas finanças, começando com um CRUD (Create, Read, Update, Delete) para "Contas a Receber" e configurações personalizáveis.

## Funcionalidades Implementadas

### Autenticação de Usuários

*   **Fluxo de Cadastro e Login:** Os usuários podem se registrar com e-mail, senha e CNPJ, e fazer login em suas contas.
*   **Contexto de Autenticação:** Um `AuthContext` gerencia o estado do usuário em toda a aplicação, garantindo que os dados sejam sempre vinculados ao usuário correto.
*   **Navegação Protegida:** As rotas são protegidas, redirecionando usuários não autenticados para a página de login.

### Configurações do Usuário

*   **Interface:** Uma página dedicada em `/settings` permite que os usuários configurem parâmetros financeiros.
*   **Campos:**
    *   Percentual de Multa (%)
    *   Percentual de Juros por Atraso (% ao dia)
    *   Dias para Iniciar Cobrança de Juros
*   **Persistência de Dados:** As configurações são salvas em uma coleção `settings` no Firestore. Cada documento tem o mesmo ID do usuário (`uid`), garantindo que as configurações sejam específicas para cada um.
*   **Regras de Segurança:** As regras do Firestore garantem que um usuário só possa ler e escrever *suas próprias* configurações.

### Design e Estilo

*   **Componentes:** A interface utiliza a biblioteca Material-UI, com um tema personalizado.
*   **Estilo Visual:**
    *   **Cores:** Paleta baseada em roxos e cores vibrantes para status.
    *   **Cards:** Design moderno com cantos arredondados, sombras sutis e efeito de "vidro fosco" (`backdropFilter`).
*   **Responsividade:** O layout é totalmente responsivo, adaptando-se a desktops, tablets e smartphones. Os cards são exibidos em 3, 2 ou 1 coluna, dependendo da largura da tela, para garantir legibilidade e usabilidade.

---

## Próximos Passos: CRUD de Contas a Receber

Nesta fase, vamos transformar a visualização de "Contas a Receber" em uma funcionalidade de CRUD completa e integrada ao Firestore.

### 1. Estrutura de Dados (Firestore)

*   **Coleção:** `accountsReceivable`
*   **Documento:** Representará uma única conta a receber.
*   **Campos do Documento:**
    *   `userId`: (string) - ID do usuário que criou a conta.
    *   `client`: (string) - Nome do cliente ou da fonte da receita.
    *   `value`: (number) - O valor a ser recebido.
    *   `dueDate`: (Timestamp) - A data de vencimento da conta.
    *   `createdAt`: (Timestamp) - Data de criação do registro.
    *   `status`: (string) - `paid` ou `pending` (a ser implementado no futuro).

### 2. Regras de Segurança

*   Vamos adicionar regras à coleção `accountsReceivable` para garantir que um usuário só possa criar, ler, atualizar e deletar as contas que ele mesmo criou (verificando o campo `userId`).

### 3. Interface do Usuário e Componentes

*   **Página Principal (`AccountsReceivable.tsx`):**
    *   **Leitura (R):** Deixará de usar dados mocados e passará a ouvir em tempo real a coleção `accountsReceivable`, filtrando pelos documentos onde `userId` é igual ao do usuário logado.
    *   **Gatilhos de Ação:**
        *   O botão "Adicionar" abrirá um modal com o formulário de criação.
        *   O ícone de "Editar" em cada card abrirá o mesmo modal, mas preenchido com os dados daquela conta.
        *   O ícone de "Deletar" abrirá um diálogo de confirmação antes de remover o item.
*   **Formulário (`AccountForm.tsx`):**
    *   Será um componente reutilizável dentro de um modal do Material-UI (`Dialog`).
    *   **Campos:** "Cliente", "Valor" e "Data de Vencimento".
    *   **Data de Vencimento:** Utilizará um componente de seletor de data (`DatePicker`) para uma melhor experiência do usuário.
*   **Diálogo de Exclusão (`DeleteDialog.tsx`):**
    *   Um modal simples para confirmar a ação de deletar, prevenindo exclusões acidentais.

### 4. Lógica de Negócio

*   **Criação (C):** O formulário, ao ser salvo, criará um novo documento na coleção `accountsReceivable`, incluindo o `userId` do usuário logado.
*   **Atualização (U):** Se o formulário estiver em modo de edição, ele atualizará o documento existente no Firestore.
*   **Exclusão (D):** Após a confirmação, a função correspondente deletará o documento do Firestore.
*   **Cálculo de Status:** O status "Em Aberto" vs. "Em Atraso" será calculado dinamicamente no frontend, comparando a `dueDate` com a data atual. Não será armazenado no banco para garantir que esteja sempre correto.
