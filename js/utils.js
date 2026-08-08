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
    var arr = array.slice();
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}

export function calcularPorcentaje(actual, total) {
    if (total === 0) return 0;
    return Math.round((actual / total) * 100);
}

export function renderizarDado(valor) {
    var configs = {
        1: { puntos: [[50, 50]] },
        2: { puntos: [[25, 25], [75, 75]] },
        3: { puntos: [[25, 25], [50, 50], [75, 75]] },
        4: { puntos: [[25, 25], [75, 25], [25, 75], [75, 75]] },
        5: { puntos: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]] },
        6: { puntos: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]] }
    };
    
    var config = configs[valor] || configs[1];
    var puntos = config.puntos;
    var tamanoPunto = '20%';
    
    var html = '<div class="dado-visual" style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; background: #2d2d2d; border-radius: 8px; padding: 2px; box-sizing: border-box; position: relative;">';
    
    for (var i = 0; i < puntos.length; i++) {
        var x = puntos[i][0];
        var y = puntos[i][1];
        html += '<div style="position: absolute; left: ' + x + '%; top: ' + y + '%; transform: translate(-50%, -50%); background: white; border-radius: 50%; width: ' + tamanoPunto + '; height: ' + tamanoPunto + ';"></div>';
    }
    
    html += '</div>';
    return html;
}