import { shuffleArray } from './utils.js';

const VALORES_DADOS = [1, 2, 3, 4, 5, 6];

// Formas simples
const FORMAS = {
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
const FORMAS_GRANDES = ['numeral','piramide','puente','torre','cangrejo','vista','punto','lupa','espiral','nave','ventana','perro','cactus','lagartija','escalera','escalera_invertida','cabra','flecha_arriba','flecha_abajo','persona'];

const FORMAS_GRANDES_DEF = {
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
    escalera: [{x:4,y:1},{x:3,y:2},{x:4,y:2},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4},{x:0,y:5},{x:1,y:5},{x:2,y:5},{x:3,y:5},{x:4,y:5}],
    escalera_invertida: [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:0,y:3},{x:1,y:3},{x:0,y:4}],
    cabra: [{x:1,y:0},{x:3,y:0},{x:1,y:1},{x:3,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:2,y:5}],
    flecha_arriba: [{x:2,y:0},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:0,y:3},{x:2,y:3},{x:4,y:3},{x:2,y:4},{x:2,y:5}],
    flecha_abajo: [{x:2,y:0},{x:2,y:1},{x:0,y:2},{x:2,y:2},{x:4,y:2},{x:0,y:3},{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:2,y:5}],
    persona: [{x:2,y:0},{x:4,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:0,y:2},{x:2,y:2},{x:2,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:0,y:5},{x:1,y:5},{x:3,y:5},{x:4,y:5}]
};

export function generarFigura(modo) {
    const formaLista = modo === 'grupal' ? FORMAS_GRANDES : Object.keys(FORMAS);
    const formaNombre = formaLista[Math.floor(Math.random() * formaLista.length)];
    const formaBase = modo === 'grupal' ? FORMAS_GRANDES_DEF[formaNombre] : FORMAS[formaNombre];
    
    if (!formaBase) return generarFiguraPorDefecto(modo);
    
    const celdas = formaBase.map(pos => ({
        x: pos.x,
        y: pos.y,
        valor: VALORES_DADOS[Math.floor(Math.random() * VALORES_DADOS.length)]
    }));
    
    const centro = encontrarCentro(celdas);
    const inicio = celdas.find(c => c.x === centro.x && c.y === centro.y) || celdas[0];
    
    return {
        id: 'fig-' + Math.random().toString(36).substring(2, 8),
        forma: formaNombre,
        celdas,
        inicio: { x: inicio.x, y: inicio.y },
        totalCeldas: celdas.length,
        completada: false
    };
}

function generarFiguraPorDefecto(modo) {
    const celdas = modo === 'grupal'
        ? [{x:0,y:0,valor:6},{x:1,y:0,valor:1},{x:2,y:0,valor:1},{x:0,y:1,valor:1},{x:1,y:1,valor:1},{x:2,y:1,valor:1},{x:0,y:2,valor:1},{x:1,y:2,valor:1},{x:2,y:2,valor:1},{x:3,y:0,valor:1},{x:3,y:1,valor:1},{x:3,y:2,valor:1}]
        : [{x:0,y:0,valor:6},{x:-1,y:0,valor:1},{x:1,y:0,valor:1},{x:0,y:-1,valor:1},{x:0,y:1,valor:1}];
    
    return {
        id: 'fig-' + Math.random().toString(36).substring(2, 8),
        forma: modo === 'grupal' ? 'rectangulo' : 'cruz',
        celdas,
        inicio: { x: 0, y: 0 },
        totalCeldas: celdas.length,
        completada: false
    };
}

function encontrarCentro(celdas) {
    const xs = celdas.map(c => c.x);
    const ys = celdas.map(c => c.y);
    return {
        x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
        y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2)
    };
}

export function obtenerProgreso(figura, celdasColocadas) {
    if (!figura) return { actual: 0, total: 0, porcentaje: 0 };
    
    const total = figura.celdas.length;
    const colocadasIds = new Set(celdasColocadas.map(c => `${c.x},${c.y}`));
    const actual = figura.celdas.filter(c => colocadasIds.has(`${c.x},${c.y}`)).length;
    
    return { actual, total, porcentaje: total > 0 ? Math.round((actual / total) * 100) : 0 };
}