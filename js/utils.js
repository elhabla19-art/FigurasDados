// utils.js

export function generarId() {
    return Math.random().toString(36).substring(2, 11);
}

export function generarIdCorto() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function clonarObjeto(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export function shuffleArray(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function calcularPorcentaje(actual, total) {
    if (total === 0) return 0;
    return Math.round((actual / total) * 100);
}

export function renderizarDado(valor) {
    // Configuración de puntos con posiciones relativas (0-100%)
    const configs = {
        1: { puntos: [[50, 50]] },
        2: { puntos: [[25, 25], [75, 75]] },
        3: { puntos: [[25, 25], [50, 50], [75, 75]] },
        4: { puntos: [[25, 25], [75, 25], [25, 75], [75, 75]] },
        5: { puntos: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]] },
        6: { puntos: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]] }
    };
    
    const config = configs[valor] || configs[1];
    const puntos = config.puntos;
    const tamanoPunto = '20%';
    
    let html = `<div class="dado-visual" style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; background: #2d2d2d; border-radius: 8px; padding: 2px; box-sizing: border-box; position: relative;">`;
    
    for (const [x, y] of puntos) {
        html += `<div style="position: absolute; left: ${x}%; top: ${y}%; transform: translate(-50%, -50%); background: white; border-radius: 50%; width: ${tamanoPunto}; height: ${tamanoPunto};"></div>`;
    }
    
    html += `</div>`;
    return html;
}