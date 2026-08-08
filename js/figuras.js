import { shuffleArray } from './utils.js';

var VALORES_DADOS = [1, 2, 3, 4, 5, 6];

// Formas simples
var FORMAS = {
    linea: [{x:0,y:0},{x:1,y:0},{x:2,y:0}],
    linea_larga: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0}],
    cruz: [{x:0,y:0},{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1}],
    cruz_grande: [{x:0,y:0},{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1},{x:-2,y:0},{x:2,y:0},{x:0,y:-2},{x:0,y:2}],
    L: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:2,y:1},{x:2,y:2}],
    L_invertida: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1},{x:0,y:2}],
    T: [{x:0,y:0},{x:-1,y:0},{x:1,y:0},{x:0,y:1},{x:0,y:2}],
    T_invertida: [{x:0,y:0},{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:-2}],
    cuadrado: [{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}],
    rectangulo: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1}],
    zigzag: [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:2,y:1},{x:2,y:2}],
    zigzag_largo: [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:2,y:1},{x:2,y:2},{x:3,y:2},{x:3,y:3}],
    escalera: [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:2,y:1},{x:2,y:2},{x:3,y:2}],
    escalera_invertida: [{x:0,y:2},{x:1,y:2},{x:1,y:1},{x:2,y:1},{x:2,y:0},{x:3,y:0}],
    diamante: [{x:0,y:0},{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1},{x:-1,y:1},{x:1,y:1},{x:-1,y:-1},{x:1,y:-1}],
    estrella: [{x:0,y:0},{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1},{x:-1,y:-1},{x:1,y:-1},{x:-1,y:1},{x:1,y:1}]
};

// Formas grandes para modo grupal
var FORMAS_GRANDES = {
    numeral: [{x:0,y:0},{x:2,y:0},{x:4,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:2,y:2},{x:4,y:2},{x:2,y:3},{x:4,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:2,y:5},{x:4,y:5}],
    piramide: [{x:2,y:1},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5}],
    puente: [{x:1,y:1},{x:3,y:1},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:1,y:3},{x:3,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:1,y:5},{x:3,y:5}],
    torre: [{x:1,y:0},{x:3,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:1,y:2},{x:3,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:1,y:4},{x:3,y:4},{x:1,y:5},{x:2,y:5},{x:3,y:5}],
    cangrejo: [{x:0,y:1},{x:4,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:0,y:5},{x:4,y:5}],
    vista: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:0,y:1},{x:2,y:1},{x:4,y:1},{x:0,y:2},{x:2,y:2},{x:4,y:2},{x:0,y:3},{x:2,y:3},{x:4,y:3},{x:0,y:4},{x:2,y:4},{x:4,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5}],
    punto: [{x:2,y:1},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:2,y:5}],
    lupa: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:0,y:1},{x:4,y:1},{x:0,y:2},{x:4,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:2,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5}],
    espiral: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:4,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:4,y:2},{x:0,y:3},{x:2,y:3},{x:4,y:3},{x:0,y:4},{x:4,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5}],
    nave: [{x:2,y:0},{x:2,y:1},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:1,y:5},{x:2,y:5},{x:3,y:5}],
    ventana: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:0,y:1},{x:2,y:1},{x:4,y:1},{x:0,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:4,y:3},{x:0,y:4},{x:2,y:4},{x:4,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5}],
    perro: [{x:1,y:1},{x:0,y:2},{x:1,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:4,y:4},{x:1,y:5},{x:4,y:5}],
    cactus: [{x:0,y:0},{x:2,y:0},{x:4,y:0},{x:0,y:1},{x:2,y:1},{x:4,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:2,y:3},{x:2,y:4},{x:2,y:5}],
    lagartija: [{x:0,y:0},{x:2,y:0},{x:4,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:2,y:2},{x:2,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:0,y:5},{x:2,y:5},{x:4,y:5}],
    escalera_grande: [{x:4,y:1},{x:3,y:2},{x:4,y:2},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5}],
    escalera_inv_grande: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:0,y:3},{x:1,y:3},{x:0,y:4}],
    cabra: [{x:1,y:0},{x:3,y:0},{x:1,y:1},{x:3,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:2,y:5}],
    flecha_arriba: [{x:2,y:0},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:0,y:3},{x:2,y:3},{x:4,y:3},{x:2,y:4},{x:2,y:5}],
    flecha_abajo: [{x:2,y:0},{x:2,y:1},{x:0,y:2},{x:2,y:2},{x:4,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:2,y:5}],
    persona: [{x:2,y:0},{x:4,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:0,y:2},{x:2,y:2},{x:2,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:0,y:5},{x:1,y:5},{x:3,y:5},{x:4,y:5}]
};

export function generarFigura(modo) {
    var formaLista;
    var formaBase;
    var formaNombre;
    
    if (modo === 'grupal') {
        formaLista = Object.keys(FORMAS_GRANDES);
        formaNombre = formaLista[Math.floor(Math.random() * formaLista.length)];
        formaBase = FORMAS_GRANDES[formaNombre];
    } else {
        formaLista = Object.keys(FORMAS);
        formaNombre = formaLista[Math.floor(Math.random() * formaLista.length)];
        formaBase = FORMAS[formaNombre];
    }
    
    if (!formaBase) return generarFiguraPorDefecto(modo);
    
    var celdas = [];
    for (var i = 0; i < formaBase.length; i++) {
        celdas.push({
            x: formaBase[i].x,
            y: formaBase[i].y,
            valor: VALORES_DADOS[Math.floor(Math.random() * VALORES_DADOS.length)]
        });
    }
    
    var centro = encontrarCentro(celdas);
    var inicio = null;
    for (var j = 0; j < celdas.length; j++) {
        if (celdas[j].x === centro.x && celdas[j].y === centro.y) {
            inicio = celdas[j];
            break;
        }
    }
    if (!inicio) inicio = celdas[0];
    
    return {
        id: 'fig-' + Math.random().toString(36).substring(2, 8),
        forma: formaNombre,
        celdas: celdas,
        inicio: { x: inicio.x, y: inicio.y },
        totalCeldas: celdas.length,
        completada: false
    };
}

function generarFiguraPorDefecto(modo) {
    var celdas;
    if (modo === 'grupal') {
        celdas = [{x:0,y:0,valor:6},{x:1,y:0,valor:1},{x:2,y:0,valor:1},{x:0,y:1,valor:1},{x:1,y:1,valor:1},{x:2,y:1,valor:1},{x:0,y:2,valor:1},{x:1,y:2,valor:1},{x:2,y:2,valor:1},{x:3,y:0,valor:1},{x:3,y:1,valor:1},{x:3,y:2,valor:1}];
    } else {
        celdas = [{x:0,y:0,valor:6},{x:-1,y:0,valor:1},{x:1,y:0,valor:1},{x:0,y:-1,valor:1},{x:0,y:1,valor:1}];
    }
    return {
        id: 'fig-' + Math.random().toString(36).substring(2, 8),
        forma: modo === 'grupal' ? 'rectangulo' : 'cruz',
        celdas: celdas,
        inicio: { x: 0, y: 0 },
        totalCeldas: celdas.length,
        completada: false
    };
}

function encontrarCentro(celdas) {
    var xs = [];
    var ys = [];
    for (var i = 0; i < celdas.length; i++) {
        xs.push(celdas[i].x);
        ys.push(celdas[i].y);
    }
    var minX = Math.min.apply(null, xs);
    var maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys);
    var maxY = Math.max.apply(null, ys);
    return {
        x: Math.round((minX + maxX) / 2),
        y: Math.round((minY + maxY) / 2)
    };
}