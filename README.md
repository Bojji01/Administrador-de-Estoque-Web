# Controle de Estoque - Webapp

Aplicação web para controle de estoque e vendas para funcionários.

## 📋 Funcionalidades

- ✅ **Login e Autenticação**: Login seguro com criptografia de senha
- ✅ **Seleção de Turno**: Escolha entre manhã ou noite após login (pode mudar depois)
- ✅ **Cadastro de Produtos**: Adicione novos produtos com preço e quantidade inicial
- ✅ **Registro de Vendas**: Venda produtos e reduza o estoque automaticamente
- ✅ **Relatórios**: Visualize vendas por dia, mês ou ano
- ✅ **Dashboard de Vendas**: Acompanhe vendas do dia em tempo real

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
cd backend
npm install
```

### 2. Iniciar o Servidor

```bash
npm start
```

O servidor iniciará em `http://localhost:3000`

### 3. Acessar a Aplicação

Abra seu navegador e acesse: **http://localhost:3000**

## 🔐 Primeira Vez - Criar Usuário

1. Na tela de login, clique em "Registre-se aqui"
2. Crie um usuário e senha
3. Faça login com as credenciais

## 📱 Estrutura de Telas

### 1. **Login**
- Faça login com usuário e senha
- Opção de registrar novo usuário

### 2. **Seleção de Turno**
- Escolha seu turno (Manhã ☀️ ou Noite 🌙)
- Pode mudar pelo menu principal depois

### 3. **Vender** (Tela Principal)
- Selecione um produto do dropdown
- Digite a quantidade desejada
- Clique "Registrar Venda"
- Veja todas as vendas do dia e o total

### 4. **Cadastro de Produtos**
- Adicione novos produtos
- Defina preço e quantidade inicial
- Veja lista de todos os produtos

### 5. **Relatório**
- Visualize vendas por:
  - **Hoje**: Vendas do dia atual
  - **Mês**: Vendas do mês atual
  - **Ano**: Vendas do ano atual
- Mostra total vendido por turno

### 6. **Mudar Turno**
- Clique em "Mudar Turno" para voltar à seleção

### 7. **Logout**
- Sair da aplicação

## 📊 Banco de Dados

A aplicação usa **SQLite** que é criado automaticamente em `backend/estoque.db` com as seguintes tabelas:

- **usuarios**: Armazena credenciais dos funcionários
- **produtos**: Produtos cadastrados com preço e quantidade
- **vendas**: Registro de todas as vendas com data, turno e funcionário

## 🔧 Configuração

Se precisar mudar a porta do servidor, edite `backend/server.js`:

```javascript
const PORT = 3000; // Mude para outro número se necessário
```

Se precisar mudar a URL da API no frontend, edite `frontend/app.js`:

```javascript
const API_URL = 'http://localhost:3000/api'; // Mude conforme necessário
```

## 📝 Notas Importantes

- **Senha**: Armazenada com hash bcrypt (seguro)
- **Sessão**: Dura 24 horas, depois precisa fazer login novamente
- **Estoque**: Reduzido automaticamente ao registrar venda
- **Turno**: Precisa ser selecionado após login (obrigatório)
- **Relatórios**: Mostram dados agrupados por turno

## 🐛 Troubleshooting

**Erro "Não é possível conectar"**
- Verifique se o servidor está rodando: `npm start` na pasta backend
- Verifique se a porta 3000 está disponível

**Erro de banco de dados**
- O arquivo `estoque.db` será criado automaticamente
- Se houver problemas, delete o arquivo e deixe recrear

**Sessão expirada**
- Faça login novamente após 24 horas

---

**Desenvolvido para controle de estoque em pequenas operações.**
