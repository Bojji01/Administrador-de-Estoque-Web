// API Base URL
const API_URL = 'http://localhost:3000/api';

// Estado da aplicação
let estadoApp = {
  usuarioAutenticado: false,
  nomeUsuario: '',
  turnoSelecionado: null,
  produtos: [],
  telaAtual: 'telaLogin',
  carrinhoAtual: {
    produtoId: null,
    quantidade: 0
  },
  intervaloRelatorio: null
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  verificarSessao();
  configurarEventos();
  carregarProdutos();
});

// Verificar sessão ao carregar
function verificarSessao() {
  fetch(`${API_URL}/sessao`)
    .then(response => response.json())
    .then(data => {
      if (data.autenticado) {
        estadoApp.usuarioAutenticado = true;
        estadoApp.nomeUsuario = data.nomeUsuario;
        estadoApp.turnoSelecionado = data.turno;

        if (data.turno) {
          mostrarTelaAutenticada();
          mostrarTela('telaVendas');
        } else {
          mostrarTela('telaTurno');
          document.getElementById('nomeTurno').textContent = data.nomeUsuario;
        }

        atualizarNavbar();
      }
    })
    .catch(error => console.error('Erro ao verificar sessão:', error));
}

// Configurar eventos dos formulários
function configurarEventos() {
  document.getElementById('formLogin').addEventListener('submit', (e) => {
    e.preventDefault();
    realizarLogin();
  });

  document.getElementById('formRegistro').addEventListener('submit', (e) => {
    e.preventDefault();
    realizarRegistro();
  });

  document.getElementById('formProduto').addEventListener('submit', (e) => {
    e.preventDefault();
    cadastrarProduto();
  });

  // Eventos do carrinho de vendas (protegidos caso os elementos não existam ainda)
  const btnConfirmar = document.getElementById('btnConfirmarVenda');
  if (btnConfirmar) btnConfirmar.addEventListener('click', registrarVenda);
  const btnLimpar = document.getElementById('btnLimparCarrinho');
  if (btnLimpar) btnLimpar.addEventListener('click', limparCarrinho);
}

// ========== AUTENTICAÇÃO ==========

function realizarLogin() {
  const nome = document.getElementById('loginUsuario').value;
  const senha = document.getElementById('loginSenha').value;

  fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, senha }),
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      if (data.sucesso) {
        estadoApp.usuarioAutenticado = true;
        estadoApp.nomeUsuario = data.nomeUsuario;
        mostrarTelaAutenticada();
        mostrarTela('telaTurno');
        document.getElementById('nomeTurno').textContent = data.nomeUsuario;
        document.getElementById('formLogin').reset();
      } else {
        exibirErro('mensagemLogin', data.erro || 'Erro ao fazer login');
      }
    })
    .catch(error => {
      console.error('Erro:', error);
      exibirErro('mensagemLogin', 'Erro ao conectar com servidor');
    });
}

function realizarRegistro() {
  const nome = document.getElementById('registroUsuario').value;
  const senha = document.getElementById('registroSenha').value;
  const confirmar = document.getElementById('registroConfirmar').value;

  if (senha !== confirmar) {
    exibirErro('mensagemRegistro', 'As senhas não coincidem');
    return;
  }

  fetch(`${API_URL}/registrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, senha })
  })
    .then(response => response.json())
    .then(data => {
      if (data.sucesso) {
        document.getElementById('mensagemRegistro').textContent = 'Usuário registrado com sucesso! Faça login.';
        document.getElementById('mensagemRegistro').classList.add('mensagem-sucesso');
        document.getElementById('formRegistro').reset();
        setTimeout(() => mostrarTela('telaLogin'), 1500);
      } else {
        exibirErro('mensagemRegistro', data.erro || 'Erro ao registrar');
      }
    })
    .catch(error => {
      console.error('Erro:', error);
      exibirErro('mensagemRegistro', 'Erro ao conectar com servidor');
    });
}

function logout() {
  fetch(`${API_URL}/logout`, {
    method: 'POST',
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      if (data.sucesso) {
        estadoApp.usuarioAutenticado = false;
        estadoApp.turnoSelecionado = null;
        document.getElementById('navbar').classList.remove('ativa');
        mostrarTela('telaLogin');
        clearInterval(estadoApp.intervaloRelatorio);
      }
    });
}

// ========== TURNO ==========

function definirTurno(turno) {
  fetch(`${API_URL}/definir-turno`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turno }),
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      if (data.sucesso) {
        estadoApp.turnoSelecionado = turno;
        atualizarNavbar();
        mostrarTela('telaVendas');
      }
    });
}

function mudarTurno() {
  mostrarTela('telaTurno');
  document.getElementById('nomeTurno').textContent = estadoApp.nomeUsuario;
}

// ========== PRODUTOS ==========

function carregarProdutos() {
  if (!estadoApp.usuarioAutenticado) return;

  fetch(`${API_URL}/produtos`, {
    credentials: 'include'
  })
    .then(response => response.json())
    .then(produtos => {
      estadoApp.produtos = produtos;
      atualizarGridProdutos();
      atualizarTabelaProdutos();
    })
    .catch(error => console.error('Erro ao carregar produtos:', error));
}

function atualizarGridProdutos() {
  const grid = document.getElementById('gridProdutos');
  const html = estadoApp.produtos.map(p => `
    <div class="produto-card ${estadoApp.carrinhoAtual.produtoId === p.id ? 'selecionado' : ''}" 
         onclick="selecionarProdutoVenda(${p.id})" 
         title="${p.nome}">
      <h4>${p.nome}</h4>
      <p class="produto-preco">R$ ${p.preco.toFixed(2)}</p>
      <p>📦 ${p.quantidade}</p>
    </div>
  `).join('');
  grid.innerHTML = html || '<p>Nenhum produto cadastrado</p>';
}

function atualizarTabelaProdutos() {
  const tbody = document.getElementById('corpoProdutos');
  const html = estadoApp.produtos.map(p => `
    <tr>
      <td>${p.nome}</td>
      <td>R$ ${p.preco.toFixed(2)}</td>
      <td>${p.quantidade}</td>
      <td>
        <div style="display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
          <button class="btn-acao btn-deletar" onclick="deletarProduto(${p.id}, '${p.nome}')">🗑️ Del</button>
          <input type="number" min="1" value="1" id="qtd-${p.id}" style="width: 60px; padding: 6px;">
          <button class="btn-acao btn-adicionar" onclick="manipularEstoque(${p.id}, 'adicionar')">➕ Add</button>
          <button class="btn-acao btn-remover" onclick="manipularEstoque(${p.id}, 'remover')">➖ Rem</button>
        </div>
      </td>
    </tr>
  `).join('');
  tbody.innerHTML = html;
}

function manipularEstoque(produtoId, acao) {
  const input = document.getElementById(`qtd-${produtoId}`);
  if (!input) {
    exibirMensagem('mensagemProduto', 'Elemento de quantidade não encontrado', 'erro');
    return;
  }

  const quantidade = parseInt(input.value, 10) || 0;

  if (quantidade <= 0) {
    exibirMensagem('mensagemProduto', 'Quantidade deve ser maior que 0', 'erro');
    return;
  }

  const endpoint = acao === 'adicionar' ? 'aumentar' : 'diminuir';
  const mensagem = acao === 'adicionar' ? 'adicionada' : 'removida';

  fetch(`${API_URL}/produtos/${produtoId}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantidade }),
    credentials: 'include'
  })
    .then(async (response) => {
      // Tentar ler JSON seguro, tratar status HTTP
      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        // não foi JSON
      }

      if (!response.ok) {
        const mensagemErro = (data && data.erro) ? data.erro : (response.statusText || 'Erro no servidor');
        throw new Error(mensagemErro);
      }

      return data;
    })
    .then(data => {
      if (data && data.sucesso) {
        exibirMensagem('mensagemProduto', `Estoque ${mensagem}! Nova quantidade: ${data.novaQuantidade}`, 'sucesso');
        input.value = '1'; // Resetar input
        carregarProdutos();
      } else {
        exibirMensagem('mensagemProduto', (data && data.erro) ? data.erro : 'Erro ao manipular estoque', 'erro');
      }
    })
    .catch(error => {
      console.error('Erro ao manipular estoque:', error);
      exibirMensagem('mensagemProduto', error.message || 'Erro ao manipular estoque', 'erro');
    });
}

function deletarProduto(produtoId, nomeProduto) {
  const confirmacao = confirm(`Tem certeza que deseja deletar o produto "${nomeProduto}"?\n\nEsta ação não pode ser desfeita.`);
  
  if (!confirmacao) {
    return; // Usuário clicou em "Cancelar"
  }

  fetch(`${API_URL}/produtos/${produtoId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  })
    .then(async (response) => {
      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        // não foi JSON
      }

      if (!response.ok) {
        const mensagemErro = (data && data.erro) ? data.erro : (response.statusText || 'Erro no servidor');
        throw new Error(mensagemErro);
      }

      return data;
    })
    .then(data => {
      if (data && data.sucesso) {
        exibirMensagem('mensagemProduto', 'Produto deletado com sucesso!', 'sucesso');
        carregarProdutos(); // Recarregar lista
      } else {
        exibirMensagem('mensagemProduto', (data && data.erro) ? data.erro : 'Erro ao deletar produto', 'erro');
      }
    })
    .catch(error => {
      console.error('Erro ao deletar produto:', error);
      exibirMensagem('mensagemProduto', error.message || 'Erro ao deletar produto', 'erro');
    });
}

function cadastrarProduto() {
  const nome = document.getElementById('nomeProduto').value;
  const preco = parseFloat(document.getElementById('precoProduto').value);
  const quantidade = parseInt(document.getElementById('quantidadeProduto').value);

  fetch(`${API_URL}/produtos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, preco, quantidade }),
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      if (data.sucesso) {
        exibirMensagem('mensagemProduto', data.mensagem || 'Produto cadastrado com sucesso!', 'sucesso');
        document.getElementById('formProduto').reset();
        carregarProdutos();
      }
    });
}

// ========== VENDAS ==========

function selecionarProdutoVenda(produtoId) {
  const produto = estadoApp.produtos.find(p => p.id === produtoId);
  if (!produto) return;

  // Se clicou no mesmo produto, aumenta quantidade
  if (estadoApp.carrinhoAtual.produtoId === produtoId) {
    if (estadoApp.carrinhoAtual.quantidade < produto.quantidade) {
      estadoApp.carrinhoAtual.quantidade++;
    } else {
      exibirMensagem('mensagemVenda', 'Quantidade disponível insuficiente', 'erro');
    }
  } else {
    // Novo produto selecionado
    estadoApp.carrinhoAtual.produtoId = produtoId;
    estadoApp.carrinhoAtual.quantidade = 1;
  }

  atualizarGridProdutos();
  atualizarInfoCarrinho();
}

function atualizarInfoCarrinho() {
  const produto = estadoApp.produtos.find(p => p.id === estadoApp.carrinhoAtual.produtoId);
  
  if (!produto) {
    document.getElementById('produtoSelecionado').textContent = 'Nenhum';
    document.getElementById('quantidadeSelecionada').textContent = '0';
    document.getElementById('totalCarrinho').textContent = 'R$ 0,00';
    return;
  }

  const total = produto.preco * estadoApp.carrinhoAtual.quantidade;
  
  document.getElementById('produtoSelecionado').textContent = produto.nome;
  document.getElementById('quantidadeSelecionada').textContent = estadoApp.carrinhoAtual.quantidade;
  document.getElementById('totalCarrinho').textContent = `R$ ${total.toFixed(2)}`;
}

function limparCarrinho() {
  estadoApp.carrinhoAtual = { produtoId: null, quantidade: 0 };
  atualizarGridProdutos();
  atualizarInfoCarrinho();
}

function registrarVenda() {
  if (!estadoApp.carrinhoAtual.produtoId || estadoApp.carrinhoAtual.quantidade === 0) {
    exibirMensagem('mensagemVenda', 'Selecione um produto clicando no card', 'erro');
    return;
  }

  const { produtoId, quantidade } = estadoApp.carrinhoAtual;

  fetch(`${API_URL}/vendas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ produtoId, quantidade }),
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      if (data.sucesso) {
        exibirMensagem('mensagemVenda', '✅ Venda registrada com sucesso!', 'sucesso');
        limparCarrinho();
        carregarProdutos();
        carregarVendasDia();
      } else {
        exibirMensagem('mensagemVenda', data.erro || 'Erro ao registrar venda', 'erro');
      }
    })
    .catch(error => {
      console.error('Erro:', error);
      exibirMensagem('mensagemVenda', 'Erro ao registrar venda', 'erro');
    });
}

function carregarVendasDia() {
  fetch(`${API_URL}/vendas-dia`, {
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      const lista = document.getElementById('listaVendasDia');
      const html = data.vendas.map(v => `
        <div class="venda-item">
          <div class="venda-info">
            <p><strong>${v.nome}</strong></p>
            <p>Usuário: <strong>${v.nome_usuario}</strong></p>
            <p>Quantidade: ${v.quantidade}</p>
            <p>Turno: ${v.turno}</p>
            <p>Horário: ${new Date(v.data_venda).toLocaleTimeString('pt-BR')}</p>
          </div>
          <div class="venda-preco">R$ ${(v.quantidade * v.preco_unitario).toFixed(2)}</div>
        </div>
      `).join('');
      
      lista.innerHTML = html || '<p>Nenhuma venda registrada hoje</p>';
      document.getElementById('totalDia').textContent = `R$ ${data.totalVendido.toFixed(2)}`;
    });
}

// ========== RELATÓRIO ==========

function carregarRelatorio(filtro, btn) {
  // Atualizar botões ativos
  document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('ativo'));
  if (btn && btn.classList) btn.classList.add('ativo');

  fetch(`${API_URL}/relatorio?filtro=${filtro}`, {
    credentials: 'include'
  })
    .then(async response => {
      let data;
      try { data = await response.json(); } catch (e) { throw new Error('Resposta inválida do servidor'); }
      if (!response.ok) throw new Error(data && data.erro ? data.erro : 'Erro ao carregar relatório');
      return data;
    })
    .then(vendas => {
      const conteudo = document.getElementById('relatorioConteudo');

      if (!Array.isArray(vendas) || vendas.length === 0) {
        conteudo.innerHTML = '<p>Nenhuma venda encontrada neste período</p>';
        return;
      }

      const totalGeral = vendas.reduce((acc, v) => acc + (v.total_vendido || 0), 0);

      let html = '<div class="relatorio-resumo">';
      html += vendas.map(v => `
        <div class="relatorio-item">
          <h4>Período: ${v.periodo}</h4>
          <p>Turno: <strong>${v.turno}</strong></p>
          <p>Total de Vendas: <strong>R$ ${Number(v.total_vendido || 0).toFixed(2)}</strong></p>
          <p>Quantidade de Transações: <strong>${v.numero_vendas}</strong></p>
        </div>
      `).join('');

      html += `
        <div class="relatorio-item" style="background-color: #f0f0f0; border-left-color: #27ae60;">
          <h4>Total Geral</h4>
          <p style="font-size: 18px;"><strong>R$ ${Number(totalGeral).toFixed(2)}</strong></p>
        </div>
      `;
      html += '</div>';

      conteudo.innerHTML = html;
    })
    .catch(err => {
      exibirMensagem('mensagemRelatorio', err.message || 'Erro ao carregar relatório', 'erro');
    });
}

// ========== NAVEGAÇÃO E UI ==========

function mostrarTelaAutenticada() {
  document.getElementById('navbar').classList.add('ativa');
  document.getElementById('nomeUsuarioNav').textContent = estadoApp.nomeUsuario;
}

function atualizarNavbar() {
  const turnoTexto = estadoApp.turnoSelecionado === 'manhã' ? '☀️ Manhã' : '🌙 Noite';
  document.getElementById('turnoNav').textContent = turnoTexto;
}

function mostrarTela(telaNova) {
  // Parar interval anterior
  if (estadoApp.intervaloRelatorio) {
    clearInterval(estadoApp.intervaloRelatorio);
    estadoApp.intervaloRelatorio = null;
  }

  // Esconder todas as telas
  document.querySelectorAll('.tela').forEach(tela => {
    tela.classList.remove('ativa');
  });

  // Mostrar tela nova
  const telaElement = document.getElementById(telaNova);
  if (telaElement) {
    telaElement.classList.add('ativa');
    estadoApp.telaAtual = telaNova;

    // Carregar dados ao abrir telas
    if (telaNova === 'telaVendas') {
      carregarVendasDia();
      // Auto-refresh a cada 2 segundos
      estadoApp.intervaloRelatorio = setInterval(() => {
        carregarVendasDia();
      }, 2000);
    } else if (telaNova === 'telaCadastroProduto') {
      carregarProdutos();
    } else if (telaNova === 'telaRelatorio') {
      carregarRelatorio('dia');
      // Auto-refresh a cada 3 segundos
      estadoApp.intervaloRelatorio = setInterval(() => {
        carregarRelatorio('dia');
      }, 3000);
    }
  }
}

function exibirMensagem(elementId, mensagem, tipo) {
  const elemento = document.getElementById(elementId);
  elemento.textContent = mensagem;
  elemento.classList.remove('sucesso', 'erro');
  elemento.classList.add(tipo);
  elemento.style.display = 'block';

  setTimeout(() => {
    elemento.style.display = 'none';
  }, 4000);
}

function exibirErro(elementId, mensagem) {
  const elemento = document.getElementById(elementId);
  elemento.textContent = mensagem;
  elemento.classList.add('ativo');

  setTimeout(() => {
    elemento.classList.remove('ativo');
  }, 4000);
}
