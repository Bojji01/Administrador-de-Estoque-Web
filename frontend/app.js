// API Base URL
const API_URL = 'http://localhost:3000/api';

// Estado da aplicação
let estadoApp = {
  usuarioAutenticado: false,
  nomeUsuario: '',
  turnoSelecionado: null,
  produtos: [],
  telaAtual: 'telaLogin',
  carrinho: [], // Array de itens: [{ produtoId, quantidade }, ...]
  intervaloRelatorio: null,
  menuAberto: false,
  isAdmin: false
};

// ========== HAMBURGER MENU ==========

function toggleMenu() {
  estadoApp.menuAberto = !estadoApp.menuAberto;
  const hamburger = document.getElementById('hamburgerBtn');
  const navCenter = document.querySelector('.navbar-center');
  
  if (!hamburger || !navCenter) return;

  if (estadoApp.menuAberto) {
    hamburger.classList.add('active');
    navCenter.classList.add('active');
    document.body.style.overflow = 'hidden'; // Impedir scroll
  } else {
    hamburger.classList.remove('active');
    navCenter.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

function closeMenu() {
  if (estadoApp.menuAberto) {
    estadoApp.menuAberto = false;
    const hamburger = document.getElementById('hamburgerBtn');
    const navCenter = document.querySelector('.navbar-center');
    
    if (hamburger) hamburger.classList.remove('active');
    if (navCenter) navCenter.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// Fechar menu ao clicar fora
document.addEventListener('click', (e) => {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburgerBtn');
  const navCenter = document.querySelector('.navbar-center');
  
  if (navbar && hamburger && navCenter) {
    if (!navbar.contains(e.target) && estadoApp.menuAberto) {
      closeMenu();
    }
  }
});

// Fechar menu ao redimensionar
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    closeMenu();
  }
});

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
        estadoApp.isAdmin = data.isAdmin || false;

        // Mostrar/ocultar menu admin
        const navAdmin = document.getElementById('navAdmin');
        const navRegistroCrew = document.getElementById('navRegistroCrew');
        if (navAdmin) {
          navAdmin.style.display = estadoApp.isAdmin ? 'block' : 'none';
        }
        if (navRegistroCrew) {
          navRegistroCrew.style.display = estadoApp.isAdmin ? 'block' : 'none';
        }

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

  // Evento do formulário de registro de crew member
  const formRegistrarCrew = document.getElementById('formRegistrarCrew');
  if (formRegistrarCrew) {
    formRegistrarCrew.addEventListener('submit', (e) => {
      e.preventDefault();
      registrarCrewMembro();
    });
  }
}

// ========== AUTENTICAÇÃO ==========

function realizarLogin() {
  const nome = document.getElementById('loginUsuario').value;
  const senha = document.getElementById('loginSenha').value;
  const totp_code = document.getElementById('loginTOTP').value;

  fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, senha, totp_code: totp_code || undefined }),
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
        document.getElementById('grupoTOTP').style.display = 'none';
      } else if (data.requer_totp) {
        // Mostrar campo de TOTP
        document.getElementById('grupoTOTP').style.display = 'block';
        document.getElementById('loginTOTP').focus();
        exibirErro('mensagemLogin', data.mensagem);
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
  const html = estadoApp.produtos.map(p => {
    const itemCarrinho = estadoApp.carrinho.find(item => item.produtoId === p.id);
    const selecionado = itemCarrinho ? 'selecionado' : '';
    const qtyDisplay = itemCarrinho ? `(${itemCarrinho.quantidade})` : '';

    return `
    <div class="produto-card ${selecionado}" 
         onclick="adicionarAoCarrinho(${p.id})" 
         title="${p.nome}">
      <h4>${p.nome}</h4>
      <p class="produto-preco">R$ ${p.preco.toFixed(2)}</p>
      <p>📦 ${p.quantidade}</p>
      <p style="font-weight: bold; color: #27ae60;">${qtyDisplay}</p>
    </div>
  `;
  }).join('');
  grid.innerHTML = html || '<p>Nenhum produto cadastrado</p>';
}

function atualizarTabelaProdutos() {
  const tbody = document.getElementById('corpoProdutos');
  const html = estadoApp.produtos.map(p => {
    const faltando = Math.max(0, (p.minimo || 0) - (p.quantidade || 0));
    const nomeEscapado = (p.nome || '').replace(/'/g, "\\'");
    const avisoClass = faltando > 0 ? 'aviso' : '';

    return `
    <tr>
      <td class="${avisoClass}">${faltando > 0 ? '⚠️ ' : ''}${p.nome}</td>
      <td>${faltando > 0 ? faltando : '-'}</td>
      <td>R$ ${p.preco.toFixed(2)}</td>
      <td>${p.quantidade}</td>
      <td>
        <div style="display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
          <button class="btn-acao btn-deletar" onclick="deletarProduto(${p.id}, '${nomeEscapado}')">🗑️ Del</button>
          <input type="number" min="1" value="1" id="qtd-${p.id}" style="width: 60px; padding: 6px;">
          <button class="btn-acao btn-adicionar" onclick="manipularEstoque(${p.id}, 'adicionar')">➕ Add</button>
          <button class="btn-acao btn-remover" onclick="manipularEstoque(${p.id}, 'remover')">➖ Rem</button>
          <div style="display:flex; align-items:center; gap:6px; margin-left:6px;">
            <input type="number" id="minimo-${p.id}" min="0" value="${p.minimo || 0}" style="width:70px; padding:6px;">
            <button class="btn btn-primary" onclick="atualizarMinimo(${p.id})">Salvar mínimo</button>
          </div>
        </div>
      </td>
    </tr>
  `;
  }).join('');
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
  const minimo = parseInt(document.getElementById('minimoProduto').value) || 0;
  const categoria = document.querySelector('input[name="categoria"]:checked')?.value || 'mercadoria';

  fetch(`${API_URL}/produtos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, preco, quantidade, minimo, categoria }),
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

function atualizarMinimo(produtoId) {
  const input = document.getElementById(`minimo-${produtoId}`);
  if (!input) {
    exibirMensagem('mensagemProduto', 'Elemento de mínimo não encontrado', 'erro');
    return;
  }

  const minimo = parseInt(input.value, 10);
  if (isNaN(minimo) || minimo < 0) {
    exibirMensagem('mensagemProduto', 'Quantidade mínima inválida', 'erro');
    return;
  }

  fetch(`${API_URL}/produtos/${produtoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minimo }),
    credentials: 'include'
  })
    .then(async (response) => {
      let data = null;
      try { data = await response.json(); } catch (e) {}
      if (!response.ok) {
        const mensagemErro = (data && data.erro) ? data.erro : (response.statusText || 'Erro no servidor');
        throw new Error(mensagemErro);
      }
      return data;
    })
    .then(data => {
      exibirMensagem('mensagemProduto', 'Mínimo atualizado com sucesso', 'sucesso');
      carregarProdutos();
    })
    .catch(err => {
      console.error('Erro ao atualizar mínimo:', err);
      exibirMensagem('mensagemProduto', err.message || 'Erro ao atualizar mínimo', 'erro');
    });
}

// ========== VENDAS ==========

function adicionarAoCarrinho(produtoId) {
  const produto = estadoApp.produtos.find(p => p.id === produtoId);
  if (!produto) return;

  // Verificar se produto já está no carrinho
  const itemCarrinho = estadoApp.carrinho.find(item => item.produtoId === produtoId);
  
  if (itemCarrinho) {
    // Aumentar quantidade se já está no carrinho
    if (itemCarrinho.quantidade < produto.quantidade) {
      itemCarrinho.quantidade++;
    } else {
      exibirMensagem('mensagemVenda', 'Quantidade disponível insuficiente', 'erro');
      return;
    }
  } else {
    // Adicionar novo item ao carrinho
    estadoApp.carrinho.push({
      produtoId: produtoId,
      quantidade: 1
    });
  }

  atualizarGridProdutos();
  atualizarVisualizacaoCarrinho();
}

function removerDoCarrinho(produtoId) {
  estadoApp.carrinho = estadoApp.carrinho.filter(item => item.produtoId !== produtoId);
  atualizarGridProdutos();
  atualizarVisualizacaoCarrinho();
}

function aumentarQuantidadeCarrinho(produtoId) {
  const item = estadoApp.carrinho.find(i => i.produtoId === produtoId);
  const produto = estadoApp.produtos.find(p => p.id === produtoId);
  
  if (item && produto && item.quantidade < produto.quantidade) {
    item.quantidade++;
    atualizarVisualizacaoCarrinho();
  }
}

function diminuirQuantidadeCarrinho(produtoId) {
  const item = estadoApp.carrinho.find(i => i.produtoId === produtoId);
  
  if (item && item.quantidade > 1) {
    item.quantidade--;
    atualizarVisualizacaoCarrinho();
  }
}

function atualizarVisualizacaoCarrinho() {
  const container = document.getElementById('itensCarrinho');
  
  if (estadoApp.carrinho.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #888;">Nenhum produto selecionado</p>';
    document.getElementById('totalCarrinho').textContent = 'R$ 0,00';
    return;
  }

  let html = '<table style="width: 100%; border-collapse: collapse;">';
  html += '<thead><tr style="border-bottom: 2px solid #ddd;"><th style="text-align: left; padding: 8px;">Produto</th><th>Qtd</th><th>Preço Unit.</th><th>Total</th><th>Ações</th></tr></thead>';
  html += '<tbody>';

  let totalGeral = 0;

  estadoApp.carrinho.forEach(item => {
    const produto = estadoApp.produtos.find(p => p.id === item.produtoId);
    if (!produto) return;
    
    const totalItem = produto.preco * item.quantidade;
    totalGeral += totalItem;

    html += `
      <tr style="border-bottom: 1px solid #eee; padding: 8px;">
        <td style="padding: 8px;">${produto.nome}</td>
        <td style="text-align: center; padding: 8px;">
          <button class="btn-qty" onclick="diminuirQuantidadeCarrinho(${produto.id})" style="padding: 2px 6px;">-</button>
          ${item.quantidade}
          <button class="btn-qty" onclick="aumentarQuantidadeCarrinho(${produto.id})" style="padding: 2px 6px;">+</button>
        </td>
        <td style="text-align: center; padding: 8px;">R$ ${produto.preco.toFixed(2)}</td>
        <td style="text-align: center; padding: 8px;"><strong>R$ ${totalItem.toFixed(2)}</strong></td>
        <td style="text-align: center; padding: 8px;">
          <button class="btn-acao btn-remover" onclick="removerDoCarrinho(${produto.id})" style="padding: 4px 8px;">❌</button>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
  document.getElementById('totalCarrinho').textContent = `R$ ${totalGeral.toFixed(2)}`;
}

function limparCarrinho() {
  estadoApp.carrinho = [];
  atualizarGridProdutos();
  atualizarVisualizacaoCarrinho();
}

function registrarVenda() {
  if (estadoApp.carrinho.length === 0) {
    exibirMensagem('mensagemVenda', 'Selecione ao menos um produto clicando no card', 'erro');
    return;
  }

  // Registrar cada item do carrinho como uma venda separada
  let vendidosCount = 0;
  let totalVendas = estadoApp.carrinho.length;

  estadoApp.carrinho.forEach((item, index) => {
    const { produtoId, quantidade } = item;

    fetch(`${API_URL}/vendas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produtoId, quantidade }),
      credentials: 'include'
    })
      .then(response => response.json())
      .then(data => {
        vendidosCount++;
        
        if (vendidosCount === totalVendas) {
          // Todas as vendas foram registradas
          exibirMensagem('mensagemVenda', `✅ ${totalVendas} item(ns) vendido(s) com sucesso!`, 'sucesso');
          limparCarrinho();
          carregarProdutos();
          carregarVendasDia();
        }
      })
      .catch(error => {
        console.error('Erro:', error);
        exibirMensagem('mensagemVenda', 'Erro ao registrar venda', 'erro');
      });
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

let chartInstance = null;

function renderizarChartVendas(vendas, filtro) {
  const ctx = document.getElementById('chartVendas');
  if (!ctx) return;

  // Agrupar vendas por categoria
  const porCategoria = {
    'cigarro': 0,
    'recarga/chip': 0,
    'mercadoria': 0
  };

  vendas.forEach(v => {
    const cat = v.categoria || 'mercadoria';
    if (cat in porCategoria) {
      porCategoria[cat] += Number(v.total_vendido || 0);
    }
  });

  // Cores para cada categoria
  const cores = {
    'cigarro': '#e74c3c',      // vermelho
    'recarga/chip': '#3498db', // azul
    'mercadoria': '#27ae60'    // verde
  };

  const labels = Object.keys(porCategoria);
  const dados = Object.values(porCategoria);
  const cores_array = labels.map(label => cores[label]);

  // Destruir gráfico anterior se existir
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Criar novo gráfico
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [
        '🚬 Cigarro',
        '📱 Recarga/Chip',
        '📦 Mercadoria'
      ],
      datasets: [
        {
          label: 'Total de Vendas (R$)',
          data: dados,
          backgroundColor: cores_array,
          borderColor: cores_array,
          borderWidth: 1,
          borderRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'x',
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return 'R$ ' + value.toFixed(2);
            }
          },
          title: {
            display: true,
            text: 'Valor em Reais'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'Total: R$ ' + context.parsed.y.toFixed(2);
            }
          }
        },
        title: {
          display: true,
          text: `Vendas por Categoria - ${filtro === 'dia' ? 'Hoje' : filtro === 'mes' ? 'Este Mês' : 'Este Ano'}`
        }
      }
    }
  });
}

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

      // Renderizar gráfico
      renderizarChartVendas(vendas, filtro);

      const totalGeral = vendas.reduce((acc, v) => acc + (v.total_vendido || 0), 0);

      let html = '<div class="relatorio-resumo">';
      
      // Agrupar vendas por categoria
      const porCategoria = {};
      vendas.forEach(v => {
        const cat = v.categoria || 'mercadoria';
        if (!porCategoria[cat]) porCategoria[cat] = [];
        porCategoria[cat].push(v);
      });

      // Renderizar por categoria
      Object.keys(porCategoria).forEach(categoria => {
        const icone = categoria === 'cigarro' ? '🚬' : categoria === 'recarga/chip' ? '📱' : '📦';
        const vendascategoria = porCategoria[categoria];
        const totalCategoria = vendascategoria.reduce((acc, v) => acc + (v.total_vendido || 0), 0);

        html += `<div style="margin-bottom: 20px; border: 1px solid #ddd; border-radius: 6px; padding: 10px;">`;
        html += `<h3 style="margin-top: 0;">${icone} ${categoria.toUpperCase()}</h3>`;
        
        vendascategoria.forEach(v => {
          html += `
            <div class="relatorio-item">
              <h4>Período: ${v.periodo}</h4>
              <p>Turno: <strong>${v.turno}</strong></p>
              <p>Total de Vendas: <strong>R$ ${Number(v.total_vendido || 0).toFixed(2)}</strong></p>
              <p>Quantidade de Transações: <strong>${v.numero_vendas}</strong></p>
            </div>
          `;
        });

        html += `<div style="background: #f5f5f5; padding: 8px; margin-top: 8px; border-radius: 4px;"><strong>Subtotal ${categoria}: R$ ${totalCategoria.toFixed(2)}</strong></div>`;
        html += `</div>`;
      });

      html += `
        <div class="relatorio-item" style="background-color: #f0f0f0; border-left-color: #27ae60;">
          <h4>Total Geral</h4>
          <p style="font-size: 18px;"><strong>R$ ${Number(totalGeral).toFixed(2)}</strong></p>
        </div>
      `;
      html += '</div>';

      conteudo.innerHTML = html;

      // Carregar lista de produtos em alerta logo abaixo do relatório
      carregarAlertas();
    })
    .catch(err => {
      exibirMensagem('mensagemRelatorio', err.message || 'Erro ao carregar relatório', 'erro');
    });
}

function carregarAlertas() {
  const container = document.getElementById('listaAlertas');
  if (!container) return;

  if (!estadoApp.usuarioAutenticado) {
    container.innerHTML = '<p>Faça login para ver produtos em alerta</p>';
    return;
  }

  fetch(`${API_URL}/produtos/alertas`, { credentials: 'include' })
    .then(async response => {
      let data;
      try { data = await response.json(); } catch (e) { throw new Error('Resposta inválida do servidor'); }
      if (!response.ok) throw new Error(data && data.erro ? data.erro : 'Erro ao carregar alertas');
      return data;
    })
    .then(produtos => {
      if (!Array.isArray(produtos) || produtos.length === 0) {
        container.innerHTML = '<p>Nenhum produto em alerta</p>';
        return;
      }

      const html = produtos.map(p => `
        <div class="alerta-item">
          <div class="alerta-info">
            <span class="nome">${p.nome}</span>
            <span class="faltando">Faltando: <strong>${p.faltando}</strong></span>
          </div>
          <div class="alerta-acoes">
            <button class="btn btn-primary" onclick="irParaProduto(${p.id})">Ver / Editar</button>
          </div>
        </div>
      `).join('');

      container.innerHTML = html;
    })
    .catch(err => {
      console.error('Erro ao carregar alertas:', err);
      if (container) container.innerHTML = `<p class="mensagem-erro">${err.message}</p>`;
    });
}

function irParaProduto(produtoId) {
  // Navega para a tela de cadastro/edição de produto e foca o campo de mínimo
  mostrarTela('telaCadastroProduto');
  carregarProdutos();
  setTimeout(() => {
    const input = document.getElementById(`minimo-${produtoId}`);
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
      input.classList.add('destaque');
      setTimeout(() => input.classList.remove('destaque'), 2000);
    }
  }, 400);
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
    } else if (telaNova === 'tela2FA') {
      carregarStatus2FA();
    } else if (telaNova === 'telaAdmin') {
      carregarFuncionarios();
      carregarVendasFuncionarios('dia');
      carregarEstatisticas('dia');
    } else if (telaNova === 'telaRegistroCrew') {
      carregarListaCrewRegistrados();
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

// ========== 2FA (Google Authenticator) ==========

let secretoAtual2FA = null;

function carregarStatus2FA() {
  fetch(`${API_URL}/2fa/status`, { credentials: 'include' })
    .then(response => response.json())
    .then(data => {
      const statusTexto = document.getElementById('statusTexto');
      const formularioAtivar = document.getElementById('formularioAtivar2FA');
      const passoDesativar = document.getElementById('passoDesativar');

      if (data.totp_ativado) {
        statusTexto.textContent = '✓ Ativado';
        statusTexto.style.color = '#27ae60';
        formularioAtivar.style.display = 'none';
        passoDesativar.style.display = 'block';
      } else {
        statusTexto.textContent = 'Desativado';
        statusTexto.style.color = '#e74c3c';
        formularioAtivar.style.display = 'block';
        passoDesativar.style.display = 'none';
      }
    })
    .catch(err => console.error('Erro ao carregar status 2FA:', err));
}

function iniciarAtivacao2FA() {
  fetch(`${API_URL}/2fa/gerar-qr`, {
    method: 'POST',
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      console.log('Dados recebidos:', data);
      console.log('QR Code URL:', data.qr_code);
      
      secretoAtual2FA = data.secret;
      const imgElement = document.getElementById('qrCodeImage');
      imgElement.src = data.qr_code;
      
      // Garantir que a imagem está visível
      imgElement.style.display = 'block';
      imgElement.style.maxWidth = '300px';
      imgElement.style.margin = '20px auto';
      
      document.getElementById('formularioAtivar2FA').style.display = 'none';
      document.getElementById('passoQRCode').style.display = 'block';
    })
    .catch(err => {
      console.error('Erro:', err);
      exibirMensagem2FA('Erro ao gerar QR code', 'erro');
    });
}

function irParaPasso2() {
  if (!secretoAtual2FA) {
    exibirMensagem2FA('Erro: Segredo não encontrado', 'erro');
    return;
  }
  
  document.getElementById('passoQRCode').style.display = 'none';
  document.getElementById('passoVerificacao').style.display = 'block';
  document.getElementById('inputCodigoVerificacao').focus();
}

function voltarPasso1() {
  document.getElementById('passoQRCode').style.display = 'block';
  document.getElementById('passoVerificacao').style.display = 'none';
}

function ativar2FAComCodigo() {
  const codigo = document.getElementById('inputCodigoVerificacao').value;

  if (!codigo || codigo.length !== 6) {
    exibirMensagem2FA('Digite um código válido de 6 dígitos', 'erro');
    return;
  }

  fetch(`${API_URL}/2fa/ativar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: secretoAtual2FA, totp_code: codigo }),
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      if (data.sucesso) {
        exibirMensagem2FA('2FA ativado com sucesso! ✓', 'sucesso');
        
        setTimeout(() => {
          document.getElementById('passoVerificacao').style.display = 'none';
          document.getElementById('passoQRCode').style.display = 'none';
          document.getElementById('formularioAtivar2FA').style.display = 'none';
          document.getElementById('passoDesativar').style.display = 'block';
          
          const statusTexto = document.getElementById('statusTexto');
          statusTexto.textContent = '✓ Ativado';
          statusTexto.style.color = '#27ae60';
          
          document.getElementById('inputCodigoVerificacao').value = '';
          secretoAtual2FA = null;
        }, 1500);
      } else {
        exibirMensagem2FA(data.erro || 'Erro ao ativar 2FA', 'erro');
      }
    })
    .catch(err => {
      console.error('Erro:', err);
      exibirMensagem2FA('Erro ao conectar com servidor', 'erro');
    });
}

function desativar2FA() {
  const codigo = document.getElementById('inputCodigoDesativar').value;

  if (!codigo || codigo.length !== 6) {
    exibirMensagem2FA('Digite um código válido de 6 dígitos', 'erro');
    return;
  }

  if (!confirm('Tem certeza que deseja desativar 2FA? Sua conta ficará menos segura.')) {
    return;
  }

  fetch(`${API_URL}/2fa/desativar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ totp_code: codigo }),
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      if (data.sucesso) {
        exibirMensagem2FA('2FA desativado com sucesso', 'sucesso');
        
        setTimeout(() => {
          document.getElementById('passoDesativar').style.display = 'none';
          document.getElementById('formularioAtivar2FA').style.display = 'block';
          
          const statusTexto = document.getElementById('statusTexto');
          statusTexto.textContent = 'Desativado';
          statusTexto.style.color = '#e74c3c';
          
          document.getElementById('inputCodigoDesativar').value = '';
        }, 1500);
      } else {
        exibirMensagem2FA(data.erro || 'Erro ao desativar 2FA', 'erro');
      }
    })
    .catch(err => {
      console.error('Erro:', err);
      exibirMensagem2FA('Erro ao conectar com servidor', 'erro');
    });
}

function cancelarAtivacao2FA() {
  document.getElementById('passoQRCode').style.display = 'none';
  document.getElementById('passoVerificacao').style.display = 'none';
  document.getElementById('formularioAtivar2FA').style.display = 'block';
  document.getElementById('inputCodigoVerificacao').value = '';
  secretoAtual2FA = null;
}

function exibirMensagem2FA(mensagem, tipo) {
  const elemento = document.getElementById('mensagem2FA');
  elemento.textContent = mensagem;
  elemento.className = 'mensagem';
  
  if (tipo === 'sucesso') {
    elemento.classList.add('sucesso');
  } else if (tipo === 'erro') {
    elemento.classList.add('erro');
  }

  setTimeout(() => {
    elemento.textContent = '';
    elemento.className = 'mensagem';
  }, 4000);
}

// ========== PAINEL ADMIN ==========

// Configurar formulário de registro de funcionário
document.addEventListener('DOMContentLoaded', () => {
  const formRegistrar = document.getElementById('formRegistrarFuncionario');
  if (formRegistrar) {
    formRegistrar.addEventListener('submit', (e) => {
      e.preventDefault();
      registrarFuncionario();
    });
  }
});

function registrarFuncionario() {
  const nome = document.getElementById('nomeFuncionario').value;
  const senha = document.getElementById('senhaFuncionario').value;

  fetch(`${API_URL}/admin/registrar-funcionario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, senha }),
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      if (data.sucesso) {
        exibirMensagem('mensagemRegistroFunc', 'Funcionário registrado com sucesso!', 'sucesso');
        document.getElementById('formRegistrarFuncionario').reset();
        carregarFuncionarios();
      } else {
        exibirMensagem('mensagemRegistroFunc', data.erro || 'Erro ao registrar funcionário', 'erro');
      }
    })
    .catch(err => {
      console.error('Erro:', err);
      exibirMensagem('mensagemRegistroFunc', 'Erro ao conectar com servidor', 'erro');
    });
}

function carregarFuncionarios() {
  fetch(`${API_URL}/admin/funcionarios`, { credentials: 'include' })
    .then(response => response.json())
    .then(usuarios => {
      const container = document.getElementById('listaFuncionarios');
      
      const html = usuarios.map(u => `
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="margin: 0; font-weight: bold;">${u.nome}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">${u.is_admin ? '👨‍💼 Administrador' : '👤 Funcionário'} • Criado em: ${new Date(u.criado_em).toLocaleDateString('pt-BR')}</p>
          </div>
          ${!u.is_admin ? `<button class="btn btn-danger" onclick="deletarFuncionario(${u.id}, '${u.nome}')">Deletar</button>` : ''}
        </div>
      `).join('');
      
      container.innerHTML = html || '<p>Nenhum funcionário registrado</p>';
    })
    .catch(err => console.error('Erro ao carregar funcionários:', err));
}

function deletarFuncionario(funcionarioId, nome) {
  if (!confirm(`Tem certeza que deseja deletar ${nome}? Esta ação não pode ser desfeita.`)) {
    return;
  }

  fetch(`${API_URL}/admin/funcionarios/${funcionarioId}`, {
    method: 'DELETE',
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      if (data.sucesso) {
        exibirMensagem('mensagemRegistroFunc', 'Funcionário deletado com sucesso', 'sucesso');
        carregarFuncionarios();
      } else {
        exibirMensagem('mensagemRegistroFunc', data.erro || 'Erro ao deletar funcionário', 'erro');
      }
    })
    .catch(err => {
      console.error('Erro:', err);
      exibirMensagem('mensagemRegistroFunc', 'Erro ao conectar com servidor', 'erro');
    });
}

function carregarVendasFuncionarios(filtro) {
  fetch(`${API_URL}/admin/vendas-funcionarios?filtro=${filtro}`, { credentials: 'include' })
    .then(response => response.json())
    .then(vendas => {
      const container = document.getElementById('tabelaVendasFuncionarios');
      
      if (!Array.isArray(vendas) || vendas.length === 0) {
        container.innerHTML = '<p>Nenhuma venda registrada neste período</p>';
        return;
      }

      let html = '<table style="width: 100%; border-collapse: collapse; text-align: center;">';
      html += '<thead><tr style="border-bottom: 2px solid #ddd; background: #f5f5f5;"><th style="padding: 12px; text-align: left;">Funcionário</th><th>Transações</th><th>Total Vendido</th><th>Dias Vendendo</th><th>Ticket Médio</th></tr></thead>';
      html += '<tbody>';

      vendas.forEach(v => {
        const ticketMedio = v.numero_vendas > 0 ? (v.total_vendido / v.numero_vendas).toFixed(2) : 0;
        html += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px; text-align: left; font-weight: bold;">${v.nome}</td>
            <td>${v.numero_vendas}</td>
            <td style="color: #27ae60; font-weight: bold;">R$ ${Number(v.total_vendido || 0).toFixed(2)}</td>
            <td>${v.dias_vendendo}</td>
            <td>R$ ${ticketMedio}</td>
          </tr>
        `;
      });

      html += '</tbody></table>';
      container.innerHTML = html;
    })
    .catch(err => {
      console.error('Erro:', err);
      document.getElementById('tabelaVendasFuncionarios').innerHTML = '<p>Erro ao carregar dados</p>';
    });
}

function carregarEstatisticas(filtro) {
  fetch(`${API_URL}/admin/estatisticas?filtro=${filtro}`, { credentials: 'include' })
    .then(response => response.json())
    .then(stats => {
      document.getElementById('statTotalVendas').textContent = `R$ ${Number(stats.totalVendas || 0).toFixed(2)}`;
      document.getElementById('statNumTransacoes').textContent = stats.numeroTransacoes;
      document.getElementById('statNumFuncionarios').textContent = stats.numeroFuncionarios;
      document.getElementById('statTicketMedio').textContent = `R$ ${Number(stats.ticketMedio || 0).toFixed(2)}`;

      // Atualizar botões ativos
      document.querySelectorAll('#adminStats button').forEach(btn => btn.classList.remove('ativo'));
      event.target.classList.add('ativo');
    })
    .catch(err => console.error('Erro ao carregar estatísticas:', err));
}

// ========== FUNÇÕES DE REGISTRO DE CREW MEMBER ==========

function registrarCrewMembro() {
  const nome = document.getElementById('nomeCrew').value.trim();
  const senha = document.getElementById('senhaCrew').value;
  const confirmarSenha = document.getElementById('confirmarSenhaCrew').value;

  // Validações
  if (!nome || !senha || !confirmarSenha) {
    exibirMensagem('mensagemRegistroCrew', 'Por favor preencha todos os campos', 'erro');
    return;
  }

  if (senha !== confirmarSenha) {
    exibirMensagem('mensagemRegistroCrew', 'As senhas não conferem', 'erro');
    return;
  }

  if (senha.length < 4) {
    exibirMensagem('mensagemRegistroCrew', 'A senha deve ter pelo menos 4 caracteres', 'erro');
    return;
  }

  // Enviar para servidor
  fetch(`${API_URL}/admin/registrar-funcionario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, senha }),
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      if (data.sucesso) {
        exibirMensagem('mensagemRegistroCrew', 'Crew member registrado com sucesso!', 'sucesso');
        document.getElementById('formRegistrarCrew').reset();
        carregarListaCrewRegistrados();
      } else {
        exibirMensagem('mensagemRegistroCrew', data.erro || 'Erro ao registrar crew member', 'erro');
      }
    })
    .catch(error => {
      console.error('Erro:', error);
      exibirMensagem('mensagemRegistroCrew', 'Erro ao conectar com servidor', 'erro');
    });
}

function carregarListaCrewRegistrados() {
  fetch(`${API_URL}/admin/funcionarios`, { credentials: 'include' })
    .then(response => response.json())
    .then(usuarios => {
      const container = document.getElementById('listaCrewRegistrados');
      
      if (!Array.isArray(usuarios) || usuarios.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">Nenhum crew member registrado ainda</p>';
        return;
      }

      const html = usuarios.map(u => `
        <div style="background: #f9f9f9; padding: 12px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${u.is_admin ? '#9b59b6' : '#3498db'};">
          <div>
            <p style="margin: 0; font-weight: bold;">${u.nome}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">${u.is_admin ? '👨‍💼 Administrador' : '👤 Crew Member'} • ${new Date(u.criado_em).toLocaleDateString('pt-BR')}</p>
          </div>
          ${!u.is_admin ? `<button class="btn btn-danger" onclick="deletarCrewMembro(${u.id}, '${u.nome}')">Remover</button>` : ''}
        </div>
      `).join('');
      
      container.innerHTML = html;
    })
    .catch(err => {
      console.error('Erro ao carregar crew members:', err);
      document.getElementById('listaCrewRegistrados').innerHTML = '<p style="color: #e74c3c;">Erro ao carregar crew members</p>';
    });
}

function deletarCrewMembro(usuarioId, nome) {
  if (!confirm(`Tem certeza que deseja remover ${nome}? Esta ação não pode ser desfeita.`)) {
    return;
  }

  fetch(`${API_URL}/admin/funcionarios/${usuarioId}`, {
    method: 'DELETE',
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      if (data.sucesso) {
        exibirMensagem('mensagemRegistroCrew', 'Crew member removido com sucesso', 'sucesso');
        carregarListaCrewRegistrados();
      } else {
        exibirMensagem('mensagemRegistroCrew', data.erro || 'Erro ao remover crew member', 'erro');
      }
    })
    .catch(err => {
      console.error('Erro:', err);
      exibirMensagem('mensagemRegistroCrew', 'Erro ao conectar com servidor', 'erro');
    });
}