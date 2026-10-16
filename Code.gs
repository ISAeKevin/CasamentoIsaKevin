/**
 * Confirmação de presença -> Google Planilha
 * 1. Crie uma planilha no Google Sheets.
 * 2. Extensões > Apps Script. Apague o conteúdo e cole este arquivo.
 * 3. Implantar > Nova implantação > Tipo: App da Web
 *    Executar como: Eu | Quem pode acessar: Qualquer pessoa
 * 4. Copie a URL gerada (termina em /exec) para rsvpEndpoint em config.js.
 *
 * Painel de confirmações (painel.html):
 * 5. No Apps Script: Configurações do projeto (engrenagem) > Propriedades do script >
 *    Adicionar propriedade. Nome: CHAVE_PAINEL | Valor: uma senha longa só de vocês.
 *    A senha NUNCA deve ser escrita neste arquivo, porque ele fica público no GitHub.
 * 6. Sempre que alterar este código: Implantar > Gerenciar implantações > lápis >
 *    Versão: Nova versão > Implantar. Assim a URL /exec continua a mesma.
 */
var ABA = "Confirmações";
var COLUNAS = ["Data/hora", "Nome", "Vai?", "Adultos", "Crianças", "Acompanhantes", "E-mail", "Telefone", "Observações"];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var p = e.parameter || {};
    if (p.site) return resposta({ ok: false }); // robô caiu na armadilha
    var aba = obterAba();
    aba.appendRow([
      new Date(),
      limpar(p.nome),
      p.vai === "sim" ? "Sim" : "Não",
      Number(p.adultos || 0),
      Number(p.criancas || 0),
      limpar(p.acompanhantes),
      limpar(p.email),
      limpar(p.telefone),
      limpar(p.obs)
    ]);
    return resposta({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Leitura para o painel: só responde com a chave correta
function doGet(e) {
  var p = (e && e.parameter) || {};
  var chave = PropertiesService.getScriptProperties().getProperty("CHAVE_PAINEL");
  if (!chave) return resposta({ ok: false, erro: "sem_chave" });
  if (!p.chave || p.chave !== chave) {
    Utilities.sleep(800); // atrasa tentativas de adivinhar a senha
    return resposta({ ok: false, erro: "chave_invalida" });
  }
  var valores = obterAba().getDataRange().getValues();
  var linhas = valores.slice(1).filter(function (l) { return l[1] !== ""; }).map(function (l) {
    return {
      data: l[0] instanceof Date ? l[0].toISOString() : String(l[0]),
      nome: String(l[1]),
      vai: l[2] === "Sim",
      adultos: Number(l[3]) || 0,
      criancas: Number(l[4]) || 0,
      acompanhantes: String(l[5]),
      email: String(l[6]),
      telefone: String(l[7]),
      obs: String(l[8])
    };
  });
  return resposta({ ok: true, linhas: linhas, atualizado: new Date().toISOString() });
}

function obterAba() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(ABA) || ss.insertSheet(ABA);
  if (aba.getLastRow() === 0) {
    aba.appendRow(COLUNAS);
    aba.setFrozenRows(1);
  }
  return aba;
}

// Evita que um texto começando com "=" vire fórmula na planilha
function limpar(v) {
  v = String(v || "").slice(0, 500);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
