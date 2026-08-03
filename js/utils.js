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

// Solo exportamos lo que realmente se usa