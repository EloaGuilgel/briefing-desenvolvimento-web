// =========================================================
// BRIEFING — recebimento das respostas no Google Sheets
// ---------------------------------------------------------
// Copie este arquivo inteiro para o editor do Google Apps Script
// (script.google.com) e publique como App da Web.
// Este arquivo NÃO é carregado pelo site; ele fica no projeto
// apenas como referência.
// =========================================================

// ID da planilha: é o trecho entre /d/ e /edit no endereço dela.
// Ex.: https://docs.google.com/spreadsheets/d/ESTE_TRECHO_AQUI/edit
const PLANILHA_ID = 'COLE_AQUI_O_ID_DA_PLANILHA';

// Nome da aba onde as respostas serão registradas (é criada se não existir)
const ABA = 'Respostas';

// Colunas da planilha, na mesma ordem das perguntas do formulário.
// Os nomes são os atributos name="..." dos campos do index.html.
const CAMPOS = [
  // Etapa 1 — Sobre você
  'nome', 'empresa', 'telefone', 'email',
  // Etapa 2 — Objetivos do projeto
  'objetivo', 'objetivo_outro', 'publico', 'diferenciais', 'mensagem_principal',
  // Etapa 3 — Design e direção visual
  'cores', 'cores_outras', 'estilo_visual', 'estilo_outro', 'referencias', 'preferencias_visuais',
  // Etapa 4 — Conteúdo e textos
  'textos_prontos', 'textos_fornecimento', 'paginas', 'paginas_outra', 'informacoes_institucionais',
  'tom_apresentacao', 'informacoes_obrigatorias', 'informacoes_restritas',
  // Etapa 5 — Imagens e vídeos
  'fotografias', 'tipos_imagens', 'quantidade_fotos', 'videos', 'videos_disponiveis', 'autorizacao_imagens',
  // Etapa 6 — Sustentabilidade, qualidade e responsabilidade social
  'sustentabilidade', 'iniciativas', 'iniciativas_outras', 'documentos_iniciativas',
  'apresentacao_iniciativas', 'destaque_iniciativas',
  // Etapa 7 — Materiais disponíveis
  'materiais', 'local_materiais', 'responsavel_materiais',
  // Etapa 8 — Domínio e hospedagem
  'dominio', 'dominio_endereco', 'hospedagem', 'hospedagem_empresa', 'acessos',
];

// Campo invisível anti-robô (honeypot). Pessoas não o veem; se vier
// preenchido, o envio é recusado.
const CAMPO_HONEYPOT = 'hp_site';

// Limites de tamanho
const MAX_ENVIO = 100000;  // caracteres do envio inteiro
const MAX_CAMPO = 10000;   // caracteres por resposta (o excedente é cortado)

// ---------- Recebe o envio do formulário ----------
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const bruto = e && e.postData ? e.postData.contents : '';
    if (!bruto) return resposta(false, 'Envio vazio.');
    if (bruto.length > MAX_ENVIO) return resposta(false, 'Envio muito grande.');

    let dados;
    try {
      dados = JSON.parse(bruto);
    } catch (err) {
      return resposta(false, 'Formato inválido.');
    }
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
      return resposta(false, 'Formato inválido.');
    }

    if (texto(dados[CAMPO_HONEYPOT]) !== '') return resposta(false, 'Envio recusado.');

    const nome = texto(dados.nome).trim();
    const email = texto(dados.email).trim();
    if (!nome) return resposta(false, 'O nome é obrigatório.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return resposta(false, 'O e-mail é inválido.');

    const linha = [new Date()].concat(CAMPOS.map(campo => celula(dados[campo])));

    // Evita que dois envios simultâneos escrevam na mesma linha
    lock.waitLock(10000);
    abaRespostas().appendRow(linha);

    return resposta(true);
  } catch (err) {
    console.error(err);
    return resposta(false, 'Erro ao registrar as respostas.');
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// Abrir a URL do Web App no navegador mostra que ele está no ar
function doGet() {
  return resposta(true);
}

// ---------- Auxiliares ----------

// Converte qualquer valor recebido em texto
function texto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor);
}

// Prepara o valor para uma célula da planilha
function celula(valor) {
  // Múltipla escolha chega como lista: vira "opção 1; opção 2"
  // (ponto e vírgula porque algumas opções já contêm vírgulas)
  let v = Array.isArray(valor) ? valor.map(texto).join('; ') : texto(valor);

  if (v.length > MAX_CAMPO) v = v.slice(0, MAX_CAMPO) + ' […]';

  // Impede que o Sheets interprete a resposta como fórmula
  if (/^[=+\-@]/.test(v)) v = "'" + v;

  return v;
}

// Abre a aba de respostas, criando-a com o cabeçalho na primeira vez
function abaRespostas() {
  const planilha = SpreadsheetApp.openById(PLANILHA_ID);
  let aba = planilha.getSheetByName(ABA);
  if (!aba) aba = planilha.insertSheet(ABA);
  if (aba.getLastRow() === 0) {
    aba.appendRow(['data_hora'].concat(CAMPOS));
    aba.setFrozenRows(1);
    aba.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm:ss');
  }
  return aba;
}

// Resposta JSON lida pelo site
function resposta(ok, erro) {
  const corpo = ok ? { ok: true } : { ok: false, error: erro };
  return ContentService
    .createTextOutput(JSON.stringify(corpo))
    .setMimeType(ContentService.MimeType.JSON);
}
