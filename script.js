/**
 * Preços da página de planos.
 *
 * REGRA: o preço mora no backend, não aqui. Esta página só lê `GET /planos`
 * e escreve na tela. Mudar de R$ 99,90 pra R$ 89,90 é mexer numa linha lá no
 * servidor — e tanto o app quanto a landing passam a mostrar o novo valor,
 * sem editar HTML e sem esperar revisão de loja.
 *
 * POR QUE TEM RESERVA ESCRITA NO HTML:
 *  - O Render plano free DORME. Quem abrir a landing pode esperar 30s de
 *    resposta, ou o fetch falhar direto.
 *  - A landing fica no GitHub Pages, que é outro domínio. Se o CORS um dia
 *    mudar, a página quebra.
 * Em qualquer um desses casos a pessoa vê o preço que já está no HTML, que é
 * o preço correto — e não uma tela vazia ou "R$ --".
 *
 * Errar pra um lado assim é de propósito: preço velho em tela converte
 * melhor que preço ausente. O custo é ter dois lugares, e é pago de propósito
 * com este comentário.
 */

const API = "https://controlfin-m54z.onrender.com";

const brl = (centavos) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const textoMeios = (meios) => {
  const nomes = meios.map((m) => (m === "pix" ? "Pix" : m === "cartao" ? "cartão" : m));
  if (nomes.length <= 1) return `Paga em ${nomes[0]}`;
  return `Paga em ${nomes.slice(0, -1).join(", ")} ou ${nomes[nomes.length - 1]}`;
};

async function carregarPlanos() {
  let dados;
  try {
    const resp = await fetch(`${API}/planos`, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return;
    dados = await resp.json();
  } catch {
    // Render dormindo ou sem internet. O preço escrito no HTML já está aí.
    return;
  }

  if (!dados || !Array.isArray(dados.planos)) return;

  const mensal = dados.planos.find((p) => p.id === "mensal");
  const anual = dados.planos.find((p) => p.id === "anual");

  // Nome, descrição, preço e forma de pagamento vêm do servidor — inclusive
  // porque é ele que sabe se o anual aceita Pix.
  for (const plano of dados.planos) {
    const nome = document.getElementById(`nome-${plano.id}`);
    const preco = document.getElementById(`preco-${plano.id}`);
    const desc = document.getElementById(`desc-${plano.id}`);
    const meios = document.getElementById(`meios-${plano.id}`);

    if (nome) nome.textContent = plano.nome;
    if (preco) preco.textContent = brl(plano.precoCentavos);
    if (desc) desc.textContent = plano.descricao;
    if (meios) meios.textContent = textoMeios(plano.meios);
  }

  // Quanto o anual economiza, calculado a partir do preço REAL de cada plano.
  // Se o dono mudar qualquer um dos dois, este número se ajusta sozinho —
  // um "economize R$ 30" que não bate com os preços ao lado derruba a
  // confiança mais rápido do que qualquer outra coisa na página.
  const economiaEl = document.getElementById("economia");
  if (economiaEl && mensal && anual) {
    const guarda = mensal.precoCentavos * 12 - anual.precoCentavos;
    economiaEl.textContent = guarda > 0 ? `Economiza ${brl(guarda)} por ano` : "";
  }

  // As features do Premium vêm do registry do mesmo jeito que o app busca.
  const lista = document.getElementById("lista-premium");
  const premium = (dados.features || []).filter((f) => f.premium);
  if (lista && premium.length > 0) {
    lista.innerHTML = "";
    for (const f of premium) {
      const li = document.createElement("li");
      li.textContent = f.nome;
      lista.appendChild(li);
    }
  }

  // "5 categorias grátis" também é número do servidor, não texto daqui.
  const gratisCat = document.getElementById("gratis-categorias");
  if (gratisCat && typeof dados.limiteCategoriasGratis === "number") {
    gratisCat.textContent = `Até ${dados.limiteCategoriasGratis} categorias`;
  }
}

carregarPlanos();
