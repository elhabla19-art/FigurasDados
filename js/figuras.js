import {
    clonarObjeto,
    sonAdyacentes,
    obtenerCoordenadaId,
    shuffleArray
} from './utils.js';

// Constantes
var VALORES_DADOS = [1, 2, 3, 4, 5, 6];
var NUMERO_MINIMO_DADOS = 3;
var NUMERO_MAXIMO_DADOS = 10;

// Tipos de formas disponibles
var FORMAS_DISPONIBLES = [
    'linea',
    'linea_larga',
    'cruz',
    'cruz_grande',
    'L',
    'L_invertida',
    'T',
    'T_invertida',
    'cuadrado',
    'rectangulo',
    'zigzag',
    'zigzag_largo',
    'escalera',
    'escalera_invertida',
    'diamante',
    'estrella'
];

// Definiciones de formas
var FORMAS = {
    linea: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 }
    ],
    linea_larga: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 }
    ],
    cruz: [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 }
    ],
    cruz_grande: [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -2, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: -2 },
        { x: 0, y: 2 }
    ],
    L: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 }
    ],
    L_invertida: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 }
    ],
    T: [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 }
    ],
    T_invertida: [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: -2 }
    ],
    cuadrado: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
    ],
    rectangulo: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 }
    ],
    zigzag: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 2 }
    ],
    zigzag_largo: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 3, y: 3 }
    ],
    escalera: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 2 }
    ],
    escalera_invertida: [
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 0 },
        { x: 3, y: 0 }
    ],
    diamante: [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 1 },
        { x: 1, y: 1 },
        { x: -1, y: -1 },
        { x: 1, y: -1 }
    ],
    estrella: [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: -1, y: 1 },
        { x: 1, y: 1 }
    ]
};

// Funciones principales

function generarFigura() {
    var formaNombre = FORMAS_DISPONIBLES[Math.floor(Math.random() * FORMAS_DISPONIBLES.length)];
    var formaBase = FORMAS[formaNombre];
    
    if (!formaBase) {
        return generarFiguraPorDefecto();
    }
    
    var celdas = formaBase.map(function(pos) {
        var valor = VALORES_DADOS[Math.floor(Math.random() * VALORES_DADOS.length)];
        return {
            x: pos.x,
            y: pos.y,
            valor: valor
        };
    });
    
    var centro = encontrarCentro(celdas);
    var inicio = celdas.find(function(c) { return c.x === centro.x && c.y === centro.y; }) || celdas[0];
    
    return {
        id: generarIdFigura(),
        forma: formaNombre,
        celdas: celdas,
        inicio: { x: inicio.x, y: inicio.y },
        totalCeldas: celdas.length,
        completada: false
    };
}

function generarFiguraPorDefecto() {
    var celdas = [
        { x: 0, y: 0, valor: 6 },
        { x: -1, y: 0, valor: 1 },
        { x: 1, y: 0, valor: 1 },
        { x: 0, y: -1, valor: 1 },
        { x: 0, y: 1, valor: 1 }
    ];
    
    return {
        id: generarIdFigura(),
        forma: 'cruz',
        celdas: celdas,
        inicio: { x: 0, y: 0 },
        totalCeldas: celdas.length,
        completada: false
    };
}

function generarIdFigura() {
    return 'fig-' + Math.random().toString(36).substring(2, 8);
}

function encontrarCentro(celdas) {
    var xs = celdas.map(function(c) { return c.x; });
    var ys = celdas.map(function(c) { return c.y; });
    var minX = Math.min.apply(null, xs);
    var maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys);
    var maxY = Math.max.apply(null, ys);
    var centroX = Math.round((minX + maxX) / 2);
    var centroY = Math.round((minY + maxY) / 2);
    return { x: centroX, y: centroY };
}

function obtenerCeldasDisponibles(figura, celdasColocadas) {
    if (!figura || !figura.celdas) return [];
    
    var colocadasIds = new Set(celdasColocadas.map(function(c) { return obtenerCoordenadaId(c.x, c.y); }));
    var disponibles = [];
    
    for (var i = 0; i < figura.celdas.length; i++) {
        var celda = figura.celdas[i];
        var id = obtenerCoordenadaId(celda.x, celda.y);
        if (colocadasIds.has(id)) continue;
        
        var esAdyacente = false;
        for (var j = 0; j < celdasColocadas.length; j++) {
            var colocada = celdasColocadas[j];
            if (sonAdyacentes(celda.x, celda.y, colocada.x, colocada.y)) {
                esAdyacente = true;
                break;
            }
        }
        
        if (esAdyacente || celdasColocadas.length === 0) {
            disponibles.push({ x: celda.x, y: celda.y, valor: celda.valor });
        }
    }
    
    return disponibles;
}

function esColocacionValida(figura, celdasColocadas, nuevaCelda) {
    if (!figura || !figura.celdas) return false;
    
    var existe = figura.celdas.some(function(c) { return c.x === nuevaCelda.x && c.y === nuevaCelda.y; });
    if (!existe) return false;
    
    var yaColocada = celdasColocadas.some(function(c) { return c.x === nuevaCelda.x && c.y === nuevaCelda.y; });
    if (yaColocada) return false;
    
    if (celdasColocadas.length === 0) {
        return nuevaCelda.x === figura.inicio.x && nuevaCelda.y === figura.inicio.y;
    }
    
    return celdasColocadas.some(function(c) {
        return sonAdyacentes(c.x, c.y, nuevaCelda.x, nuevaCelda.y);
    });
}

function figuraCompletada(figura, celdasColocadas) {
    if (!figura || !figura.celdas) return false;
    
    var totalCeldas = figura.celdas.length;
    var colocadasIds = new Set(celdasColocadas.map(function(c) { return obtenerCoordenadaId(c.x, c.y); }));
    
    for (var i = 0; i < figura.celdas.length; i++) {
        var celda = figura.celdas[i];
        var id = obtenerCoordenadaId(celda.x, celda.y);
        if (!colocadasIds.has(id)) return false;
    }
    
    return totalCeldas === celdasColocadas.length;
}

function obtenerProgreso(figura, celdasColocadas) {
    if (!figura) return { actual: 0, total: 0, porcentaje: 0 };
    
    var total = figura.celdas.length;
    var colocadasIds = new Set(celdasColocadas.map(function(c) { return obtenerCoordenadaId(c.x, c.y); }));
    var actual = 0;
    
    for (var i = 0; i < figura.celdas.length; i++) {
        var celda = figura.celdas[i];
        var id = obtenerCoordenadaId(celda.x, celda.y);
        if (colocadasIds.has(id)) actual++;
    }
    
    var porcentaje = total > 0 ? Math.round((actual / total) * 100) : 0;
    return { actual: actual, total: total, porcentaje: porcentaje };
}

function normalizarFigura(figura) {
    var celdas = figura.celdas.map(function(c) { return { x: c.x, y: c.y, valor: c.valor }; });
    var inicio = { x: figura.inicio.x, y: figura.inicio.y };
    
    return {
        id: figura.id,
        forma: figura.forma,
        celdas: celdas,
        inicio: inicio,
        totalCeldas: celdas.length,
        completada: figura.completada || false
    };
}

function obtenerFormasDisponibles() {
    return FORMAS_DISPONIBLES.slice();
}

function obtenerFormaPorNombre(nombre) {
    return FORMAS[nombre] || null;
}

// Exportar para usar en otros modulos
export {
    generarFigura,
    obtenerCeldasDisponibles,
    esColocacionValida,
    figuraCompletada,
    obtenerProgreso,
    normalizarFigura,
    obtenerFormasDisponibles,
    obtenerFormaPorNombre,
    VALORES_DADOS,
    NUMERO_MINIMO_DADOS,
    NUMERO_MAXIMO_DADOS
};