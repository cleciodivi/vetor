/* VETOR — núcleo do editor: modelo de documento, desenho, seleção e transformações */
'use strict';

/* Modelo: { formas: [ { id, tipo, x, y, w, h, x2, y2, texto, fonte,
                         fundo, contorno, espessura, semFundo, semContorno } ] }
   Tudo em coordenadas do documento (sem zoom). Linhas usam x2/y2 em vez de w/h. */
const Editor = (() => {

    // ---------- Estado ----------
    const estado = {
        formas: [],
        selecao: null,          // id da forma selecionada
        ferramenta: 'selecionar',
        zoom: 1,
        panX: 0,
        panY: 0,
        nome: 'sem-titulo'
    };

    let ouvintes = [];

    function notificar(evento, dados) {
        ouvintes.forEach(fn => fn(evento, dados));
    }

    function onChange(fn) {
        ouvintes.push(fn);
    }

    function novoId() {
        return 'f' + Math.random().toString(36).slice(2, 9);
    }

    // ---------- Documento ----------
    function limpar(nome) {
        estado.formas = [];
        estado.selecao = null;
        estado.nome = nome || 'sem-titulo';
        notificar('documento');
        notificar('selecao');
    }

    function carregar(dados) {
        if (!dados || !Array.isArray(dados.formas)) throw new Error('Arquivo inválido');
        estado.formas = dados.formas.map(f => ({ ...f, id: f.id || novoId() }));
        estado.selecao = null;
        estado.nome = dados.nome || 'sem-titulo';
        if (typeof dados.zoom === 'number' && dados.zoom > 0) {
            estado.zoom = Math.min(8, Math.max(0.1, dados.zoom));
            estado.panX = dados.panX || 0;
            estado.panY = dados.panY || 0;
        }
        notificar('documento');
        notificar('selecao');
    }

    function serializar() {
        return {
            aplicativo: 'VETOR',
            versao: 1,
            nome: estado.nome,
            zoom: estado.zoom,
            panX: estado.panX,
            panY: estado.panY,
            formas: estado.formas.map(f => ({ ...f }))
        };
    }

    // ---------- Formas ----------
    function criarForma(props) {
        const forma = { id: novoId(), semFundo: false, semContorno: false, espessura: 2, ...props };
        estado.formas.push(forma);
        estado.selecao = forma.id;
        notificar('documento');
        notificar('selecao');
        return forma;
    }

    function formaPorId(id) {
        return estado.formas.find(f => f.id === id) || null;
    }

    function formaSelecionada() {
        return estado.selecao ? formaPorId(estado.selecao) : null;
    }

    function selecionar(id) {
        estado.selecao = id;
        notificar('selecao');
    }

    function removerSelecionada() {
        const f = formaSelecionada();
        if (!f) return false;
        estado.formas = estado.formas.filter(x => x.id !== f.id);
        estado.selecao = null;
        notificar('documento');
        notificar('selecao');
        return true;
    }

    // ---------- Propriedades ----------
    function atualizarPropriedades(mudancas) {
        const f = formaSelecionada();
        if (!f) return;
        Object.assign(f, mudancas);
        notificar('documento');
    }

    function limitar(v, min, max) {
        v = Number(v);
        if (!Number.isFinite(v)) return min;
        return Math.min(max, Math.max(min, v));
    }

    function definirX(v) { const f = formaSelecionada(); if (!f) return; f.x = v; notificar('documento'); }
    function definirY(v) { const f = formaSelecionada(); if (!f) return; f.y = v; notificar('documento'); }

    function definirLargura(v) {
        const f = formaSelecionada();
        if (!f) return;
        v = limitar(v, 1, 100000);
        if (f.tipo === 'linha') { f.x2 = f.x + v; } else { f.w = v; }
        notificar('documento');
    }

    function definirAltura(v) {
        const f = formaSelecionada();
        if (!f) return;
        v = limitar(v, 1, 100000);
        if (f.tipo === 'linha') { f.y2 = f.y + v; } else { f.h = v; }
        notificar('documento');
    }

    function definirFundo(cor, semFundo) {
        const f = formaSelecionada();
        if (!f) return;
        f.fundo = cor;
        if (semFundo !== undefined) f.semFundo = !!semFundo;
        notificar('documento');
    }

    function definirContorno(cor, semContorno) {
        const f = formaSelecionada();
        if (!f) return;
        f.contorno = cor;
        if (semContorno !== undefined) f.semContorno = !!semContorno;
        notificar('documento');
    }

    function definirEspessura(v) {
        const f = formaSelecionada();
        if (!f) return;
        f.espessura = limitar(v, 0.5, 100);
        notificar('documento');
    }

    function definirTexto(texto, tamanho) {
        const f = formaSelecionada();
        if (!f || f.tipo !== 'texto') return;
        if (texto !== undefined) f.texto = String(texto);
        if (tamanho !== undefined) f.fonte = limitar(tamanho, 4, 500);
        notificar('documento');
    }

    // ---------- Translação por arraste ----------
    function moverSelecionada(dx, dy) {
        const f = formaSelecionada();
        if (!f) return;
        f.x += dx;
        f.y += dy;
        if (f.tipo === 'linha') { f.x2 += dx; f.y2 += dy; }
    }

    // ---------- Zoom e pan ----------
    function definirZoom(z, centroX, centroY) {
        const novo = Math.min(8, Math.max(0.1, Number(z) || 1));
        if (centroX !== undefined) {
            // Mantém o ponto do documento sob o cursor
            const docX = (centroX - estado.panX) / estado.zoom;
            const docY = (centroY - estado.panY) / estado.zoom;
            estado.zoom = novo;
            estado.panX = centroX - docX * novo;
            estado.panY = centroY - docY * novo;
        } else {
            estado.zoom = novo;
        }
        notificar('viewport');
    }

    function definirPan(x, y) {
        estado.panX = x;
        estado.panY = y;
        notificar('viewport');
    }

    // ---------- Coordenadas ----------
    function paraDocumento(px, py) {
        return { x: (px - estado.panX) / estado.zoom, y: (py - estado.panY) / estado.zoom };
    }

    // ---------- Exportação SVG ----------
    function escaparXml(texto) {
        return String(texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function etiquetaForma(f) {
        if (f.tipo === 'texto') return `<text x="${f.x}" y="${f.y}" font-size="${f.fonte || 24}" font-family="Inter, sans-serif" fill="${f.semContorno ? 'none' : (f.contorno || '#26251f')}">${escaparXml(f.texto || '')}</text>`;
        let tag;
        if (f.tipo === 'retangulo') tag = `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}"`;
        else if (f.tipo === 'elipse') tag = `<ellipse cx="${f.x + f.w / 2}" cy="${f.y + f.h / 2}" rx="${f.w / 2}" ry="${f.h / 2}"`;
        else tag = `<line x1="${f.x}" y1="${f.y}" x2="${f.x2}" y2="${f.y2}"`;
        if (f.tipo === 'linha') {
            tag += ` stroke="${f.semContorno ? (f.fundo || '#3b82f6') : (f.contorno || '#26251f')}" stroke-width="${f.espessura || 2}" stroke-linecap="round"/>`;
        } else {
            tag += ` fill="${f.semFundo ? 'none' : (f.fundo || '#3b82f6')}"`;
            if (!f.semContorno) tag += ` stroke="${f.contorno || '#26251f'}" stroke-width="${f.espessura || 2}"`;
            tag += '/>';
        }
        return tag;
    }

    function exportarSvg() {
        const linhas = estado.formas.map(etiquetaForma);
        return [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">',
            ...(linhas.length ? linhas : []),
            '</svg>'
        ].join('\n');
    }

    // ---------- Caixa de uma forma (para o overlay) ----------
    function caixa(f) {
        if (f.tipo === 'linha') {
            return {
                x: Math.min(f.x, f.x2), y: Math.min(f.y, f.y2),
                w: Math.abs(f.x2 - f.x), h: Math.abs(f.y2 - f.y)
            };
        }
        if (f.tipo === 'texto') {
            // Caixa aproximada: largura ~0.6 × fonte por caractere, altura = fonte
            const fonte = f.fonte || 24;
            const texto = f.texto || '';
            return { x: f.x, y: f.y - fonte * 0.8, w: Math.max(1, texto.length * fonte * 0.6), h: fonte };
        }
        return { x: f.x, y: f.y, w: f.w, h: f.h };
    }

    function acertouForma(f, docX, docY, tolerancia) {
        const caixaInteira = caixa(f);
        const margem = tolerancia + (f.espessura || 0);
        if (docX < caixaInteira.x - margem || docX > caixaInteira.x + caixaInteira.w + margem) return false;
        if (docY < caixaInteira.y - margem || docY > caixaInteira.y + caixaInteira.h + margem) return false;
        if (f.tipo === 'retangulo' || f.tipo === 'texto') return true;
        if (f.tipo === 'elipse') {
            const cx = caixaInteira.x + f.w / 2, cy = caixaInteira.y + f.h / 2;
            const rx = f.w / 2 + margem, ry = f.h / 2 + margem;
            const dx = (docX - cx) / rx, dy = (docY - cy) / ry;
            return dx * dx + dy * dy <= 1;
        }
        // linha: distância ponto-segmento
        const dx = f.x2 - f.x, dy = f.y2 - f.y;
        const comprimento2 = dx * dx + dy * dy;
        let t = comprimento2 === 0 ? 0 : ((docX - f.x) * dx + (docY - f.y) * dy) / comprimento2;
        t = Math.max(0, Math.min(1, t));
        const proxX = f.x + t * dx, proxY = f.y + t * dy;
        const dist = Math.hypot(docX - proxX, docY - proxY);
        return dist <= margem;
    }

    function formaNoPonto(docX, docY, tolerancia) {
        // De cima para baixo (última desenhada primeiro)
        for (let i = estado.formas.length - 1; i >= 0; i--) {
            if (acertouForma(estado.formas[i], docX, docY, tolerancia)) return estado.formas[i];
        }
        return null;
    }

    // ---------- Histórico ----------
    const historico = { pilha: [], indice: -1 };
    const LIMITE = 60;

    function capturarSnapshot() {
        return JSON.stringify({ formas: estado.formas });
    }

    function registrarMudanca() {
        const snapshot = capturarSnapshot();
        if (historico.pilha[historico.indice] === snapshot) return;
        historico.pilha = historico.pilha.slice(0, historico.indice + 1);
        historico.pilha.push(snapshot);
        if (historico.pilha.length > LIMITE) historico.pilha.shift();
        historico.indice = historico.pilha.length - 1;
        notificar('historico');
    }

    function restaurarSnapshot(snapshot) {
        const dados = JSON.parse(snapshot);
        estado.formas = dados.formas;
        if (estado.selecao && !formaPorId(estado.selecao)) estado.selecao = null;
        notificar('documento');
        notificar('selecao');
    }

    function desfazer() {
        if (historico.indice <= 0) return false;
        historico.indice--;
        restaurarSnapshot(historico.pilha[historico.indice]);
        return true;
    }

    function refazer() {
        if (historico.indice >= historico.pilha.length - 1) return false;
        historico.indice++;
        restaurarSnapshot(historico.pilha[historico.indice]);
        return true;
    }

    return {
        estado,
        onChange, limpar, carregar, serializar,
        criarForma, formaPorId, formaSelecionada, selecionar, removerSelecionada,
        atualizarPropriedades,
        definirX, definirY, definirLargura, definirAltura,
        definirFundo, definirContorno, definirEspessura, definirTexto,
        moverSelecionada,
        definirZoom, definirPan, paraDocumento,
        exportarSvg, caixa, formaNoPonto,
        registrarMudanca, desfazer, refazer
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Editor;
}