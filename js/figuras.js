// figuras.js
import { shuffleArray } from './utils.js';

var VALORES_DADOS = [1, 2, 3, 4, 5, 6];

// ============================================================
// FORMAS SIMPLES (1 a 10 dados)
// ============================================================

// --- 1 dado ---
var FORMAS = {
    punto_1: [{x:0,y:0}], // 1 dado - Punto

// --- 2 dados ---
    horizontal: [{x:0,y:0},{x:1,y:0}], // 2 dados - Horizontal
    vertical: [{x:0,y:0},{x:0,y:1}], // 2 dados - Vertical

// --- 3 dados ---
    linea: [{x:0,y:0},{x:1,y:0},{x:2,y:0}], // 3 dados

// --- 4 dados ---
    cuadrado: [{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}], // 4 dados - Cuadrado lleno 2x2
    tetromino_T: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:1,y:1}], // 4 dados - Tetrominó T (2x3)
    tetromino_L: [{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:1,y:2}], // 4 dados - Tetrominó L (3x2)
    tetromino_S: [{x:1,y:0},{x:2,y:0},{x:0,y:1},{x:1,y:1}], // 4 dados - Tetrominó S (2x3)

// --- 5 dados ---
    linea_larga: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0}], // 5 dados
    cruz: [{x:0,y:0},{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1}], // 5 dados - Cruz pequeña (3x3)
    L: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:2,y:1},{x:2,y:2}], // 5 dados
    L_invertida: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1},{x:0,y:2}], // 5 dados
    T: [{x:0,y:0},{x:-1,y:0},{x:1,y:0},{x:0,y:1},{x:0,y:2}], // 5 dados
    T_invertida: [{x:0,y:0},{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:-2}], // 5 dados
    zigzag: [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:2,y:1},{x:2,y:2}], // 5 dados
    U_invertida: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1},{x:2,y:1}], // 5 dados - U invertida (3x3)

// --- 6 dados ---
    rectangulo: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1}], // 6 dados
    escalera: [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:2,y:1},{x:2,y:2},{x:3,y:2}], // 6 dados
    escalera_invertida: [{x:0,y:2},{x:1,y:2},{x:1,y:1},{x:2,y:1},{x:2,y:0},{x:3,y:0}], // 6 dados

// --- 7 dados ---
    zigzag_largo: [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:2,y:1},{x:2,y:2},{x:3,y:2},{x:3,y:3}], // 7 dados

// --- 9 dados ---
    cruz_grande: [{x:0,y:0},{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1},{x:-2,y:0},{x:2,y:0},{x:0,y:-2},{x:0,y:2}], // 9 dados
    diamante: [{x:0,y:0},{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1},{x:-1,y:1},{x:1,y:1},{x:-1,y:-1},{x:1,y:-1}], // 9 dados
    estrella: [{x:0,y:0},{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1},{x:-1,y:-1},{x:1,y:-1},{x:-1,y:1},{x:1,y:1}] // 9 dados
};

// ============================================================
// FORMAS GRANDES (11 o más dados)
// ============================================================

var FORMAS_GRANDES = {
    perro: [{x:1,y:1},{x:0,y:2},{x:1,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:4,y:4},{x:1,y:5},{x:4,y:5}], // 11 dados

// --- 13 dados ---
    cruz_grande_13: [{x:1,y:0},{x:3,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:1,y:2},{x:3,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:3,y:4}], // 13 dados - Cruz grande (5x5)
    corazon: [{x:1,y:0},{x:3,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:2,y:4}], // 13 dados - Corazón (5x5)
    diamante_grande: [{x:2,y:0},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:2,y:4}], // 13 dados - Diamante grande (5x5)
    punto: [{x:2,y:1},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:2,y:5}], // 13 dados

// --- 14 dados ---
    puente: [{x:1,y:1},{x:3,y:1},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:1,y:3},{x:3,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:1,y:5},{x:3,y:5}], // 14 dados
    flecha_derecha: [{x:3,y:0},{x:2,y:1},{x:3,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:2,y:3},{x:3,y:3},{x:3,y:4}], // 14 dados - Flecha derecha (5x7)
    flecha_izquierda: [{x:3,y:0},{x:3,y:1},{x:4,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:3,y:3},{x:4,y:3},{x:3,y:4}], // 14 dados - Flecha izquierda (5x7)

// --- 15 dados ---
    cactus: [{x:0,y:0},{x:2,y:0},{x:4,y:0},{x:0,y:1},{x:2,y:1},{x:4,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:2,y:3},{x:2,y:4},{x:2,y:5}], // 15 dados
    flecha_arriba: [{x:2,y:0},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:0,y:3},{x:2,y:3},{x:4,y:3},{x:2,y:4},{x:2,y:5}], // 15 dados
    flecha_abajo: [{x:2,y:0},{x:2,y:1},{x:0,y:2},{x:2,y:2},{x:4,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:2,y:5}], // 15 dados
    escalera_grande: [{x:4,y:1},{x:3,y:2},{x:4,y:2},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5}], // 15 dados
    escalera_inv_grande: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:0,y:3},{x:1,y:3},{x:0,y:4}], // 15 dados
    triangulo: [{x:2,y:0},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4}], // 15 dados - Triángulo (5x5)

// --- 16 dados ---
    cangrejo: [{x:0,y:1},{x:4,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:0,y:5},{x:4,y:5}], // 16 dados
    nave: [{x:2,y:0},{x:2,y:1},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:1,y:5},{x:2,y:5},{x:3,y:5}], // 16 dados
    espiral_pequena: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:4,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:0,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4}], // 16 dados - Espiral pequeña (5x5)
    cuadrado_hueco: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:0,y:1},{x:4,y:1},{x:0,y:2},{x:4,y:2},{x:0,y:3},{x:4,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4}], // 16 dados - Cuadrado hueco (5x5)

// --- 17 dados ---
    torre: [{x:1,y:0},{x:3,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:1,y:2},{x:3,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:1,y:4},{x:3,y:4},{x:1,y:5},{x:2,y:5},{x:3,y:5}], // 17 dados
    piramide: [{x:2,y:1},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5}], // 17 dados
    persona: [{x:2,y:0},{x:4,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:0,y:2},{x:2,y:2},{x:2,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:0,y:5},{x:1,y:5},{x:3,y:5},{x:4,y:5}], // 17 dados

// --- 18 dados ---
    cabra: [{x:1,y:0},{x:3,y:0},{x:1,y:1},{x:3,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:2,y:5}], // 18 dados
    lagartija: [{x:0,y:0},{x:2,y:0},{x:4,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:2,y:2},{x:2,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:0,y:5},{x:2,y:5},{x:4,y:5}], // 18 dados
    ancla: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:1,y:1},{x:3,y:1},{x:1,y:2},{x:3,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:2,y:4}], // 18 dados - Ancla (5x5)
    numeral: [{x:1,y:0},{x:3,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:1,y:2},{x:3,y:2},{x:1,y:3},{x:3,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:1,y:5},{x:3,y:5}], // 18 dados - Numeral (5x6)

// --- 20 dados ---
    espiral: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:4,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:4,y:2},{x:0,y:3},{x:2,y:3},{x:4,y:3},{x:0,y:4},{x:4,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5}], // 20 dados
    lupa: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:0,y:1},{x:4,y:1},{x:0,y:2},{x:4,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:2,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5}], // 20 dados
    castillo: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:4,y:0},{x:5,y:0},{x:6,y:0},{x:0,y:1},{x:2,y:1},{x:4,y:1},{x:6,y:1},{x:0,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:6,y:2},{x:0,y:3},{x:6,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:6,y:4}], // 20 dados - Castillo (5x7)

// --- 22 dados ---
    vista: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:0,y:1},{x:2,y:1},{x:4,y:1},{x:0,y:2},{x:2,y:2},{x:4,y:2},{x:0,y:3},{x:2,y:3},{x:4,y:3},{x:0,y:4},{x:2,y:4},{x:4,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5}], // 22 dados
    castillo_almenas: [{x:0,y:0},{x:1,y:0},{x:4,y:0},{x:5,y:0},{x:0,y:1},{x:1,y:1},{x:4,y:1},{x:5,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:0,y:3},{x:5,y:3},{x:0,y:4},{x:5,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5},{x:5,y:5}], // 22 dados - Castillo con almenas (6x6)

// --- 23 dados ---
    casa: [{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:0,y:3},{x:5,y:3},{x:0,y:4},{x:5,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5},{x:5,y:5}], // 23 dados - Casa (6x6)

// --- 24 dados ---
    ventana: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:0,y:1},{x:2,y:1},{x:4,y:1},{x:0,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:4,y:3},{x:0,y:4},{x:2,y:4},{x:4,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5}], // 24 dados
    cuadrado_hueco_grande: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:0,y:1},{x:5,y:1},{x:0,y:2},{x:5,y:2},{x:0,y:3},{x:5,y:3},{x:0,y:4},{x:5,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5},{x:5,y:5}], // 24 dados - Cuadrado hueco grande (6x6)
    estrella_4_puntas: [{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:5,y:3},{x:6,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:5,y:4},{x:6,y:4},{x:2,y:5},{x:3,y:5},{x:4,y:5},{x:2,y:6},{x:3,y:6},{x:4,y:6}], // 24 dados - Estrella de 4 puntas (7x7)
    marco_grueso: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:0,y:1},{x:1,y:1},{x:4,y:1},{x:5,y:1},{x:0,y:2},{x:5,y:2},{x:0,y:3},{x:5,y:3},{x:0,y:4},{x:1,y:4},{x:4,y:4},{x:5,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5},{x:5,y:5}], // 24 dados - Marco grueso (6x6)
    tronco_arbol: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4}], // 24 dados - Tronco de árbol (5x7)

// --- 26 dados ---
    laberinto_simple: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0},{x:5,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:5,y:2},{x:0,y:3},{x:3,y:3},{x:5,y:3},{x:0,y:4},{x:3,y:4},{x:5,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5},{x:5,y:5}] // 26 dados - Laberinto simple (6x6)
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