import { configurarJuego } from './js/config.js';
import { initUI } from './js/ui.js';
import { mqttManager } from './mqtt.js';

// ===== DETECTAR MODO AUTOMATICO =====
const urlParams = new URLSearchParams(window.location.search);
const isAutoMode = urlParams.get('auto') === '1';
const AUTO_ROOM_CODE = 'GRIL';

// Variables globales
let myId = null;
let myName = '';
let modoJuego = 'solo';
let salaActual = null;

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar UI
    initUI();
    
    // Limpiar campo de nombre
    document.getElementById('playerName').value = '';
    
    // Exponer mqttManager globalmente
    window.__mqttManager = mqttManager;
    
    // Configurar juego con callbacks
    configurarJuego({
        getMyId: function() { return myId; },
        getMyName: function() { return myName; },
        getModoJuego: function() { return modoJuego; },
        getSalaActual: function() { return salaActual; },
        setMyId: function(id) { 
            myId = id; 
            window.__myId = id;
        },
        setMyName: function(nombre) { 
            myName = nombre;
            window.__myName = nombre;
        },
        setModoJuego: function(modo) { modoJuego = modo; },
        setSalaActual: function(sala) { salaActual = sala; },
        mqttManager: mqttManager
    });
});

// Exportar para uso en otros modulos
export {
    myId,
    myName,
    modoJuego,
    salaActual,
    isAutoMode,
    AUTO_ROOM_CODE
};