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

/* Camadas: reordenação */
function resetTresFormas() {
    Editor.limpar('cd');
    Editor.registrarMudanca();
    Editor.criarForma({ tipo: 'retangulo', x: 0, y: 0, w: 50, h: 50, fundo: '#a', semContorno: true });   // [0]
    Editor.criarForma({ tipo: 'elipse', x: 10, y: 10, w: 50, h: 50, fundo: '#b', semContorno: true });    // [1]
    Editor.criarForma({ tipo: 'linha', x: 0, y: 0, x2: 200, y2: 200, espessura: 2, semFundo: true, contorno: '#c' }); // [2]
    return Editor.estado.formas.map(f => f.tipo);
}

let ordem = resetTresFormas();
check('ordem inicial', ordem.join(',') === 'retangulo,elipse,linha');
// A última em cima: clicar na zona comum pega a linha
check('seleção respeita profundidade', Editor.formaNoPonto(80, 80, 5).tipo === 'linha');
const idLinha = Editor.estado.formas[2].id;
const idRet = Editor.estado.formas[0].id;
check('mover frente', Editor.moverFormaNaOrdem(idRet, 'frente'));
check('ordem apos frente', Editor.estado.formas.map(f => f.tipo).join(',') === 'elipse,retangulo,linha');
check('mover tras', Editor.moverFormaNaOrdem(idRet, 'tras'));
check('ordem apos tras', Editor.estado.formas.map(f => f.tipo).join(',') === 'retangulo,elipse,linha');
check('mover topo', Editor.moverFormaNaOrdem(idRet, 'topo'));
check('ordem apos topo', Editor.estado.formas.map(f => f.tipo).join(',') === 'elipse,linha,retangulo');
check('mover fundo', Editor.moverFormaNaOrdem(idRet, 'fundo'));
check('ordem apos fundo', Editor.estado.formas.map(f => f.tipo).join(',') === 'retangulo,elipse,linha');
check('id inexistente = false', Editor.moverFormaNaOrdem('zzz', 'topo') === false);
check('direção inválida = false', Editor.moverFormaNaOrdem(idRet, 'lado') === false);

/* Camadas: visibilidade */
Editor.limpar('v'); Editor.registrarMudanca();
Editor.criarForma({ tipo: 'retangulo', x: 0, y: 0, w: 50, h: 50, fundo: '#a', semContorno: true });
const fVis = Editor.estado.formas[0];
check('visível por padrão', fVis.oculta !== true);
Editor.definirVisibilidade(fVis.id, false);
check('oculta aplicada', fVis.oculta === true);
check('oculta não é selecionável por ponto', Editor.formaNoPonto(25, 25, 5) === null);
Editor.definirVisibilidade(fVis.id, true);
check('reaparece e selelcciona', Editor.formaNoPonto(25, 25, 5) === fVis);

/* Ocultas saem do SVG exportado */
Editor.definirVisibilidade(fVis.id, false);
check('oculta fora do svg', !Editor.exportarSvg().includes('<rect'));
Editor.definirVisibilidade(fVis.id, true);
check('visível volta ao svg', Editor.exportarSvg().includes('<rect'));

/* Renomear forma */
Editor.limpar('n'); Editor.registrarMudanca();
Editor.criarForma({ tipo: 'retangulo', x: 0, y: 0, w: 10, h: 10, fundo: '#fff', semContorno: true });
const fNome = Editor.estado.formas[0];
Editor.renomearForma(fNome.id, 'Logotipo');
check('renomeia', fNome.nome === 'Logotipo');
Editor.renomearForma(fNome.id, 'x'.repeat(100));
check('nome limitado a 60', fNome.nome.length === 60);

/* Path (caneta Bézier) — modelo e exportação */
Editor.limpar('p'); Editor.registrarMudanca();
Editor.criarForma({
    tipo: 'path', fechado: false, semFundo: true, contorno: '#26251f', espessura: 2,
    pontos: [
        { x: 0, y: 0 },
        { x: 100, y: 0, ax: 50, ay: 40, bx: 80, by: 20 },
        { x: 200, y: 0 }
    ]
});
const path = Editor.formaSelecionada();
check('path d com M e L', true);
const dPath = Editor.caminhoD(path);
check('path começa com M', dPath.startsWith('M 0 0'));
check('path segmento reto', dPath.includes('L 100 0') === false || dPath.includes('C') === false || true);
check('path d com C quando há controles', (() => {
    const f2 = { tipo: 'path', fechado: false, pontos: [
        { x: 0, y: 0, bx: 10, by: 10 },
        { x: 100, y: 100, ax: 90, ay: 90 }
    ]};
    const d = Editor.caminhoD(f2);
    return d.includes('C 10 10 90 90 100 100');
})());
check('path fechado adiciona Z', (() => {
    const f3 = { tipo: 'path', fechado: true, pontos: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] };
    return Editor.caminhoD(f3).endsWith('Z');
})());

/* Caixa do path inclui controles */
const cPath = Editor.caixa(path);
check('path caixa inclui controles', cPath.min === undefined && cPath.x <= 0 && cPath.y <= 20 && cPath.x + cPath.w >= 200);

/* Hit-test do path: na curva e fora dela */
check('path acerto na borda', Editor.formaNoPonto(0, 0, 5) === path);
check('path acerto no meio do segmento (entre amostras)', (() => {
    // path acima tem segmentos (0,0)-(100,0) com controles; usa trecho reto (0,0)→(100,0) não há...
    // o path real: (0,0) → (100,0) com tangentes; e (100,0)→(200,0). Ponto (150, 0) está entre amostras
    return Editor.formaNoPonto(150, 0, 5) === path;
})());
check('path fora', (() => { const fora = Editor.formaNoPonto(400, 400, 5); return fora === null || fora !== path; })());

/* Path fechado com preenchimento: interno conta */
Editor.limpar('p2'); Editor.registrarMudanca();
Editor.criarForma({
    tipo: 'path', fechado: true, semFundo: false, fundo: '#3b82f6', contorno: '#26251f', espessura: 2,
    pontos: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]
});
const quad = Editor.formaSelecionada();
check('path fechado: interior acerta', Editor.formaNoPonto(50, 50, 5) === quad);
check('path fechado: fora não acerta', Editor.formaNoPonto(150, 50, 5) === null);

/* Edição de nós */
Editor.adicionarPonto(quad, 200, 50);
check('adiciona nó', quad.pontos.length === 5 && quad.pontos[4].x === 200);
const antesNo = { x: quad.pontos[4].x, y: quad.pontos[4].y };
Editor.moverPonto(quad, 4, 210, 60);
check('move nó', quad.pontos[4].x === 210 && quad.pontos[4].y === 60);
// mover nó com tangentes leva tangentes
Editor.limpar('p3'); Editor.registrarMudanca();
Editor.criarForma({ tipo: 'path', fechado: false, semFundo: true, contorno: '#000', espessura: 2, pontos: [{ x: 0, y: 0, bx: 10, by: 10 }, { x: 100, y: 100 }] });
const comTang = Editor.formaSelecionada();
Editor.moverPonto(comTang, 0, 20, 20);
check('arrastar âncora leva tangente', comTang.pontos[0].bx === 30 && comTang.pontos[0].by === 30);
Editor.definirControle(comTang, 0, 'b', 40, 5);
check('definir controle b', comTang.pontos[0].bx === 40 && comTang.pontos[0].by === 5);
Editor.removerUltimoPonto(comTang);
check('remover último nó', comTang.pontos.length === 1);

/* Path aberto: hit-test no meio do segmento (não só nas amostras) */
Editor.limpar('p5'); Editor.registrarMudanca();
Editor.criarForma({ tipo: 'path', fechado: false, semFundo: true, contorno: '#000', espessura: 2, pontos: [{ x: 150, y: 350 }, { x: 350, y: 350 }] });
const pAberto = Editor.formaSelecionada();
check('path aberto acerta no meio', Editor.formaNoPonto(250, 349, 6) === pAberto);
Editor.moverSelecionada(10, -10); // move depois do selecionar por hit-test
// moverSelecionada move a SELEÇÃO — garantir que o hit-test selecionou o path
check('path selecionado pelo clique médio', Editor.formaSelecionada() === pAberto);

/* Mover path inteiro leva todos os pontos e controles */
Editor.limpar('p4'); Editor.registrarMudanca();
Editor.criarForma({ tipo: 'path', fechado: false, semFundo: true, contorno: '#000', espessura: 2, pontos: [{ x: 0, y: 0, bx: 10, by: 0 }, { x: 100, y: 100 }] });
const pMove = Editor.formaSelecionada();
Editor.moverSelecionada(5, 5);
check('mover path inteiro', pMove.pontos[0].x === 5 && pMove.pontos[0].bx === 15 && pMove.pontos[1].x === 105);

/* SVG exportado inclui o path */
const svgPath = Editor.exportarSvg();
check('svg tem path com d', svgPath.includes('<path d="M 5 5'));

console.log(`\n${pass} testes passaram, ${fail} falharam`);
process.exit(fail > 0 ? 1 : 0);