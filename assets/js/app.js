/* VETOR — interface: renderização, eventos, painel de propriedades e arquivos */
'use strict';

(() => {
    const $ = sel => document.querySelector(sel);
    const $$ = sel => [...document.querySelectorAll(sel)];

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const mesa = $('#mesa');
    const tela = $('#tela');
    const gConteudo = $('#conteudo');
    const gOverlay = $('#overlay');
    const TOLERANCIA = 6;

    /* ---------- Toast ---------- */
    let toastTimer;
    function toast(msg) {
        const el = $('#toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
    }

    /* ---------- Renderização ---------- */
    function atributosElemento(f) {
        const el = criarLayout(f);
        const cores = estiloDe(f);
        if (f.tipo === 'texto') {
            el.setAttribute('fill', cores.fill);
        } else if (f.tipo === 'linha') {
            el.setAttribute('stroke', cores.stroke);
            el.setAttribute('stroke-width', f.espessura || 2);
            el.setAttribute('stroke-linecap', 'round');
        } else {
            el.setAttribute('fill', cores.fill);
            if (!f.semContorno) {
                el.setAttribute('stroke', cores.stroke);
                el.setAttribute('stroke-width', f.espessura || 2);
            }
        }
        return el;
    }

    function criarLayout(f) {
        if (f.tipo === 'retangulo') {
            const el = document.createElementNS(SVG_NS, 'rect');
            el.setAttribute('x', f.x); el.setAttribute('y', f.y);
            el.setAttribute('width', f.w); el.setAttribute('height', f.h);
            return el;
        }
        if (f.tipo === 'elipse') {
            const el = document.createElementNS(SVG_NS, 'ellipse');
            el.setAttribute('cx', f.x + f.w / 2); el.setAttribute('cy', f.y + f.h / 2);
            el.setAttribute('rx', Math.max(0.5, f.w / 2)); el.setAttribute('ry', Math.max(0.5, f.h / 2));
            return el;
        }
        if (f.tipo === 'linha') {
            const el = document.createElementNS(SVG_NS, 'line');
            el.setAttribute('x1', f.x); el.setAttribute('y1', f.y);
            el.setAttribute('x2', f.x2); el.setAttribute('y2', f.y2);
            return el;
        }
        if (f.tipo === 'path') {
            const el = document.createElementNS(SVG_NS, 'path');
            el.setAttribute('d', Editor.caminhoD(f));
            if (f.fechado) el.setAttribute('fill-rule', 'evenodd');
            return el;
        }
        // texto
        const el = document.createElementNS(SVG_NS, 'text');
        el.setAttribute('x', f.x); el.setAttribute('y', f.y);
        el.setAttribute('font-size', f.fonte || 24);
        el.setAttribute('font-family', 'Inter, sans-serif');
        el.textContent = f.texto || '';
        return el;
    }

    function estiloDe(f) {
        if (f.tipo === 'linha') {
            return { fill: 'none', stroke: f.semContorno ? (f.fundo || '#3b82f6') : (f.contorno || '#26251f') };
        }
        return {
            fill: f.semFundo ? 'none' : (f.fundo || '#3b82f6'),
            stroke: f.semContorno ? 'none' : (f.contorno || '#26251f')
        };
    }

    function renderizar() {
        const { zoom, panX, panY } = Editor.estado;
        mesa.setAttribute('viewBox', `${-panX / zoom} ${-panY / zoom} ${tela.clientWidth / zoom} ${tela.clientHeight / zoom}`);

        // Sincroniza DOM com o modelo (formas novas/removidas/reordenadas)
        const filhos = [...gConteudo.children];
        const ids = new Set(Editor.estado.formas.map(f => f.id));
        filhos.forEach(el => { if (!ids.has(el.dataset.id)) el.remove(); });
        Editor.estado.formas.forEach((f, indice) => {
            let el = gConteudo.querySelector(`[data-id="${f.id}"]`);
            if (!el) {
                el = atributosElemento(f);
                el.dataset.id = f.id;
                gConteudo.appendChild(el);
            }
            // Atualiza geometria e estilo
            const novo = criarLayout(f);
            for (const attr of ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry', 'width', 'height', 'font-size', 'd', 'fill-rule']) {
                if (novo.hasAttribute(attr)) el.setAttribute(attr, novo.getAttribute(attr));
            }
            if (f.tipo === 'texto') el.textContent = f.texto || '';
            const cores = estiloDe(f);
            if (f.tipo === 'texto') el.setAttribute('fill', cores.stroke);
            else if (f.tipo === 'linha') { el.setAttribute('stroke', cores.stroke); el.setAttribute('stroke-width', f.espessura || 2); }
            else if (f.tipo === 'path') {
                el.setAttribute('fill', cores.fill);
                if (f.semContorno) { el.removeAttribute('stroke'); el.removeAttribute('stroke-width'); }
                else { el.setAttribute('stroke', cores.stroke); el.setAttribute('stroke-width', f.espessura || 2); }
            }
            else {
                el.setAttribute('fill', cores.fill);
                if (f.semContorno) { el.removeAttribute('stroke'); el.removeAttribute('stroke-width'); }
                else { el.setAttribute('stroke', cores.stroke); el.setAttribute('stroke-width', f.espessura || 2); }
            }
            // Ordem
            if (gConteudo.children[indice] !== el) gConteudo.insertBefore(el, gConteudo.children[indice] || null);
        });

        renderizarOverlay();
        atualizarStatus();
    }

    function desenharTangente(ax, ay, cx, cy) {
        const zoomInv = 1 / Editor.estado.zoom;
        const linha = document.createElementNS(SVG_NS, 'line');
        linha.setAttribute('x1', ax); linha.setAttribute('y1', ay);
        linha.setAttribute('x2', cx); linha.setAttribute('y2', cy);
        linha.setAttribute('stroke', '#b9a8f8');
        linha.setAttribute('stroke-width', 1 * zoomInv);
        gOverlay.appendChild(linha);
        const tamanho = 5 * zoomInv;
        const bolinha = document.createElementNS(SVG_NS, 'circle');
        bolinha.setAttribute('cx', cx); bolinha.setAttribute('cy', cy);
        bolinha.setAttribute('r', tamanho / 2);
        bolinha.setAttribute('fill', '#8a6ef0');
        gOverlay.appendChild(bolinha);
    }

    function renderizarOverlay() {
        gOverlay.replaceChildren();
        const zoomInv = 1 / Editor.estado.zoom;
        const f = Editor.formaSelecionada();

        // Preview da caneta: traçado em curso + nós + tangentes
        if (caneta.forma) {
            const pontos = caneta.forma.pontos;
            if (pontos.length) {
                const dPreview = Editor.caminhoD({ tipo: 'path', fechado: false, pontos });
                const preview = document.createElementNS(SVG_NS, 'path');
                preview.setAttribute('d', dPreview);
                preview.setAttribute('fill', 'none');
                preview.setAttribute('stroke', '#8a6ef0');
                preview.setAttribute('stroke-width', 2 * zoomInv);
                gOverlay.appendChild(preview);
                const tamanho = 7 * zoomInv;
                pontos.forEach((p, i) => {
                    const no = document.createElementNS(SVG_NS, 'rect');
                    no.setAttribute('x', p.x - tamanho / 2);
                    no.setAttribute('y', p.y - tamanho / 2);
                    no.setAttribute('width', tamanho);
                    no.setAttribute('height', tamanho);
                    no.setAttribute('fill', i === 0 ? '#e8422d' : '#fff');
                    no.setAttribute('stroke', '#8a6ef0');
                    no.setAttribute('stroke-width', 1.5 * zoomInv);
                    gOverlay.appendChild(no);
                    if (p.ax !== undefined) desenharTangente(p.x, p.y, p.ax, p.ay);
                    if (p.bx !== undefined) desenharTangente(p.x, p.y, p.bx, p.by);
                });
            }
            return; // enquanto traça, o overlay de seleção fica de fora
        }

        if (!f) return;
        const c = Editor.caixa(f);
        const margem = (f.espessura || 0) / 2;
        const ret = document.createElementNS(SVG_NS, 'rect');
        ret.setAttribute('x', c.x - margem);
        ret.setAttribute('y', c.y - margem);
        ret.setAttribute('width', Math.max(c.w, 1) + margem * 2);
        ret.setAttribute('height', Math.max(c.h, 1) + margem * 2);
        ret.setAttribute('fill', 'none');
        ret.setAttribute('stroke', '#2f7cf6');
        ret.setAttribute('stroke-width', 1.5 * zoomInv);
        ret.setAttribute('stroke-dasharray', `${5 * zoomInv} ${3 * zoomInv}`);
        ret.setAttribute('pointer-events', 'none');
        gOverlay.appendChild(ret);
        // Alças de canto (interativas no modo selecionar)
        const tamanho = 9 * zoomInv;
        const podeRedimensionar = f.tipo !== 'texto' && Editor.estado.ferramenta === 'selecionar';
        [[c.x - margem, c.y - margem, 'nw'], [c.x + c.w + margem, c.y - margem, 'ne'],
         [c.x - margem, c.y + c.h + margem, 'sw'], [c.x + c.w + margem, c.y + c.h + margem, 'se']].forEach(([x, y, canto]) => {
            const h = document.createElementNS(SVG_NS, 'rect');
            h.setAttribute('x', x - tamanho / 2);
            h.setAttribute('y', y - tamanho / 2);
            h.setAttribute('width', tamanho);
            h.setAttribute('height', tamanho);
            h.setAttribute('fill', '#fff');
            h.setAttribute('stroke', '#2f7cf6');
            h.setAttribute('stroke-width', 1.5 * zoomInv);
            h.dataset.canto = canto;
            h.style.cursor = podeRedimensionar ? (canto === 'nw' || canto === 'se' ? 'nwse-resize' : 'nesw-resize') : 'default';
            gOverlay.appendChild(h);
        });
    }

    function atualizarStatus() {
        const { zoom, formas, selecao } = Editor.estado;
        $('#st_zoom').textContent = Math.round(zoom * 100) + '%';
        $('#st_formas').textContent = formas.length + (formas.length === 1 ? ' forma' : ' formas');
    }

    function sincronizarViewbox() {
        const { zoom, panX, panY } = Editor.estado;
        mesa.setAttribute('viewBox', `${-panX / zoom} ${-panY / zoom} ${tela.clientWidth / zoom} ${tela.clientHeight / zoom}`);
    }

    /* ---------- Painel ---------- */
    function atualizarPainel() {
        const f = Editor.formaSelecionada();
        const grupos = ['#grp_posicao', '#grp_texto'];
        if (!f) {
            grupos.forEach(s => $(s).style.visibility = 'hidden');
            $('#painel_vazio').style.display = 'block';
            return;
        }
        $('#painel_vazio').style.display = 'none';
        grupos.forEach(s => $(s).style.visibility = 'visible');
        $('#grp_texto').hidden = f.tipo !== 'texto';
        const c = Editor.caixa(f);
        $('#prop_x').value = Math.round((f.tipo === 'linha' ? Math.min(f.x, f.x2) : f.x) * 10) / 10;
        $('#prop_y').value = Math.round((f.tipo === 'linha' ? Math.min(f.y, f.y2) : f.y) * 10) / 10;
        $('#prop_l').value = Math.round(Math.max(1, c.w) * 10) / 10;
        $('#prop_a').value = Math.round(Math.max(1, c.h) * 10) / 10;
        $('#prop_fundo').value = normalizarHex(f.tipo === 'linha' ? (f.fundo || '#3b82f6') : (f.fundo || '#3b82f6'));
        $('#prop_sem_fundo').checked = !!f.semFundo;
        $('#prop_contorno').value = normalizarHex(f.contorno || '#26251f');
        $('#prop_sem_contorno').checked = !!f.semContorno;
        $('#prop_espessura').value = f.espessura || 2;
        if (f.tipo === 'texto') {
            $('#prop_texto').value = f.texto || '';
            $('#prop_fonte').value = f.fonte || 24;
        }
    }

    function normalizarHex(cor) {
        const corLimpa = String(cor || '');
        if (/^#[0-9a-f]{6}$/i.test(corLimpa)) return corLimpa.toLowerCase();
        return corLimpa;
    }

    /* ---------- Ferramentas ---------- */
    const acao = {
        ponteiroInicial: null,
        panInicial: null,
        formaNova: null,
        arrastando: false
    };

    function definirFerramenta(nome) {
        Editor.estado.ferramenta = nome;
        $$('.ferramentas .bt-ferr').forEach(b => b.classList.toggle('ativa', b.dataset.ferramenta === nome));
        tela.classList.toggle('desenhando', nome !== 'selecionar' && nome !== 'mao');
        tela.classList.toggle('mao', nome === 'mao');
    }

    $$('.ferramentas .bt-ferr').forEach(b => {
        b.addEventListener('click', () => {
            if (caneta.forma) finalizarCaneta(false);
            definirFerramenta(b.dataset.ferramenta);
        });
    });

    function posDeEvento(ev) {
        const ret = mesa.getBoundingClientRect();
        return Editor.paraDocumento(ev.clientX - ret.left, ev.clientY - ret.top);
    }

    tela.addEventListener('pointerdown', ev => {
        if (ev.button === 1 || Editor.estado.ferramenta === 'mao') {
            acao.panInicial = { x: ev.clientX, y: ev.clientY, panX: Editor.estado.panX, panY: Editor.estado.panY };
            if (ev.button === 1) tela.classList.add('arrastando');
            tela.setPointerCapture(ev.pointerId);
            return;
        }
        if (ev.button !== 0) return;
        const { x, y } = posDeEvento(ev);
        const ferr = Editor.estado.ferramenta;

        if (ferr === 'selecionar') {
            // 1ª prioridade: alça de redimensionamento (clicada por cima)
            const canto = (ev.target && ev.target.dataset && ev.target.dataset.canto) || null;
            if (canto) {
                const f = Editor.formaSelecionada();
                if (f && f.tipo !== 'texto') {
                    acao.ponteiroInicial = { redimensionando: canto };
                    tela.setPointerCapture(ev.pointerId);
                    return;
                }
            }
            const f = Editor.formaNoPonto(x, y, TOLERANCIA / Editor.estado.zoom);
            Editor.selecionar(f ? f.id : null);
            if (f) {
                acao.ponteiroInicial = { x, y, ultimoX: x, ultimoY: y, original: { ...f }, movido: false };
                tela.setPointerCapture(ev.pointerId);
            }
            return;
        }

        // Caneta: clique adiciona nó; arraste puxa tangente
        if (ferr === 'caneta') {
            if (!caneta.forma) {
                caneta.forma = Editor.criarForma({ tipo: 'path', fechado: false, semFundo: true, contorno: '#26251f', espessura: 2, pontos: [] });
                caneta.forma.pontos.push({ x, y });
            } else {
                const anterior = caneta.forma.pontos[caneta.forma.pontos.length - 1];
                const novo = { x, y };
                // Curva suave: reflexo da tangente "b" anterior vira "a" do novo nó
                if (anterior.bx !== undefined && caneta.arrastou) {
                    novo.ax = 2 * anterior.x - anterior.bx;
                    novo.ay = 2 * anterior.y - anterior.by;
                }
                caneta.forma.pontos.push(novo);
            }
            caneta.arrastou = false;
            acao.ponteiroInicial = { caneta: true, x, y, movido: false };
            tela.setPointerCapture(ev.pointerId);
            renderizar();
            return;
        }

        // Ferramentas de criação: arrastar para definir tamanho
        const base = { fundo: '#3b82f6', contorno: '#26251f', espessura: 2 };
        if (ferr === 'retangulo') acao.formaNova = Editor.criarForma({ tipo: 'retangulo', x, y, w: 1, h: 1, ...base });
        else if (ferr === 'elipse') acao.formaNova = Editor.criarForma({ tipo: 'elipse', x, y, w: 1, h: 1, ...base });
        else if (ferr === 'linha') acao.formaNova = Editor.criarForma({ tipo: 'linha', x, y, x2: x, y2: y, espessura: 2, semFundo: true, contorno: '#26251f' });
        else if (ferr === 'texto') {
            const texto = Editor.criarForma({ tipo: 'texto', x, y, texto: 'Texto', fonte: 24, semFundo: true, contorno: '#26251f' });
            definirFerramenta('selecionar');
            Editor.registrarMudanca();
            toast('Texto criado — edite no painel');
            return;
        }
        acao.ponteiroInicial = { x, y, original: { ...acao.formaNova }, movido: false };
        tela.setPointerCapture(ev.pointerId);
    });

    tela.addEventListener('pointermove', ev => {
        const { x, y } = posDeEvento(ev);
        $('#st_pos').textContent = `x ${Math.round(x)} · y ${Math.round(y)}`;

        if (acao.panInicial) {
            Editor.definirPan(
                acao.panInicial.panX + (ev.clientX - acao.panInicial.x),
                acao.panInicial.panY + (ev.clientY - acao.panInicial.y)
            );
            return;
        }

        if (!acao.ponteiroInicial) return;
        const inicial = acao.ponteiroInicial;

        // Redimensionamento pela alça
        if (inicial.redimensionando) {
            const { x: dx, y: dy } = posDeEvento(ev);
            Editor.redimensionarSelecionada(inicial.redimensionando, dx, dy);
            renderizar();
            return;
        }

        const dx = x - inicial.x, dy = y - inicial.y;
        if (!inicial.movido && Math.hypot(dx, dy) < 2 / Editor.estado.zoom) return;
        inicial.movido = true;

        // Caneta: puxa a tangente "b" do último nó (com reflexo simétrico)
        if (inicial.caneta && caneta.forma) {
            const pontos = caneta.forma.pontos;
            const p = pontos[pontos.length - 1];
            p.bx = x; p.by = y;
            caneta.arrastou = true;
            renderizar();
            return;
        }

        const f = acao.formaNova || Editor.formaSelecionada();
        if (!f) return;

        if (acao.formaNova) {
            // Criação: ajusta geometria com o arraste
            if (f.tipo === 'retangulo' || f.tipo === 'elipse') {
                f.x = Math.min(inicial.x, x); f.y = Math.min(inicial.y, y);
                f.w = Math.abs(dx); f.h = Math.abs(dy);
            } else if (f.tipo === 'linha') {
                f.x2 = x; f.y2 = y;
            }
            Editor.selecionar(f.id);
        } else if (f.tipo === 'path') {
            // Movimento de path: aplica DELTAS acumulados (não substitui)
            const dxAcum = x - inicial.ultimoX, dyAcum = y - inicial.ultimoY;
            f.pontos.forEach(p => {
                p.x += dxAcum; p.y += dyAcum;
                if (p.ax !== undefined) { p.ax += dxAcum; p.ay += dyAcum; }
                if (p.bx !== undefined) { p.bx += dxAcum; p.by += dyAcum; }
            });
            inicial.ultimoX = x; inicial.ultimoY = y;
            acao.arrastando = true;
        } else {
            // Movimento de forma existente
            f.x = inicial.original.x + dx;
            f.y = inicial.original.y + dy;
            if (f.tipo === 'linha') { f.x2 = inicial.original.x2 + dx; f.y2 = inicial.original.y2 + dy; }
            acao.arrastando = true;
        }
        renderizar();
    });

    tela.addEventListener('pointerup', () => {
        if (acao.panInicial) {
            acao.panInicial = null;
            tela.classList.remove('arrastando');
        }
        if (acao.ponteiroInicial) {
            if (acao.ponteiroInicial.redimensionando) {
                Editor.registrarMudanca();
            } else if (acao.ponteiroInicial.caneta) {
                // Fim do gesto da caneta: se arrastou, a tangente "a" do PRÓXIMO
                // nó será preenchida na hora da criação dele (reflexo simétrico).
                acao.ponteiroInicial = null;
                return;
            } else if (acao.formaNova) {
                const f = acao.formaNova;
                // Descarta formas menores que 2px (clique duplo acidental)
                const c = Editor.caixa(f);
                if (c.w < 2 && c.h < 2 && f.tipo !== 'texto') {
                    Editor.removerSelecionada();
                } else {
                    Editor.registrarMudanca();
                }
                if (f.tipo !== 'texto') definirFerramenta('selecionar');
                acao.formaNova = null;
            } else if (acao.arrastando) {
                Editor.registrarMudanca();
            }
            acao.arrastando = false;
            acao.ponteiroInicial = null;
        }
        renderizar();
    });

    tela.addEventListener('wheel', ev => {
        ev.preventDefault();
        const ret = mesa.getBoundingClientRect();
        const fator = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
        Editor.definirZoom(Editor.estado.zoom * fator, ev.clientX - ret.left, ev.clientY - ret.top);
    }, { passive: false });

    /* ---------- Caneta ---------- */
    const caneta = { forma: null, arrastou: false };

    function finalizarCaneta(fechar) {
        const f = caneta.forma;
        if (!f) return;
        if (f.pontos.length < (fechar ? 3 : 2)) {
            // Traçado muito curto: descarta
            Editor.estado.formas = Editor.estado.formas.filter(x => x.id !== f.id);
            Editor.selecionar(null);
        } else {
            f.fechado = !!fechar;
            Editor.selecionar(f.id);
            Editor.registrarMudanca();
        }
        caneta.forma = null;
        renderizar();
    }

    // Caneta: integrada ao pointerdown/move/up principais (ver abaixo).
    $('#prop_x').addEventListener('input', () => Editor.definirX(parseFloat($('#prop_x').value) || 0));
    $('#prop_y').addEventListener('input', () => Editor.definirY(parseFloat($('#prop_y').value) || 0));
    $('#prop_l').addEventListener('input', () => Editor.definirLargura(parseFloat($('#prop_l').value) || 1));
    $('#prop_a').addEventListener('input', () => Editor.definirAltura(parseFloat($('#prop_a').value) || 1));
    $('#prop_fundo').addEventListener('input', () => Editor.definirFundo($('#prop_fundo').value));
    $('#prop_sem_fundo').addEventListener('change', () => Editor.definirFundo($('#prop_fundo').value, $('#prop_sem_fundo').checked));
    $('#prop_contorno').addEventListener('input', () => Editor.definirContorno($('#prop_contorno').value));
    $('#prop_sem_contorno').addEventListener('change', () => Editor.definirContorno($('#prop_contorno').value, $('#prop_sem_contorno').checked));
    $('#prop_espessura').addEventListener('input', () => Editor.definirEspessura(parseFloat($('#prop_espessura').value) || 2));
    $('#prop_texto').addEventListener('input', () => Editor.definirTexto($('#prop_texto').value));
    $('#prop_fonte').addEventListener('input', () => Editor.definirTexto(undefined, parseFloat($('#prop_fonte').value) || 24));

    /* ---------- Arquivos ---------- */
    function baixar(nome, conteudo, tipo) {
        const blob = new Blob([conteudo], { type: tipo });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nome;
        a.click();
        URL.revokeObjectURL(url);
    }

    $('#bt_salvar').addEventListener('click', () => {
        const nome = $('#nome_doc').value.trim() || 'sem-titulo';
        Editor.estado.nome = nome;
        baixar(nome + '.json', JSON.stringify(Editor.serializar(), null, 2), 'application/json');
        toast('Documento salvo (' + nome + '.json)');
    });

    $('#bt_abrir').addEventListener('click', () => $('#abrir_arquivo').click());
    $('#abrir_arquivo').addEventListener('change', () => {
        const arquivo = $('#abrir_arquivo').files[0];
        if (!arquivo) return;
        const leitor = new FileReader();
        leitor.onload = () => {
            try {
                Editor.carregar(JSON.parse(leitor.result));
                $('#nome_doc').value = Editor.estado.nome;
                toast('Documento aberto');
            } catch {
                toast('Arquivo inválido');
            }
        };
        leitor.readAsText(arquivo);
        $('#abrir_arquivo').value = '';
    });

    $('#bt_novo').addEventListener('click', () => {
        if (Editor.estado.formas.length && !confirm('Descartar o desenho atual?')) return;
        Editor.limpar('sem-titulo');
        $('#nome_doc').value = 'sem-titulo';
        Editor.registrarMudanca();
    });

    $('#bt_exportar_svg').addEventListener('click', () => {
        const nome = $('#nome_doc').value.trim() || 'sem-titulo';
        baixar(nome + '.svg', Editor.exportarSvg(), 'image/svg+xml');
        toast('SVG exportado');
    });

    $('#bt_exportar_png').addEventListener('click', () => {
        const svg = Editor.exportarSvg();
        const img = new Image();
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1600; canvas.height = 1200;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = ($('#nome_doc').value.trim() || 'sem-titulo') + '.png';
                a.click();
            });
            URL.revokeObjectURL(url);
            toast('PNG exportado (1600×1200)');
        };
        img.onerror = () => toast('Falha ao exportar PNG');
        img.src = url;
    });

    /* ---------- Undo/redo ---------- */
    $('#bt_undo').addEventListener('click', () => { if (Editor.desfazer()) toast('Desfeito'); });
    $('#bt_redo').addEventListener('click', () => { if (Editor.refazer()) toast('Refeito'); });

    /* ---------- Teclado ---------- */
    const ATALHOS = { v: 'selecionar', r: 'retangulo', e: 'elipse', l: 'linha', t: 'texto', p: 'caneta', h: 'mao' };

    window.addEventListener('keydown', ev => {
        if (ev.target.matches('input, textarea, select')) return;
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
            ev.preventDefault();
            if (ev.shiftKey) { if (Editor.refazer()) toast('Refeito'); }
            else { if (Editor.desfazer()) toast('Desfeito'); }
            return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') {
            ev.preventDefault();
            if (Editor.refazer()) toast('Refeito');
            return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
            ev.preventDefault();
            $('#bt_salvar').click();
            return;
        }
        if (ev.key === 'Delete' || ev.key === 'Backspace') {
            if (Editor.estado.ferramenta === 'caneta' && caneta.forma) {
                Editor.removerUltimoPonto(caneta.forma);
                if (!caneta.forma.pontos.length) {
                    Editor.estado.formas = Editor.estado.formas.filter(x => x.id !== caneta.forma.id);
                    caneta.forma = null;
                }
                renderizar();
                return;
            }
            if (Editor.removerSelecionada()) {
                Editor.registrarMudanca();
                toast('Forma removida');
            }
            return;
        }
        if (Editor.estado.ferramenta === 'caneta') {
            if (ev.key === 'Enter') {
                finalizarCaneta(true);
                toast('Forma fechada');
                return;
            }
            if (ev.key === 'Escape') {
                // Cancelar: descarta o traçado em andamento
                if (caneta.forma) {
                    Editor.estado.formas = Editor.estado.formas.filter(x => x.id !== caneta.forma.id);
                    caneta.forma = null;
                    Editor.selecionar(null);
                    renderizar();
                    toast('Traçado cancelado');
                }
                return;
            }
        }
        const ferr = ATALHOS[ev.key.toLowerCase()];
        if (ferr) {
            // Trocar de ferramenta com traçado aberto encerra em linha aberta
            if (caneta.forma) finalizarCaneta(false);
            definirFerramenta(ferr);
        }
    });

    /* ---------- Camadas (painel) ---------- */
    const NOMES_TIPO = { retangulo: 'Retângulo', elipse: 'Elipse', linha: 'Linha', texto: 'Texto', path: 'Traçado' };

    function nomeDaCamada(f) {
        if (f.nome) return f.nome;
        if (f.tipo === 'texto') return 'Texto: ' + (f.texto || '').slice(0, 14);
        return NOMES_TIPO[f.tipo] || f.tipo;
    }

    function corDaCamada(f) {
        if (f.tipo === 'linha' || f.tipo === 'path') return f.semContorno ? (f.fundo || '#8a6ef0') : (f.contorno || '#26251f');
        return f.semFundo ? 'transparent' : (f.fundo || '#3b82f6');
    }

    function renderizarCamadas() {
        const lista = $('#lista_camadas');
        lista.replaceChildren();
        // Do topo para o fundo (como editores gráficos)
        [...Editor.estado.formas].reverse().forEach(f => {
            const item = document.createElement('li');
            item.className = 'camada' + (Editor.estado.selecao === f.id ? ' ativa' : '') + (f.oculta ? ' oculta' : '');
            item.dataset.id = f.id;

            const icone = document.createElement('span');
            icone.className = 'camada-icone';
            icone.style.background = corDaCamada(f);

            const nome = document.createElement('span');
            nome.className = 'camada-nome';
            nome.textContent = nomeDaCamada(f);
            nome.title = 'Duplo clique para renomear';

            const olho = document.createElement('button');
            olho.className = 'camada-olho';
            olho.textContent = f.oculta ? '🚫' : '👁';
            olho.title = f.oculta ? 'Mostrar' : 'Ocultar';
            olho.setAttribute('aria-label', (f.oculta ? 'Mostrar ' : 'Ocultar ') + nomeDaCamada(f));
            olho.addEventListener('click', ev => {
                ev.stopPropagation();
                Editor.definirVisibilidade(f.id, !!f.oculta);
                Editor.registrarMudanca();
            });

            item.append(icone, nome, olho);
            item.addEventListener('click', () => Editor.selecionar(f.id));
            item.addEventListener('dblclick', () => {
                nome.contentEditable = 'true';
                nome.focus();
                document.getSelection().selectAllChildren(nome);
            });
            nome.addEventListener('blur', () => {
                nome.contentEditable = 'false';
                Editor.renomearForma(f.id, nome.textContent.trim());
                if (!f.nome) nome.textContent = nomeDaCamada(f);
                Editor.registrarMudanca();
            });
            nome.addEventListener('keydown', ev => {
                if (ev.key === 'Enter') { ev.preventDefault(); nome.blur(); }
                if (ev.key === 'Escape') { nome.textContent = nomeDaCamada(f); nome.blur(); }
            });
            lista.appendChild(item);
        });
        atualizarAcoesCamadas();
    }

    function atualizarAcoesCamadas() {
        const temSelecao = !!Editor.estado.selecao;
        $('#camadas_acoes').hidden = !temSelecao;
        if (!temSelecao) return;
        const id = Editor.estado.selecao;
        const f = Editor.formaSelecionada();
        $('#bt_camada_visivel').textContent = f.oculta ? '🚫' : '👁';
        // Desabilita ordem impossível
        const indice = Editor.estado.formas.findIndex(x => x.id === id);
        const total = Editor.estado.formas.length;
        $$('#camadas_acoes [data-ordem]').forEach(b => {
            const ordem = b.dataset.ordem;
            const impossivel = (ordem === 'topo' && indice === total - 1)
                || (ordem === 'fundo' && indice === 0)
                || (ordem === 'frente' && indice === total - 1)
                || (ordem === 'tras' && indice === 0);
            b.disabled = !!impossivel;
        });
    }

    // (a lista de camadas é re-renderizada a cada documento; nenhum listener global necessário)

    $$('#camadas_acoes [data-ordem]').forEach(b => {
        b.addEventListener('click', () => {
            if (Editor.moverFormaNaOrdem(Editor.estado.selecao, b.dataset.ordem)) {
                Editor.registrarMudanca();
            }
        });
    });

    $('#bt_camada_visivel').addEventListener('click', () => {
        const f = Editor.formaSelecionada();
        if (!f) return;
        Editor.definirVisibilidade(f.id, !!f.oculta);
        Editor.registrarMudanca();
    });

    $('#bt_camada_remover').addEventListener('click', () => {
        if (Editor.removerSelecionada()) {
            Editor.registrarMudanca();
            toast('Forma removida');
        }
    });

    /* ---------- Reações do modelo ---------- */
    Editor.onChange((evento) => {
        if (evento === 'selecao') atualizarPainel();
        if (evento === 'documento' || evento === 'selecao') renderizarCamadas();
        renderizar();
    });

    window.addEventListener('resize', sincronizarViewbox);

    /* ---------- Início ---------- */
    Editor.limpar('sem-titulo');
    Editor.registrarMudanca();
    sincronizarViewbox();
    definirFerramenta('selecionar');
})();
