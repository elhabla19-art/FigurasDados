// Funciones utilitarias

function generarId() {
    return Math.random().toString(36).substring(2, 11);
}

function generarIdCorto() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function clonarObjeto(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function arraysIguales(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

function formatearFecha(timestamp) {
    const fecha = new Date(timestamp);
    return fecha.toLocaleTimeString();
}

function calcularPorcentaje(actual, total) {
    if (total === 0) return 0;
    return Math.round((actual / total) * 100);
}

function esNumero(valor) {
    return !isNaN(parseFloat(valor)) && isFinite(valor);
}

function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

function generarColorAleatorio() {
    const colores = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#ff6f00'];
    return colores[Math.floor(Math.random() * colores.length)];
}

function obtenerCoordenadaId(x, y) {
    return x + ',' + y;
}

function parseCoordenadaId(id) {
    const partes = id.split(',');
    return { x: parseInt(partes[0]), y: parseInt(partes[1]) };
}

function distanciaManhattan(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function sonAdyacentes(x1, y1, x2, y2) {
    return distanciaManhattan(x1, y1, x2, y2) === 1;
}

function estaEnRango(valor, min, max) {
    return valor >= min && valor <= max;
}

function limitarNumero(valor, min, max) {
    return Math.min(Math.max(valor, min), max);
}

function sumarPuntos(array) {
    return array.reduce(function(a, b) { return a + b; }, 0);
}

function maximoArray(array) {
    return Math.max.apply(null, array);
}

function minimoArray(array) {
    return Math.min.apply(null, array);
}

function obtenerValorUnico(array, key) {
    var valores = array.map(function(item) { return item[key]; });
    return [...new Set(valores)];
}

function groupBy(array, key) {
    return array.reduce(function(result, item) {
        var valor = item[key];
        if (!result[valor]) {
            result[valor] = [];
        }
        result[valor].push(item);
        return result;
    }, {});
}

function sleep(ms) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, ms); 
    });
}

function debounce(func, wait) {
    var timeout;
    return function executedFunction() {
        var args = arguments;
        var later = function() {
            clearTimeout(timeout);
            func.apply(null, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function shuffleArray(array) {
    var arr = array.slice();
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}

// Exportar para usar en otros modulos
export {
    generarId,
    generarIdCorto,
    clonarObjeto,
    arraysIguales,
    formatearFecha,
    calcularPorcentaje,
    esNumero,
    capitalizar,
    generarColorAleatorio,
    obtenerCoordenadaId,
    parseCoordenadaId,
    distanciaManhattan,
    sonAdyacentes,
    estaEnRango,
    limitarNumero,
    sumarPuntos,
    maximoArray,
    minimoArray,
    obtenerValorUnico,
    groupBy,
    sleep,
    debounce,
    shuffleArray
};