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

// ===== FIGURAS SIMPLES (3-10 DADOS) =====

// Tipos de formas disponibles para modo simple
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

// Definiciones de formas simples
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

// ===== FIGURAS GRANDES PARA MODO GRUPAL (20 DADOS CADA UNA - MATRIZ 6x5) =====

// Formas grandes disponibles
var FORMAS_GRANDES = [
    'numeral',
    'piramide',
    'puente',
    'torre',
    'cangrejo',
    'vista',
    'punto',
    'lupa',
    'espiral',
    'nave',
    'ventana',
    'perro',
    'cactus',
    'lagartija',
    'escalera',
    'escalera_invertida',
    'cabra',
    'flecha_arriba',
    'flecha_abajo',
    'persona'
];

// Definiciones de formas grandes - Cada una es una matriz de 6 filas x 5 columnas
// Los 1 representan celdas ocupadas, los 0 son espacios vacíos
// La coordenada (0,0) es la esquina superior izquierda
var FORMAS_GRANDES_DEF = {
    // 0	1	0	1	0
    // 1	1	1	1	1
    // 0	1	0	1	0
    // 0	1	0	1	0
    // 1	1	1	1	1
    // 0	1	0	1	0
    numeral: [
        { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 4, y: 0 },
        { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
        { x: 2, y: 2 }, { x: 4, y: 2 },
        { x: 2, y: 3 }, { x: 4, y: 3 },
        { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
        { x: 2, y: 5 }, { x: 4, y: 5 }
    ],
    // 0	0	0	0	0
    // 0	0	1	0	0
    // 0	1	1	1	0
    // 0	1	1	1	0
    // 1	1	1	1	1
    // 1	1	1	1	1
    piramide: [
        { x: 2, y: 1 },
        { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
        { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
        { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
        { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }
    ],
    // 0	0	0	0	0
    // 0	1	0	1	0
    // 0	1	1	1	0
    // 0	1	0	1	0
    // 1	1	1	1	1
    // 0	1	0	1	0
    puente: [
        { x: 1, y: 1 }, { x: 3, y: 1 },
        { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
        { x: 1, y: 3 }, { x: 3, y: 3 },
        { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
        { x: 1, y: 5 }, { x: 3, y: 5 }
    ],
    // 0	1	0	1	0
    // 1	1	1	1	1
    // 0	1	0	1	0
    // 0	1	1	1	0
    // 0	1	0	1	0
    // 0	1	1	1	0
    torre: [
        { x: 1, y: 0 }, { x: 3, y: 0 },
        { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
        { x: 1, y: 2 }, { x: 3, y: 2 },
        { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
        { x: 1, y: 4 }, { x: 3, y: 4 },
        { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }
    ],
    // 0	0	0	0	0
    // 1	0	0	0	1
    // 1	1	1	1	1
    // 0	1	1	1	0
    // 1	1	1	1	1
    // 1	0	0	0	1
    cangrejo: [
        { x: 0, y: 1 }, { x: 4, y: 1 },
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
        { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
        { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
        { x: 0, y: 5 }, { x: 4, y: 5 }
    ],
    // 1	1	1	1	1
    // 1	0	1	0	1
    // 1	0	1	0	1
    // 1	0	1	0	1
    // 1	0	1	0	1
    // 1	1	1	1	1
    vista: [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
        { x: 0, y: 1 }, { x: 2, y: 1 }, { x: 4, y: 1 },
        { x: 0, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 2 },
        { x: 0, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 },
        { x: 0, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 4 },
        { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }
    ],
    // 0	0	0	0	0
    // 0	0	1	0	0
    // 0	1	1	1	0
    // 1	1	1	1	1
    // 0	1	1	1	0
    // 0	0	1	0	0
    punto: [
        { x: 2, y: 1 },
        { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
        { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
        { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
        { x: 2, y: 5 }
    ],
    // 1	1	1	1	1
    // 1	0	0	0	1
    // 1	0	0	0	1
    // 1	1	1	1	1
    // 0	0	1	0	0
    // 1	1	1	1	1
    lupa: [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
        { x: 0, y: 1 }, { x: 4, y: 1 },
        { x: 0, y: 2 }, { x: 4, y: 2 },
        { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
        { x: 2, y: 4 },
        { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }
    ],
    // 1	1	1	1	1
    // 0	0	0	0	1
    // 1	1	1	0	1
    // 1	0	1	0	1
    // 1	0	0	0	1
    // 1	1	1	1	1
    espiral: [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
        { x: 4, y: 1 },
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 2 },
        { x: 0, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 },
        { x: 0, y: 4 }, { x: 4, y: 4 },
        { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }
    ],
    // 0	0	1	0	0
    // 0	0	1	0	0
    // 0	1	1	1	0
    // 0	1	1	1	0
    // 1	1	1	1	1
    // 0	1	1	1	0
    nave: [
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
        { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
        { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
        { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }
    ],
    // 1	1	1	1	1
    // 1	0	1	0	1
    // 1	0	1	1	1
    // 1	1	1	0	1
    // 1	0	1	0	1
    // 1	1	1	1	1
    ventana: [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
        { x: 0, y: 1 }, { x: 2, y: 1 }, { x: 4, y: 1 },
        { x: 0, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
        { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 },
        { x: 0, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 4 },
        { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }
    ],
    // 0	0	0	0	0
    // 0	1	0	0	0
    // 1	1	0	0	0
    // 0	1	1	1	1
    // 0	1	0	0	1
    // 0	1	0	0	1
    perro: [
        { x: 1, y: 1 },
        { x: 0, y: 2 }, { x: 1, y: 2 },
        { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
        { x: 1, y: 4 }, { x: 4, y: 4 },
        { x: 1, y: 5 }, { x: 4, y: 5 }
    ],
    // 1	0	1	0	1
    // 1	0	1	0	1
    // 1	1	1	1	1
    // 0	0	1	0	0
    // 0	0	1	0	0
    // 0	0	1	0	0
    cactus: [
        { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 4, y: 0 },
        { x: 0, y: 1 }, { x: 2, y: 1 }, { x: 4, y: 1 },
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
        { x: 2, y: 3 },
        { x: 2, y: 4 },
        { x: 2, y: 5 }
    ],
    // 1	0	1	0	1
    // 1	1	1	1	1
    // 0	0	1	0	0
    // 0	0	1	0	0
    // 1	1	1	1	1
    // 1	0	1	0	1
    lagartija: [
        { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 4, y: 0 },
        { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
        { x: 0, y: 5 }, { x: 2, y: 5 }, { x: 4, y: 5 }
    ],
    // 0	0	0	0	0
    // 0	0	0	0	1
    // 0	0	0	1	1
    // 0	0	1	1	1
    // 0	1	1	1	1
    // 1	1	1	1	1
    escalera: [
        { x: 4, y: 1 },
        { x: 3, y: 2 }, { x: 4, y: 2 },
        { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
        { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
        { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }
    ],
    // 1	1	1	1	1
    // 1	1	1	1	0
    // 1	1	1	0	0
    // 1	1	0	0	0
    // 1	0	0	0	0
    // 0	0	0	0	0
    escalera_invertida: [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
        { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
        { x: 0, y: 3 }, { x: 1, y: 3 },
        { x: 0, y: 4 }
    ],
    // 0	1	0	1	0
    // 0	1	0	1	0
    // 1	1	1	1	1
    // 1	1	1	1	1
    // 0	1	1	1	0
    // 0	0	1	0	0
    cabra: [
        { x: 1, y: 0 }, { x: 3, y: 0 },
        { x: 1, y: 1 }, { x: 3, y: 1 },
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
        { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
        { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
        { x: 2, y: 5 }
    ],
    // 0	0	1	0	0
    // 0	1	1	1	0
    // 1	1	1	1	1
    // 1	0	1	0	1
    // 0	0	1	0	0
    // 0	0	1	0	0
    flecha_arriba: [
        { x: 2, y: 0 },
        { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
        { x: 0, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 },
        { x: 2, y: 4 },
        { x: 2, y: 5 }
    ],
    // 0	0	1	0	0
    // 0	0	1	0	0
    // 1	0	1	0	1
    // 1	1	1	1	1
    // 0	1	1	1	0
    // 0	0	1	0	0
    flecha_abajo: [
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 0, y: 2 }, { x: 2, y: 2 }, { x: 4, y: 2 },
        { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 },
        { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
        { x: 2, y: 5 }
    ],
    // 0	0	1	0	1
    // 1	1	1	1	1
    // 1	0	1	0	0
    // 0	0	1	0	0
    // 0	1	1	1	0
    // 1	1	0	1	1
    persona: [
        { x: 2, y: 0 }, { x: 4, y: 0 },
        { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
        { x: 0, y: 2 }, { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 },
        { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }
    ]
};

// ===== FUNCIONES PRINCIPALES =====

function generarFigura(modo) {
    var formaNombre, formaBase;
    
    if (modo === 'grupal') {
        // Usar figuras grandes (20 dados cada una - matriz 6x5)
        formaNombre = FORMAS_GRANDES[Math.floor(Math.random() * FORMAS_GRANDES.length)];
        formaBase = FORMAS_GRANDES_DEF[formaNombre];
    } else {
        // Usar figuras normales (3-10 dados)
        formaNombre = FORMAS_DISPONIBLES[Math.floor(Math.random() * FORMAS_DISPONIBLES.length)];
        formaBase = FORMAS[formaNombre];
    }
    
    if (!formaBase) {
        return generarFiguraPorDefecto(modo);
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

function generarFiguraPorDefecto(modo) {
    var celdas;
    if (modo === 'grupal') {
        celdas = [
            { x: 0, y: 0, valor: 6 }, { x: 1, y: 0, valor: 1 }, { x: 2, y: 0, valor: 1 },
            { x: 0, y: 1, valor: 1 }, { x: 1, y: 1, valor: 1 }, { x: 2, y: 1, valor: 1 },
            { x: 0, y: 2, valor: 1 }, { x: 1, y: 2, valor: 1 }, { x: 2, y: 2, valor: 1 },
            { x: 3, y: 0, valor: 1 }, { x: 3, y: 1, valor: 1 }, { x: 3, y: 2, valor: 1 }
        ];
    } else {
        celdas = [
            { x: 0, y: 0, valor: 6 },
            { x: -1, y: 0, valor: 1 },
            { x: 1, y: 0, valor: 1 },
            { x: 0, y: -1, valor: 1 },
            { x: 0, y: 1, valor: 1 }
        ];
    }
    
    return {
        id: generarIdFigura(),
        forma: modo === 'grupal' ? 'rectangulo' : 'cruz',
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

function obtenerFormasGrandesDisponibles() {
    return FORMAS_GRANDES.slice();
}

function obtenerFormaGrandePorNombre(nombre) {
    return FORMAS_GRANDES_DEF[nombre] || null;
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
    obtenerFormasGrandesDisponibles,
    obtenerFormaGrandePorNombre,
    VALORES_DADOS,
    NUMERO_MINIMO_DADOS,
    NUMERO_MAXIMO_DADOS
};