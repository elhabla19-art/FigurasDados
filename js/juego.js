import { generarFigura } from './figuras.js';
import { deshacerManager } from './deshacer.js';

class JuegoManager {
    constructor() {
        this.estado = {
            jugadorId: null,
            figuraActual: null,
            celdasColocadas: [],
            completado: false,
            enJuego: false
        };
        this.observers = [];
        this.ultimoEstadoHash = null;
    }

    setJugadorId(id) {
        this.estado.jugadorId = id;
    }

    iniciarVacio() {
        this.estado.figuraActual = null;
        this.estado.celdasColocadas = [];
        this.estado.completado = false;
        this.estado.enJuego = true;
        this.ultimoEstadoHash = null;
        deshacerManager.limpiarHistorial();
        this.notificar();
    }

    iniciarFigura(modo) {
        var figura = generarFigura(modo);
        this.estado.figuraActual = figura;
        this.estado.celdasColocadas = [];
        this.estado.completado = false;
        this.estado.enJuego = true;
        this.ultimoEstadoHash = null;
        deshacerManager.limpiarHistorial();
        this.notificar();
        return figura;
    }

    colocarDado(x, y) {
        if (!this.estado.enJuego || this.estado.completado) return false;
        if (!this.estado.figuraActual) return false;
        
        var valor = this.obtenerValorCelda(x, y);
        if (valor === null) return false;
        
        // Verificar si ya está colocada
        for (var i = 0; i < this.estado.celdasColocadas.length; i++) {
            if (this.estado.celdasColocadas[i].x === x && this.estado.celdasColocadas[i].y === y) {
                return false;
            }
        }
        
        // Verificar que la celda pertenece a la figura
        var pertenece = false;
        var celdasFigura = this.estado.figuraActual.celdas || [];
        for (var j = 0; j < celdasFigura.length; j++) {
            if (celdasFigura[j].x === x && celdasFigura[j].y === y) {
                pertenece = true;
                break;
            }
        }
        if (!pertenece) return false;
        
        var nuevaCelda = { x: x, y: y, valor: valor };
        this.estado.celdasColocadas.push(nuevaCelda);
        
        deshacerManager.pushAccion({
            tipo: 'colocar',
            celda: nuevaCelda,
            figuraId: this.estado.figuraActual.id
        });
        
        // Verificar completado
        var totalCeldas = celdasFigura.length;
        if (this.estado.celdasColocadas.length === totalCeldas) {
            this.estado.completado = true;
        }
        
        this.ultimoEstadoHash = null;
        this.notificar();
        return true;
    }

    deshacerCelda(x, y) {
        if (!this.estado.enJuego || this.estado.completado) return false;
        if (!this.estado.figuraActual) return false;
        
        var celdas = this.estado.celdasColocadas;
        var index = -1;
        for (var i = 0; i < celdas.length; i++) {
            if (celdas[i].x === x && celdas[i].y === y) {
                index = i;
                break;
            }
        }
        
        if (index === -1) return false;
        
        // LIFO: solo se puede deshacer la última celda colocada
        if (index !== celdas.length - 1) return false;
        
        celdas.splice(index, 1);
        
        // Limpiar del historial
        var historial = deshacerManager.obtenerHistorial();
        for (var j = historial.length - 1; j >= 0; j--) {
            if (historial[j].tipo === 'colocar' && 
                historial[j].celda.x === x && 
                historial[j].celda.y === y) {
                historial.splice(j, 1);
                break;
            }
        }
        
        this.estado.completado = false;
        this.ultimoEstadoHash = null;
        this.notificar();
        return true;
    }

    obtenerValorCelda(x, y) {
        if (!this.estado.figuraActual) return null;
        var celdas = this.estado.figuraActual.celdas || [];
        for (var i = 0; i < celdas.length; i++) {
            if (celdas[i].x === x && celdas[i].y === y) {
                return celdas[i].valor;
            }
        }
        return null;
    }

    esCeldaColocada(x, y) {
        for (var i = 0; i < this.estado.celdasColocadas.length; i++) {
            if (this.estado.celdasColocadas[i].x === x && this.estado.celdasColocadas[i].y === y) {
                return true;
            }
        }
        return false;
    }

    esCeldaDeFigura(x, y) {
        if (!this.estado.figuraActual) return false;
        var celdas = this.estado.figuraActual.celdas || [];
        for (var i = 0; i < celdas.length; i++) {
            if (celdas[i].x === x && celdas[i].y === y) {
                return true;
            }
        }
        return false;
    }

    obtenerEstado() {
        return {
            figuraActual: this.estado.figuraActual,
            celdasColocadas: this.estado.celdasColocadas.slice(),
            completado: this.estado.completado,
            enJuego: this.estado.enJuego
        };
    }

    suscribir(callback) {
        this.observers.push(callback);
    }

    notificar() {
        var data = this.obtenerEstado();
        
        var figuraId = data.figuraActual ? data.figuraActual.id : null;
        var celdasStr = data.celdasColocadas.map(function(c) { return c.x + ',' + c.y; }).sort().join('|');
        var hash = JSON.stringify({
            figuraId: figuraId,
            celdas: celdasStr,
            completado: data.completado
        });
        
        if (this.ultimoEstadoHash !== hash) {
            this.ultimoEstadoHash = hash;
            for (var i = 0; i < this.observers.length; i++) {
                this.observers[i](data);
            }
        }
    }
}

export var juegoManager = new JuegoManager();