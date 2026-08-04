import { juegoManager } from './juego.js';
import { leaderboardManager } from './leaderboard.js';
import { zoomManager, mostrarZoom, actualizarZoomDirecto } from './zoom.js';
import { 
    renderizarTablero, 
    renderizarLeaderboard, 
    actualizarUI,
    mostrarModalLobby,
    mostrarLoading,
    ocultarLoading
} from './ui.js';
import { mqttManager } from '../mqtt.js';
import { generarIdCorto, clonarObjeto } from './utils.js';

// ===== DETECTAR MODO AUTOMATICO =====
const urlParams = new URLSearchParams(window.location.search);
const isAutoMode = urlParams.get('auto') === '1';
const AUTO_ROOM_CODE = 'GRIL';

// Configuración
let config = {
    myId: null,
    myName: 'Jugador',
    modoJuego: 'solo',
    salaActual: null,
    intervaloPublicacion: null
};

// Referencias a botones
let btnFiguraSimple, btnFiguraGrupal;

// Flag para controlar sincronización y evitar bucles
let sincronizando = false;
let ultimoEstadoRecibido = null;

// Se activa cuando CUALQUIER jugador completa una figura simple (propia o remota).
// Las figuras simples se transmiten a toda la sala (todos juegan la misma figura),
// así que en cuanto alguien la resuelve, todos deben poder iniciar una nueva ronda,
// no solo quien la completó primero. Se reinicia a false cada vez que arranca una
// ronda nueva (simple o grupal).
let simpleDesbloqueado = false;

// ===== CONFIGURACIÓN PRINCIPAL =====
export function configurarJuego(opciones) {
    config.myId = opciones.getMyId();
    config.myName = opciones.getMyName();
    config.modoJuego = opciones.getModoJuego();
    config.salaActual = opciones.getSalaActual();
    
    window.__mqttManager = mqttManager;
    window.__myId = config.myId;
    window.__myName = config.myName;
    
    btnFiguraSimple = document.getElementById('btnFiguraSimple');
    btnFiguraGrupal = document.getElementById('btnFiguraGrupal');
    
    configurarObservers();
    configurarEventos(opciones);
    actualizarBotonesFigura();
}

// ===== OBSERVERS =====
function configurarObservers() {
    juegoManager.suscribir(estado => {
        renderizarTablero(estado);
        actualizarUI(estado);
        actualizarBotonesFigura();
        if (config.modoJuego === 'multi' && mqttManager.isConnected() && !sincronizando) {
            publicarCambioLocal(estado);
        }
    });
    
    leaderboardManager.suscribir(renderizarLeaderboard);
    mqttManager.suscribir(manejarMensajeMQTT);
    zoomManager.registrarZoomCallback(actualizarZoomDirecto);
}

// ===== PUBLICACIÓN DE ESTADO =====
function publicarCambioLocal(estado) {
    // No publicar si estamos en medio de una sincronización
    if (sincronizando) return;
    
    const jugador = leaderboardManager.obtenerJugador(config.myId);
    const payload = {
        nombre: config.myName,
        figura: estado.figuraActual,
        celdas: estado.celdasColocadas,
        estado: estado.completado ? 'completado' : 'jugando',
        puntos: jugador?.puntos || 0,
        puntosSimples: jugador?.puntosSimples || 0,
        puntosGrupales: jugador?.puntosGrupales || 0,
        figurasCompletadas: jugador?.figurasCompletadas || 0,
        modoFigura: estado.modoFigura || 'simple'
    };
    
    // SIEMPRE enviar datos grupales si estamos en modo grupal.
    // Se envía el registro de eventos (colocar/deshacer) con timestamp, no solo
    // el estado actual, para que la fusión en el receptor sea "last-write-wins"
    // y tanto colocaciones como borrados (deshacer/reinicio) se propaguen bien.
    if (estado.modoFigura === 'grupal') {
        payload.registroCeldas = juegoManager.obtenerRegistroCeldas();
        payload.figura = estado.figuraActual;
    }
    
    mqttManager.publicarEstado(payload);
}

function publicarEstadoCompleto() {
    if (sincronizando) return;
    const estado = juegoManager.obtenerEstado();
    publicarCambioLocal(estado);
}

// ===== ACTUALIZACIÓN DE BOTONES =====
function actualizarBotonesFigura() {
    const estado = juegoManager.obtenerEstado();
    const bloqueado = estado.figuraActual !== null && !estado.completado && !simpleDesbloqueado;
    
    [btnFiguraSimple, btnFiguraGrupal].forEach(btn => {
        if (btn) {
            btn.disabled = bloqueado;
            btn.style.opacity = bloqueado ? '0.5' : '1';
            btn.style.cursor = bloqueado ? 'not-allowed' : 'pointer';
        }
    });
}

// ===== EVENTOS =====
function configurarEventos(opciones) {
    document.getElementById('playerName').value = '';
    
    // Crear Sala
    document.getElementById('btnCrearSala').addEventListener('click', () => {
        config.myName = document.getElementById('playerName').value.trim() || 'Jugador';
        config.salaActual = generarIdCorto();
        config.modoJuego = 'multi';
        config.myId = 'player_' + Math.random().toString(36).substring(2, 10);
        actualizarIds(opciones);
        conectarSala(config.salaActual);
    });
    
    // Unirse a Sala - MODIFICADO CON MODO AUTOMATICO
    document.getElementById('btnUnirse').addEventListener('click', () => {
        const roomInput = document.getElementById('roomCodeInput');
        
        // Si estamos en modo automatico, precargar el codigo
        if (isAutoMode) {
            if (roomInput) {
                roomInput.value = AUTO_ROOM_CODE;
                roomInput.readOnly = true;
                roomInput.style.opacity = '0.7';
                roomInput.style.color = '#4CAF50';
            }
        } else {
            if (roomInput) {
                roomInput.value = '';
                roomInput.readOnly = false;
                roomInput.style.opacity = '1';
                roomInput.style.color = 'white';
            }
        }
        
        document.getElementById('joinModal').style.display = 'flex';
        document.getElementById('lobbyModal').style.display = 'none';
    });
    
    // Entrar a Sala - MODIFICADO CON MODO AUTOMATICO
    document.getElementById('btnEntrar').addEventListener('click', () => {
        config.myName = document.getElementById('playerName').value.trim() || 'Jugador';
        let codigo;
        
        if (isAutoMode) {
            codigo = AUTO_ROOM_CODE;
        } else {
            codigo = document.getElementById('roomCodeInput').value.trim().toUpperCase();
            if (codigo.length !== 4) {
                alert('El código debe tener 4 caracteres');
                return;
            }
        }
        
        config.salaActual = codigo;
        config.modoJuego = 'multi';
        config.myId = 'player_' + Math.random().toString(36).substring(2, 10);
        actualizarIds(opciones);
        conectarSala(codigo);
    });
    
    // Volver al Lobby - MODIFICADO PARA LIMPIAR CAMPO
    document.getElementById('btnVolver').addEventListener('click', () => {
        const roomInput = document.getElementById('roomCodeInput');
        if (roomInput) {
            roomInput.value = '';
            roomInput.placeholder = 'ABCD';
            roomInput.readOnly = false;
            roomInput.style.opacity = '1';
            roomInput.style.color = 'white';
        }
        mostrarModalLobby();
    });
    
    // Jugar Solo
    document.getElementById('btnJugarSolo').addEventListener('click', () => {
        config.myName = document.getElementById('playerName').value.trim() || 'Jugador';
        config.modoJuego = 'solo';
        config.myId = 'solo_' + Math.random().toString(36).substring(2, 10);
        config.salaActual = null;
        actualizarIds(opciones);
        iniciarJuegoSolo();
    });
    
    // Figura Simple
    document.getElementById('btnFiguraSimple').addEventListener('click', () => {
        const estado = juegoManager.obtenerEstado();
        if (estado.figuraActual && !estado.completado && !simpleDesbloqueado) return;
        
        const figura = juegoManager.iniciarModoSimple(config.myId);
        simpleDesbloqueado = false; // arranca una ronda nueva, vuelve a bloquear hasta que se resuelva
        
        if (config.modoJuego === 'multi' && mqttManager.isConnected()) {
            mqttManager.publicarFiguraGrupal({
                figura,
                modo: 'simple',
                generadaPor: config.myId,
                nombreGenerador: config.myName
            });
            setTimeout(publicarEstadoCompleto, 150);
        }
        
        actualizarUIYBotones();
    });
    
    // Figura Grupal
    document.getElementById('btnFiguraGrupal').addEventListener('click', () => {
        if (config.modoJuego !== 'multi') {
            alert('El modo grupal solo está disponible en multijugador');
            return;
        }
        
        const estado = juegoManager.obtenerEstado();
        if (estado.figuraActual && !estado.completado && !simpleDesbloqueado) return;
        
        const figura = juegoManager.iniciarModoGrupal(config.myId);
        simpleDesbloqueado = false; // arranca una ronda nueva, vuelve a bloquear hasta que se resuelva
        
        if (mqttManager.isConnected()) {
            mqttManager.publicarFiguraGrupal({
                figura,
                modo: 'grupal',
                generadaPor: config.myId,
                nombreGenerador: config.myName
            });
            setTimeout(publicarEstadoCompleto, 150);
        }
        
        actualizarUIYBotones();
    });
    
    // Reiniciar
    document.getElementById('btnReiniciar').addEventListener('click', () => {
        const estado = juegoManager.obtenerEstado();
        if (!estado.figuraActual || estado.celdasColocadas.length === 0) {
            alert(estado.figuraActual ? 'No hay celdas colocadas para reiniciar' : 'No hay figura activa');
            return;
        }
        document.getElementById('confirmModal').style.display = 'flex';
    });
    
    document.getElementById('btnConfirmarReset').addEventListener('click', () => {
        juegoManager.reiniciarTablero();
        actualizarBotonesFigura();
        
        if (config.modoJuego === 'multi' && mqttManager.isConnected()) {
            setTimeout(publicarEstadoCompleto, 150);
        }
        
        document.getElementById('confirmModal').style.display = 'none';
    });
    
    document.getElementById('btnCancelar').addEventListener('click', () => {
        document.getElementById('confirmModal').style.display = 'none';
    });
    
    // Zoom
    document.getElementById('btnCerrarZoom').addEventListener('click', () => {
        document.getElementById('zoomModal').style.display = 'none';
    });
    
    document.getElementById('zoomModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.style.display = 'none';
        }
    });
}

function actualizarIds(opciones) {
    window.__myId = config.myId;
    window.__myName = config.myName;
    opciones.setMyId(config.myId);
    opciones.setMyName(config.myName);
    opciones.setModoJuego(config.modoJuego);
    opciones.setSalaActual(config.salaActual);
}

function actualizarUIYBotones() {
    const estado = juegoManager.obtenerEstado();
    renderizarTablero(estado);
    actualizarUI(estado);
    actualizarBotonesFigura();
}

// ===== SALAS =====
function conectarSala(codigo) {
    mostrarLoading('Conectando a la sala...');
    
    mqttManager.connect(codigo, config.myId)
        .then(() => {
            ocultarLoading();
            unirseSala(codigo);
        })
        .catch(err => {
            ocultarLoading();
            alert('Error al conectar: ' + err.message);
            mostrarModalLobby();
        });
}

function unirseSala(codigo) {
    const lobbyModal = document.getElementById('lobbyModal');
    const joinModal = document.getElementById('joinModal');
    const loadingModal = document.getElementById('loadingModal');
    const roomInfoDisplay = document.getElementById('roomInfoDisplay');
    const leaderboardPanel = document.getElementById('leaderboardPanel');
    
    [lobbyModal, joinModal, loadingModal].forEach(el => el.style.display = 'none');
    roomInfoDisplay.style.display = 'inline-block';
    roomInfoDisplay.textContent = 'SALA: ' + codigo;
    leaderboardPanel.style.display = 'flex';
    
    leaderboardManager.agregarJugador(config.myId, config.myName);
    juegoManager.iniciarVacio(config.myId);
    juegoManager.setModo('multi', codigo);
    
    setTimeout(publicarEstadoCompleto, 100);
    
    // Solicitar sincronización completa de la sala
    setTimeout(() => {
        mqttManager.publicar('estado', { 
            accion: 'sync_request',
            solicitante: config.myId
        });
    }, 500);
    
    // Intervalo de publicación
    if (config.intervaloPublicacion) {
        clearInterval(config.intervaloPublicacion);
    }
    
    config.intervaloPublicacion = setInterval(() => {
        if (config.modoJuego === 'multi' && mqttManager.isConnected() && !sincronizando) {
            publicarEstadoCompleto();
        }
    }, 3000);
}

function iniciarJuegoSolo() {
    document.getElementById('lobbyModal').style.display = 'none';
    document.getElementById('roomInfoDisplay').style.display = 'none';
    document.getElementById('leaderboardPanel').style.display = 'flex';
    
    leaderboardManager.agregarJugador(config.myId, config.myName);
    juegoManager.setModo('solo');
    juegoManager.iniciarVacio(config.myId);
    actualizarBotonesFigura();
}

// ===== MANEJO DE MENSAJES MQTT =====
function manejarMensajeMQTT(mensaje) {
    const { tipo, data } = mensaje;
    if (data.id === config.myId) return;
    
    switch(tipo) {
        case 'estado': manejarEstadoCompleto(data); break;
        case 'figura_grupal': manejarFiguraGrupalRemota(data); break;
        case 'completar': manejarCompletarRemoto(data); break;
    }
}

function manejarEstadoCompleto(data) {
    const jugadorId = data.id;
    if (jugadorId === config.myId) return;
    
    // Evitar procesar el mismo estado dos veces
    const estadoHash = JSON.stringify({
        id: data.id,
        celdas: data.celdas?.map(c => `${c.x},${c.y}`).sort().join('|'),
        modoFigura: data.modoFigura,
        completado: data.completado
    });
    
    if (ultimoEstadoRecibido === estadoHash) return;
    ultimoEstadoRecibido = estadoHash;
    
    // Activar flag de sincronización para evitar bucles
    sincronizando = true;
    
    try {
        const nombre = data.nombre || 'Jugador';
        
        // Actualizar leaderboard
        const jugadorExistente = leaderboardManager.obtenerJugador(jugadorId);
        leaderboardManager.agregarJugador(jugadorId, 
            nombre !== 'Jugador' ? nombre : jugadorExistente?.nombre || 'Jugador'
        );
        
        if (data.puntos !== undefined) {
            leaderboardManager.establecerPuntuacion(jugadorId, data.puntos);
        }
        if (data.puntosSimples !== undefined) {
            leaderboardManager.establecerPuntosSimples(jugadorId, data.puntosSimples);
        }
        if (data.puntosGrupales !== undefined) {
            leaderboardManager.establecerPuntosGrupales(jugadorId, data.puntosGrupales);
        }
        if (data.estado) {
            leaderboardManager.actualizarEstado(jugadorId, data.estado);
        }
        
        // Sincronización grupal - SOLO si el emisor está en modo grupal
        if (data.modoFigura === 'grupal' && data.figura) {
            const estadoLocal = juegoManager.obtenerEstado();
            
            // Si el jugador local no está en modo grupal, inicializarlo
            if (estadoLocal.modoFigura !== 'grupal') {
                juegoManager.estado.modoFigura = 'grupal';
                juegoManager.estado.figuraActual = clonarObjeto(data.figura);
                juegoManager.estado.enJuego = true;
                juegoManager.estado.completado = false;
                juegoManager.celdasGrupales = [];
                juegoManager.contribuciones = {};
                juegoManager.puntosPorCelda = {};
                juegoManager.registroCeldas = {};
            }
            
            // La fusión por timestamp (sincronizarCeldasGrupales) es idempotente:
            // si no hay eventos nuevos no cambia nada, así que ya no hace falta
            // comparar arrays "a mano" para evitar bucles.
            if (data.registroCeldas) {
                juegoManager.sincronizarCeldasGrupales(data.registroCeldas, data.figura);
                
                const nuevoEstado = juegoManager.obtenerEstado();
                renderizarTablero(nuevoEstado);
                actualizarUI(nuevoEstado);
                actualizarBotonesFigura();
            }
        }
        
        // Actualizar zoom
        zoomManager.actualizarJugador(jugadorId, {
            nombre,
            figura: data.figura || null,
            celdasColocadas: data.celdas || [],
            estado: data.estado || 'jugando'
        });
        
        if (zoomManager.estaEnZoom(jugadorId)) {
            const jugadorActualizado = zoomManager.obtenerJugador(jugadorId);
            if (jugadorActualizado) {
                actualizarZoomDirecto(jugadorActualizado);
            }
        }
        
        // Responder a sync_request
        if (data.accion === 'sync_request') {
            const estado = juegoManager.obtenerEstado();
            if (estado.modoFigura === 'grupal' && estado.figuraActual) {
                const payload = {
                    nombre: config.myName,
                    figura: estado.figuraActual,
                    celdas: estado.celdasColocadas,
                    estado: estado.completado ? 'completado' : 'jugando',
                    puntos: leaderboardManager.obtenerJugador(config.myId)?.puntos || 0,
                    puntosSimples: leaderboardManager.obtenerJugador(config.myId)?.puntosSimples || 0,
                    puntosGrupales: leaderboardManager.obtenerJugador(config.myId)?.puntosGrupales || 0,
                    figurasCompletadas: leaderboardManager.obtenerJugador(config.myId)?.figurasCompletadas || 0,
                    modoFigura: 'grupal',
                    registroCeldas: juegoManager.obtenerRegistroCeldas()
                };
                mqttManager.publicarEstado(payload);
            } else {
                setTimeout(publicarEstadoCompleto, 100);
            }
        }
    } finally {
        // Desactivar flag de sincronización después de procesar
        setTimeout(() => {
            sincronizando = false;
        }, 200);
    }
}

function manejarFiguraGrupalRemota(data) {
    const { figura, modo, nombreGenerador } = data;
    
    sincronizando = true;
    simpleDesbloqueado = false; // arranca una ronda nueva, vuelve a bloquear hasta que se resuelva
    
    try {
        // Si es grupal, NO reiniciar el estado, solo actualizar la figura
        if (modo === 'grupal') {
            const estado = juegoManager.obtenerEstado();
            if (estado.modoFigura !== 'grupal' || !estado.figuraActual) {
                // Solo si no hay figura grupal, iniciar el modo
                juegoManager.iniciarModoGrupal(config.myId, figura);
            } else {
                // Si ya hay figura, solo actualizar
                juegoManager.estado.figuraActual = clonarObjeto(figura);
                juegoManager.estado.completado = false;
                juegoManager.celdasGrupales = [];
                juegoManager.estado.celdasColocadas = [];
                juegoManager.contribuciones = {};
                juegoManager.puntosPorCelda = {};
                juegoManager.registroCeldas = {};
                juegoManager.notificar();
            }
        } else {
            // Modo simple
            juegoManager.iniciarModoSimple(config.myId, figura);
        }
        
        const estado = juegoManager.obtenerEstado();
        renderizarTablero(estado);
        actualizarUI(estado);
        actualizarBotonesFigura();
    } finally {
        setTimeout(() => {
            sincronizando = false;
        }, 200);
    }
}

function manejarCompletarRemoto(data) {
    const jugadorId = data.jugadorId || data.id;
    if (jugadorId === config.myId) return;
    
    sincronizando = true;
    
    try {
        leaderboardManager.actualizarEstado(jugadorId, 'completado');
        zoomManager.actualizarJugador(jugadorId, { estado: 'completado' });
        
        if (data.puntos !== undefined) {
            leaderboardManager.establecerPuntuacion(jugadorId, data.puntos);
        }
        
        if (data.modoFigura === 'simple') {
            // Figura simple compartida por toda la sala: la completó otro
            // jugador, así que todos (incluido este cliente) pueden iniciar
            // una ronda nueva aunque no hayan terminado la suya.
            simpleDesbloqueado = true;
        }
        
        // Si estamos en modo grupal y el otro completó, verificar si ya estamos completos
        const estadoLocal = juegoManager.obtenerEstado();
        if (estadoLocal.modoFigura === 'grupal' && !estadoLocal.completado) {
            const totalCeldas = estadoLocal.figuraActual?.celdas?.length || 0;
            const celdasActuales = juegoManager.obtenerCeldasActuales();
            if (celdasActuales.length === totalCeldas && totalCeldas > 0) {
                juegoManager.completarFigura();
            }
        }
        
        const nuevoEstado = juegoManager.obtenerEstado();
        renderizarTablero(nuevoEstado);
        actualizarUI(nuevoEstado);
        actualizarBotonesFigura();
    } finally {
        setTimeout(() => {
            sincronizando = false;
        }, 200);
    }
}

// ===== CLICK EN CELDA =====
export function handleCellClick(x, y, estaColocada) {
    const estado = juegoManager.obtenerEstado();
    
    if (!estado.figuraActual || estado.completado) {
        return;
    }
    
    // Si la celda ya está colocada, deshacer
    if (estaColocada) {
        if (juegoManager.deshacerCelda(x, y)) {
            if (config.modoJuego === 'multi' && mqttManager.isConnected() && !sincronizando) {
                setTimeout(publicarEstadoCompleto, 50);
            }
            actualizarBotonesFigura();
        }
        return;
    }
    
    // Verificar que la celda pertenece a la figura
    if (!juegoManager.esCeldaDeFigura(x, y)) {
        return;
    }
    
    // Colocar dado
    if (juegoManager.colocarDado(x, y)) {
        if (config.modoJuego === 'multi' && mqttManager.isConnected() && !sincronizando) {
            setTimeout(publicarEstadoCompleto, 50);
            
            const nuevoEstado = juegoManager.obtenerEstado();
            if (nuevoEstado.completado) {
                if (nuevoEstado.modoFigura === 'simple') {
                    // La figura simple es compartida por toda la sala: en cuanto
                    // alguien la resuelve, todos deben poder iniciar una ronda
                    // nueva, no solo quien la completó.
                    simpleDesbloqueado = true;
                }
                mqttManager.publicarCompletar(config.myId, nuevoEstado.modoFigura);
                const jugador = leaderboardManager.obtenerJugador(config.myId);
                if (jugador) {
                    mqttManager.publicarPuntuacion(config.myId, jugador.puntos);
                }
            }
        }
        actualizarBotonesFigura();
    }
}

// ===== EXPORT =====
export { 
    conectarSala,
    unirseSala,
    iniciarJuegoSolo,
    actualizarBotonesFigura,
    publicarEstadoCompleto,
    isAutoMode,
    AUTO_ROOM_CODE
};