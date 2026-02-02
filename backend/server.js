const express = require('express');
const session = require('express-session');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Logger simples de requisições para debug
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Configurar sessão
app.use(session({
  secret: 'seu_secret_key_aqui',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24, // 24 horas
    httpOnly: true 
  }
}));

// Abrir banco de dados
const db = new sqlite3.Database(path.join(__dirname, 'estoque.db'), (err) => {
  if (err) {
    console.error('Erro ao abrir banco de dados:', err);
  } else {
    console.log('Banco de dados conectado');
    inicializarBanco();
  }
});

// Inicializar banco de dados
function inicializarBanco() {
  // Tabela de usuários
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de produtos
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de vendas
  db.run(`
    CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      preco_unitario REAL NOT NULL,
      turno TEXT NOT NULL,
      data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY(produto_id) REFERENCES produtos(id)
    )
  `);
}

// Middleware para verificar autenticação
const verificarAutenticacao = (req, res, next) => {
  if (!req.session.usuarioId) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }
  next();
};

// ========== ROTAS DE AUTENTICAÇÃO ==========

// Registrar usuário
app.post('/api/registrar', (req, res) => {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({ erro: 'Nome e senha obrigatórios' });
  }

  const senhaHash = bcrypt.hashSync(senha, 10);

  db.run('INSERT INTO usuarios (nome, senha) VALUES (?, ?)', [nome, senhaHash], (err) => {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ erro: 'Usuário já existe' });
      }
      return res.status(500).json({ erro: 'Erro ao registrar usuário' });
    }
    res.json({ sucesso: true, mensagem: 'Usuário registrado com sucesso' });
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({ erro: 'Nome e senha obrigatórios' });
  }

  db.get('SELECT * FROM usuarios WHERE nome = ?', [nome], (err, usuario) => {
    if (err || !usuario) {
      return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    }

    if (!bcrypt.compareSync(senha, usuario.senha)) {
      return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    }

    req.session.usuarioId = usuario.id;
    req.session.nomeUsuario = usuario.nome;
    
    res.json({ sucesso: true, nomeUsuario: usuario.nome });
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao fazer logout' });
    }
    res.json({ sucesso: true });
  });
});

// Verificar sessão
app.get('/api/sessao', (req, res) => {
  if (req.session.usuarioId) {
    res.json({ 
      autenticado: true, 
      nomeUsuario: req.session.nomeUsuario,
      turno: req.session.turno || null
    });
  } else {
    res.json({ autenticado: false });
  }
});

// Definir turno
app.post('/api/definir-turno', verificarAutenticacao, (req, res) => {
  const { turno } = req.body;

  if (!['manhã', 'noite'].includes(turno)) {
    return res.status(400).json({ erro: 'Turno inválido' });
  }

  req.session.turno = turno;
  res.json({ sucesso: true, turno: turno });
});

// ========== ROTAS DE PRODUTOS ==========

// Listar produtos
app.get('/api/produtos', verificarAutenticacao, (req, res) => {
  db.all('SELECT * FROM produtos ORDER BY nome', (err, produtos) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao buscar produtos' });
    }
    res.json(produtos);
  });
});

// Criar produto
app.post('/api/produtos', verificarAutenticacao, (req, res) => {
  const { nome, preco, quantidade } = req.body;

  if (!nome || !preco || quantidade === undefined) {
    return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
  }

  // Verificar se produto com mesmo nome já existe
  db.get('SELECT * FROM produtos WHERE LOWER(nome) = LOWER(?)', [nome], (err, produtoExistente) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao verificar produto' });
    }

    if (produtoExistente) {
      // Produto existe, somar quantidade e atualizar preço se diferente
      const novaQuantidade = produtoExistente.quantidade + quantidade;
      db.run(
        'UPDATE produtos SET quantidade = ?, preco = ? WHERE id = ?',
        [novaQuantidade, preco, produtoExistente.id],
        (err) => {
          if (err) {
            return res.status(500).json({ erro: 'Erro ao atualizar produto' });
          }
          res.json({ sucesso: true, id: produtoExistente.id, mensagem: 'Estoque do produto atualizado (merge)' });
        }
      );
    } else {
      // Produto novo
      db.run(
        'INSERT INTO produtos (nome, preco, quantidade) VALUES (?, ?, ?)',
        [nome, preco, quantidade],
        function(err) {
          if (err) {
            return res.status(500).json({ erro: 'Erro ao criar produto' });
          }
          res.json({ sucesso: true, id: this.lastID, mensagem: 'Produto cadastrado com sucesso' });
        }
      );
    }
  });
});

// Atualizar quantidade do produto (definir)
app.put('/api/produtos/:id', verificarAutenticacao, (req, res) => {
  const { quantidade } = req.body;
  const produtoId = req.params.id;

  db.run(
    'UPDATE produtos SET quantidade = ? WHERE id = ?',
    [quantidade, produtoId],
    (err) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao atualizar produto' });
      }
      res.json({ sucesso: true });
    }
  );
});

// Aumentar quantidade do produto
app.post('/api/produtos/:id/aumentar', verificarAutenticacao, (req, res) => {
  const { quantidade } = req.body;
  const produtoId = req.params.id;

  console.log(`AUMENTAR pedido - produtoId=${produtoId} quantidade=${quantidade} usuario=${req.session && req.session.nomeUsuario}`);

  if (!quantidade || quantidade <= 0) {
    return res.status(400).json({ erro: 'Quantidade inválida' });
  }

  db.get('SELECT quantidade FROM produtos WHERE id = ?', [produtoId], (err, produto) => {
    if (err || !produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    const novaQuantidade = produto.quantidade + quantidade;
    db.run(
      'UPDATE produtos SET quantidade = ? WHERE id = ?',
      [novaQuantidade, produtoId],
      (err) => {
        if (err) {
          return res.status(500).json({ erro: 'Erro ao atualizar produto' });
        }
        res.json({ sucesso: true, novaQuantidade });
      }
    );
  });
});

// Diminuir quantidade do produto
app.post('/api/produtos/:id/diminuir', verificarAutenticacao, (req, res) => {
  const { quantidade } = req.body;
  const produtoId = req.params.id;

  console.log(`DIMINUIR pedido - produtoId=${produtoId} quantidade=${quantidade} usuario=${req.session && req.session.nomeUsuario}`);

  if (!quantidade || quantidade <= 0) {
    return res.status(400).json({ erro: 'Quantidade inválida' });
  }

  db.get('SELECT quantidade FROM produtos WHERE id = ?', [produtoId], (err, produto) => {
    if (err || !produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    if (produto.quantidade < quantidade) {
      return res.status(400).json({ erro: 'Quantidade insuficiente em estoque' });
    }

    const novaQuantidade = produto.quantidade - quantidade;
    db.run(
      'UPDATE produtos SET quantidade = ? WHERE id = ?',
      [novaQuantidade, produtoId],
      (err) => {
        if (err) {
          return res.status(500).json({ erro: 'Erro ao atualizar produto' });
        }
        res.json({ sucesso: true, novaQuantidade });
      }
    );
  });
});

// Deletar produto
app.delete('/api/produtos/:id', verificarAutenticacao, (req, res) => {
  const produtoId = req.params.id;

  console.log(`DELETAR pedido - produtoId=${produtoId} usuario=${req.session && req.session.nomeUsuario}`);

  db.get('SELECT * FROM produtos WHERE id = ?', [produtoId], (err, produto) => {
    if (err || !produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    db.run('DELETE FROM produtos WHERE id = ?', [produtoId], (err) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao deletar produto' });
      }
      res.json({ sucesso: true, mensagem: 'Produto deletado com sucesso' });
    });
  });
});

// ========== ROTAS DE VENDAS ==========

// Registrar venda
app.post('/api/vendas', verificarAutenticacao, (req, res) => {
  const { produtoId, quantidade } = req.body;

  if (!produtoId || !quantidade) {
    return res.status(400).json({ erro: 'Produto e quantidade obrigatórios' });
  }

  if (!req.session.turno) {
    return res.status(400).json({ erro: 'Turno não definido' });
  }

  // Buscar produto e sua quantidade atual
  db.get('SELECT * FROM produtos WHERE id = ?', [produtoId], (err, produto) => {
    if (err || !produto) {
      return res.status(404).json({ erro: 'Produto não encontrado' });
    }

    if (produto.quantidade < quantidade) {
      return res.status(400).json({ erro: 'Quantidade insuficiente em estoque' });
    }

    // Inserir venda
    db.run(
      'INSERT INTO vendas (usuario_id, produto_id, quantidade, preco_unitario, turno) VALUES (?, ?, ?, ?, ?)',
      [req.session.usuarioId, produtoId, quantidade, produto.preco, req.session.turno],
      function(err) {
        if (err) {
          return res.status(500).json({ erro: 'Erro ao registrar venda' });
        }

        // Atualizar quantidade do produto
        const novaQuantidade = produto.quantidade - quantidade;
        db.run('UPDATE produtos SET quantidade = ? WHERE id = ?', [novaQuantidade, produtoId], (err) => {
          if (err) {
            return res.status(500).json({ erro: 'Erro ao atualizar estoque' });
          }
          res.json({ sucesso: true, id: this.lastID, nomeUsuario: req.session.nomeUsuario });
        });
      }
    );
  });
});

// Relatório de vendas por período
app.get('/api/relatorio', verificarAutenticacao, (req, res) => {
  const { filtro } = req.query; // 'dia', 'mes', 'ano'

  // Escolher expressão de período conforme filtro
  let periodoExpr = "DATE(data_venda)"; // dia
  if (filtro === 'mes') periodoExpr = "strftime('%Y-%m', data_venda)";
  if (filtro === 'ano') periodoExpr = "strftime('%Y', data_venda)";

  const hoje = new Date();
  const params = [req.session.usuarioId];

  let sql = `
    SELECT
      ${periodoExpr} as periodo,
      turno,
      SUM(quantidade * preco_unitario) as total_vendido,
      COUNT(*) as numero_vendas
    FROM vendas
    WHERE usuario_id = ?
  `;

  if (filtro === 'dia') {
    const dataHoje = hoje.toISOString().split('T')[0];
    sql += ` AND DATE(data_venda) = ?`;
    params.push(dataHoje);
  } else if (filtro === 'mes') {
    const mes = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    sql += ` AND strftime('%Y-%m', data_venda) = ?`;
    params.push(mes);
  } else if (filtro === 'ano') {
    const ano = hoje.getFullYear().toString();
    sql += ` AND strftime('%Y', data_venda) = ?`;
    params.push(ano);
  }

  sql += ` GROUP BY periodo, turno`;

  db.all(sql, params, (err, vendas) => {
    if (err) {
      console.error('Erro ao gerar relatório:', err);
      return res.status(500).json({ erro: 'Erro ao gerar relatório' });
    }
    res.json(vendas);
  });
});

// Obter total de vendas do dia
app.get('/api/vendas-dia', verificarAutenticacao, (req, res) => {
  const hoje = new Date().toISOString().split('T')[0];

  db.all(
    `SELECT 
      usuarios.nome as nome_usuario,
      produtos.nome,
      vendas.quantidade,
      vendas.preco_unitario,
      vendas.turno,
      (vendas.quantidade * vendas.preco_unitario) as total,
      vendas.data_venda
    FROM vendas
    JOIN produtos ON vendas.produto_id = produtos.id
    JOIN usuarios ON vendas.usuario_id = usuarios.id
    WHERE vendas.usuario_id = ? AND DATE(vendas.data_venda) = ?
    ORDER BY vendas.data_venda DESC`,
    [req.session.usuarioId, hoje],
    (err, vendas) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao buscar vendas do dia' });
      }
      
      const totalVendido = vendas.reduce((acc, v) => acc + v.total, 0);
      res.json({ vendas, totalVendido });
    }
  );
});

// Handler para rotas API não encontradas (ajuda no debug de 404)
app.all('/api/*', (req, res) => {
  res.status(404).json({ erro: 'Rota API não encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
