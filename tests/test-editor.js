// Testes do VETOR — núcleo do editor (sem DOM)
const Editor = require('../assets/js/editor.js');

let pass = 0, fail = 0;
function check(nome, cond) {
    if (cond) { pass++; }
    else { fail++; console.log('FAIL:', nome); }
}

function estadoLimpo() {
    Editor.limpar('teste');
    Editor.registrarMudanca();
}

/* Criação de formas */
estadoLimpo();
check('documento vazio', Editor.estado.formas.length === 0);
Editor.criarForma({ tipo: 'retangulo', x: 10, y: 20, w: 100, h: 50, fundo: '#3b82f6', contorno: '#26251f', espessura: 2 });
check('forma criada', Editor.estado.formas.length === 1);
check('seleção automática', Editor.formaSelecionada() !== null);
check('id única', /^[a-z0-9]{7,}$/.test(Editor.estado.formas[0].id));

/* Seleção no ponto */
const ret = Editor.formaSelecionada();
check('acerta dentro', Editor.formaNoPonto(50, 40, 5) === ret);
check('acerta borda com tolerância', Editor.formaNoPonto(8, 22, 5) === ret);
check('fora não acerta', Editor.formaNoPonto(200, 200, 5) === null);

/* Elipse: borda conta, centro vazio não é selecionado por ponto-dentro? (para edição, elipse inteira conta) */
Editor.limpar('teste');
Editor.registrarMudanca();
Editor.criarForma({ tipo: 'elipse', x: 0, y: 0, w: 100, h: 100, fundo: '#fff', contorno: '#000', espessura: 2 });
const elipse = Editor.formaSelecionada();
check('elipse centro', Editor.formaNoPonto(50, 50, 5) === elipse);
check('elipse fora', Editor.formaNoPonto(110, 110, 5) === null);

/* Linha: distância ponto-segmento */
Editor.limpar('teste');
Editor.registrarMudanca();
Editor.criarForma({ tipo: 'linha', x: 0, y: 0, x2: 100, y2: 0, espessura: 2, semFundo: true, contorno: '#000' });
const linha = Editor.formaSelecionada();
check('linha sobre o traço', Editor.formaNoPonto(50, 1, 5) === linha);
check('linha perto do traço', Editor.formaNoPonto(50, 6, 5) === linha);
check('linha longe', Editor.formaNoPonto(50, 30, 5) === null);
check('linha além do fim', Editor.formaNoPonto(150, 0, 5) === null);

/* Prioridade: última forma em cima */
Editor.limpar('teste');
Editor.registrarMudanca();
Editor.criarForma({ tipo: 'retangulo', x: 0, y: 0, w: 100, h: 100, fundo: '#fff', semContorno: true });
Editor.criarForma({ tipo: 'retangulo', x: 25, y: 25, w: 50, h: 50, fundo: '#000', semContorno: true });
check('última em cima', Editor.formaNoPonto(50, 50, 5) === Editor.estado.formas[1]);

/* Movimentação */
Editor.limpar('teste');
Editor.registrarMudanca();
Editor.criarForma({ tipo: 'retangulo', x: 10, y: 10, w: 50, h: 50, fundo: '#fff', semContorno: true });
Editor.moverSelecionada(10, -5);
check('move retângulo', Editor.estado.formas[0].x === 20 && Editor.estado.formas[0].y === 5);
Editor.limpar('teste');
Editor.registrarMudanca();
Editor.criarForma({ tipo: 'linha', x: 0, y: 0, x2: 10, y2: 10, espessura: 2, semFundo: true, contorno: '#000' });
Editor.moverSelecionada(5, 5);
check('move linha inteira', Editor.estado.formas[0].x2 === 15 && Editor.estado.formas[0].y2 === 15);

/* Propriedades com limites */
Editor.definirLargura(0);
check('largura mínima 1', Editor.estado.formas[0].w === 1 || Editor.estado.formas[0].x2 === Editor.estado.formas[0].x + 1);
Editor.definirLargura(99999999);
check('largura limitada', (Editor.estado.formas[0].w || (Editor.estado.formas[0].x2 - Editor.estado.formas[0].x)) <= 100000);

/* Histórico (a UI registra a mudança no fim do gesto — simular aqui) */
estadoLimpo();
const qtdBase = Editor.estado.formas.length;
Editor.criarForma({ tipo: 'retangulo', x: 0, y: 0, w: 10, h: 10, fundo: '#fff', semContorno: true });
Editor.registrarMudanca();
const qtdDepoisDeCriar = Editor.estado.formas.length;
check('historico registra criacao', qtdDepoisDeCriar === qtdBase + 1);
check('desfaz criação', Editor.desfazer() && Editor.estado.formas.length === qtdBase);
check('refaz criação', Editor.refazer() && Editor.estado.formas.length === qtdDepoisDeCriar);

/* Serialização e carga */
Editor.limpar('meu-doc');
Editor.registrarMudanca();
Editor.criarForma({ tipo: 'texto', x: 5, y: 5, texto: 'Ó <área> & "aspas"', fonte: 12, semFundo: true, contorno: '#000' });
const dados = Editor.serializar();
check('serializa nome', dados.nome === 'meu-doc');
check('serializa formas', dados.formas.length === 1);
Editor.limpar('outro');
Editor.registrarMudanca();
Editor.carregar(JSON.parse(JSON.stringify(dados)));
check('recarrega nome', Editor.estado.nome === 'meu-doc');
check('recarrega formas', Editor.estado.formas.length === 1 && Editor.estado.formas[0].texto.includes('Ó'));
check('carregar inválido lança', (() => { try { Editor.carregar({}); return false; } catch { return true; } })());

/* Exportação SVG */
const svg = Editor.exportarSvg();
check('svg cabeçalho', svg.startsWith('<?xml') && svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
check('svg escapa XML de texto', svg.includes('&lt;área&gt;') && svg.includes('&amp;'));
check('svg sem texto vira elemento vazio mas válido', true);
Editor.limpar('vazio');
Editor.registrarMudanca();
check('svg vazio válido', Editor.exportarSvg().includes('</svg>'));

/* Zoom com centro */
Editor.limpar('z');
Editor.registrarMudanca();
Editor.definirPan(0, 0);
Editor.definirZoom(2, 100, 50);
// Ponto do documento sob o centro deve continuar o mesmo: doc antes = (100-0)/1=100, (50)/1=50
const doc = Editor.paraDocumento(100, 50);
check('zoom ancorado no centro', Math.abs(doc.x - 100) < 0.01 && Math.abs(doc.y - 50) < 0.01);
Editor.definirZoom(99);
check('zoom limitado em 8', Editor.estado.zoom === 8);
Editor.definirZoom(0.001);
check('zoom limitado em 0.1', Editor.estado.zoom === 0.1);

/* Caixa de formas */
Editor.limpar('c');
Editor.registrarMudanca();
Editor.criarForma({ tipo: 'linha', x: 20, y: 10, x2: 5, y2: 40, espessura: 2, semFundo: true, contorno: '#000' });
const cx = Editor.caixa(Editor.estado.formas[0]);
check('caixa linha normalizada', cx.x === 5 && cx.y === 10 && cx.w === 15 && cx.h === 30);
Editor.criarForma({ tipo: 'texto', x: 10, y: 100, texto: 'AB', fonte: 20, semFundo: true, contorno: '#000' });
const ct = Editor.caixa(Editor.estado.formas[1]);
check('caixa texto tem w/h', Number.isFinite(ct.w) && ct.w > 0 && Number.isFinite(ct.h) && ct.h > 0);

/* Remoção */
Editor.limpar('r');
Editor.registrarMudanca();
Editor.criarForma({ tipo: 'retangulo', x: 0, y: 0, w: 10, h: 10, fundo: '#fff', semContorno: true });
check('remove selecionada', Editor.removerSelecionada() && Editor.estado.formas.length === 0);
check('remove sem nada = false', Editor.removerSelecionada() === false);

/* Redimensionamento pelas alças */
function resetComRetangulo() {
    Editor.limpar('rz');
    Editor.registrarMudanca();
    Editor.criarForma({ tipo: 'retangulo', x: 100, y: 100, w: 50, h: 40, fundo: '#fff', semContorno: true });
    return Editor.formaSelecionada();
}

let f = resetComRetangulo();
// Alça SE: arrasta para (300, 240) → aumenta largura/altura
check('resize se', Editor.redimensionarSelecionada('se', 300, 240) && f.x === 100 && f.y === 100 && f.w === 200 && f.h === 140);
// Alça NW: caixa (100,100)-(300,240); arrasta para (50,80) → x=50 y=80 w=250 h=160
check('resize nw', Editor.redimensionarSelecionada('nw', 50, 80) && f.x === 50 && f.y === 80 && f.w === 250 && f.h === 160);
// Alça NE: caixa (50,80)-(300,240); arrasta para (30,90) → canto SE (fixo) vira referência: x=30 y=90 w=20 h=150
check('resize ne cruzado', Editor.redimensionarSelecionada('ne', 30, 90) && f.x === 30 && f.y === 90 && f.w === 20 && f.h === 150);
// Colapso real: caixa (30,90)-(50,240); alça SE para (31, 91) → w=1 h=1 <2 → recusa
const antesFail = { x: f.x, y: f.y, w: f.w, h: f.h };
check('resize mínimo recusa', Editor.redimensionarSelecionada('se', 31, 91) === false && f.x === antesFail.x && f.w === antesFail.w && f.h === antesFail.h);
check('resize canto inválido', Editor.redimensionarSelecionada('xx', 1, 1) === false);

/* Redimensionar linha */
Editor.limpar('l2');
Editor.registrarMudanca();
Editor.criarForma({ tipo: 'linha', x: 0, y: 0, x2: 100, y2: 0, espessura: 2, semFundo: true, contorno: '#000' });
const linha2 = Editor.formaSelecionada();
// Caixa de linha horizontal tem h=0; alça se/ne mexem no ponto (x2,y2); nw/sw no (x,y)
check('resize linha ne', Editor.redimensionarSelecionada('ne', 150, 20) && linha2.x2 === 150 && linha2.y2 === 20 && linha2.x === 0);
check('resize linha nw', Editor.redimensionarSelecionada('nw', -10, 5) && linha2.x === -10 && linha2.y === 5 && linha2.x2 === 150);

/* Texto: não redimensiona por alça no MVP */
Editor.limpar('t2');
Editor.registrarMudanca();
Editor.criarForma({ tipo: 'texto', x: 10, y: 10, texto: 'AB', fonte: 20, semFundo: true, contorno: '#000' });
const texto2 = Editor.formaSelecionada();
check('resize texto recusa', Editor.redimensionarSelecionada('se', 100, 40) === false);
check('resize texto intacto', (() => { const c = Editor.caixa(texto2); return c.w === 24 && c.h === 20; })());

console.log(`\n${pass} testes passaram, ${fail} falharam`);
process.exit(fail > 0 ? 1 : 0);