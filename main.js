import { juegoManager } from './js/juego.js';
import { deshacerManager } from './js/deshacer.js';
import { leaderboardManager } from './js/leaderboard.js';
import { zoomManager } from './js/zoom.js';
import { mqttManager } from './mqtt.js';
import { generarIdCorto } from './js/utils.js';

// Variables globales
let myId = null;
let myName = 'Jugador';
let modoJuego = 'solo';
let salaActual = null;

// DOM elements
const lobbyModal = document.getElementById('lobbyModal');
const joinModal = document.getElementById('joinModal');
const loadingModal = document.getElementById('loadingModal');
const confirmModal = document.getElementById('confirmModal');
const roomInfoDisplay = document.getElementById('roomInfoDisplay');
const gameBoard = document.getElementById('game-board');
const playersList = document.getElementById('playersList');
const puntosTotal = document.getElementById('puntos-total');
const figurasCompletadas = document.getElementById('figuras-completadas');
const progresoFigura = document.getElementById('progresoFigura');
const estadoFigura = document.getElementById('estadoFigura');
const btnDeshacer = document.getElementById('btnDeshacer');
const btnCompletar = document.getElementById('btnCompletar');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    configurarObservers();
    configurarEventos();
    mostrarModalLobby();
});

// Configurar eventos
function configurarEventos() {
    document.getElementById('btnCrearSala').addEventListener('click', () => {
        myName = document.getElementById('playerName').value.trim() || 'Jugador';
        const codigo = generarIdCorto();
        salaActual = codigo;
        modoJuego = 'multi';
        myId = 'player_' + Math.random().toString(36).substring(2, 10);
        conectarSala(codigo);
    });

    document.getElementById('btnUnirse').addEventListener('click', () => {
        mostrarModalJoin();
    });

    document.getElementById('btnEntrar').addEventListener('click', () => {
        myName = document.getElementById('playerName').value.trim() || 'Jugador';
        const codigo = document.getElementById('roomCodeInput').value.trim().toUpperCase();
        
        if (codigo.length !== 4) {
            alert('El codigo debe tener 4 caracteres');
            return;
        }
        
        salaActual = codigo;
        modoJuego = 'multi';
        myId = 'player_' + Math.random().toString(36).substring(2, 10);
        conectarSala(codigo);
    });

    document.getElementById('btnVolver').addEventListener('click', () => {
        mostrarModalLobby();
    });

    document.getElementById('btnJugarSolo').addEventListener('click', () => {
        myName = document.getElementById('playerName').value.trim() || 'Jugador';
        modoJuego = 'solo';
        myId = 'solo_' + Math.random().toString(36).substring(2, 10);
        salaActual = null;
        iniciarJuegoSolo();
    });

    document.getElementById('btnCancelar').addEventListener('click', () => {
        ocultarConfirm();
    });

    document.getElementById('btnConfirmarReset').addEventListener('click', () => {
        juegoManager.reiniciarTablero();
        if (modoJuego === 'multi') {
            mqttManager.publicarEstado({
                accion: 'reset'
            });
        }
        ocultarConfirm();
    });

    btnDeshacer.addEventListener('click', () => {
        if (modoJuego === 'multi') {
            juegoManager.deshacer();
            mqttManager.publicarDeshacer(myId);
        } else {
            juegoManager.deshacer();
        }
    });

    btnCompletar.addEventListener('click', () => {
        const estado = juegoManager.obtenerEstado();
        if (!estado.completado) {
            const completado = juegoManager.completarFigura();
            if (completado && modoJuego === 'multi') {
                mqttManager.publicarCompletar(myId);
            }
        }
    });
}

// Configurar observers
function configurarObservers() {
    juegoManager.suscribir((estado) => {
        renderizarTablero(estado);
        actualizarUI(estado);
    });
    
    leaderboardManager.suscribir(() => {
        renderizarLeaderboard();
    });
    
    zoomManager.suscribir(() => {
        renderizarZoom();
    });
    
    mqttManager.suscribir((mensaje) => {
        manejarMensajeMQTT(mensaje);
    });
}

// Mostrar modales
function mostrarModalLobby() {
    lobbyModal.style.display = 'flex';
    joinModal.style.display = 'none';
    loadingModal.style.display = 'none';
    confirmModal.style.display = 'none';
}

function mostrarModalJoin() {
    lobbyModal.style.display = 'none';
    joinModal.style.display = 'flex';
    loadingModal.style.display = 'none';
}

function mostrarLoading(texto) {
    document.getElementById('loadingText').textContent = texto || 'Conectando...';
    loadingModal.style.display = 'flex';
}

function ocultarLoading() {
    loadingModal.style.display = 'none';
}

function mostrarConfirm() {
    confirmModal.style.display = 'flex';
}

function ocultarConfirm() {
    confirmModal.style.display = 'none';
}

// Conectar a sala MQTT
function conectarSala(codigo) {
    mostrarLoading('Conectando a la sala...');
    
    mqttManager.connect(codigo, myId)
        .then(() => {
            ocultarLoading();
            unirseSala(codigo);
        })
        .catch((err) => {
            ocultarLoading();
            alert('Error al conectar: ' + err.message);
            mostrarModalLobby();
        });
}

// Unirse a sala
function unirseSala(codigo) {
    lobbyModal.style.display = 'none';
    joinModal.style.display = 'none';
    loadingModal.style.display = 'none';
    
    roomInfoDisplay.style.display = 'inline-block';
    roomInfoDisplay.textContent = 'SALA: ' + codigo;
    
    document.getElementById('leaderboardPanel').style.display = 'flex';
    
    iniciarJuegoMulti();
    
    mqttManager.publicarEstado({
        nombre: myName,
        accion: 'join'
    });
}

// Iniciar juego solo
function iniciarJuegoSolo() {
    lobbyModal.style.display = 'none';
    roomInfoDisplay.style.display = 'none';
    document.getElementById('leaderboardPanel').style.display = 'flex';
    
    leaderboardManager.agregarJugador(myId, myName);
    
    juegoManager.setModo('solo');
    juegoManager.iniciarRonda(myId);
}

// Iniciar juego multijugador
function iniciarJuegoMulti() {
    leaderboardManager.agregarJugador(myId, myName);
    
    juegoManager.setModo('multi', salaActual);
    juegoManager.iniciarRonda(myId);
    
    const estado = juegoManager.obtenerEstado();
    mqttManager.publicarFigura(estado.figuraActual);
}

// Manejar mensajes MQTT
function manejarMensajeMQTT(mensaje) {
    const { tipo, data } = mensaje;
    
    switch(tipo) {
        case 'estado':
            manejarEstadoJugador(data);
            break;
        case 'figura':
            manejarFiguraRemota(data);
            break;
        case 'accion':
            manejarAccionRemota(data);
            break;
        case 'completar':
            manejarCompletarRemoto(data);
            break;
        case 'deshacer':
            manejarDeshacerRemoto(data);
            break;
        case 'puntuacion':
            manejarPuntuacionRemota(data);
            break;
        case 'jugadores':
            manejarListaJugadores(data);
            break;
    }
}

function manejarEstadoJugador(data) {
    const jugadorId = data.id;
    if (jugadorId === myId) return;
    
    if (data.nombre) {
        leaderboardManager.agregarJugador(jugadorId, data.nombre);
    }
    
    if (data.figura || data.celdas) {
        zoomManager.actualizarJugador(jugadorId, {
            figura: data.figura,
            celdasColocadas: data.celdas || [],
            estado: data.estado || 'jugando'
        });
    }
}

function manejarFiguraRemota(data) {
    if (data.id === myId) return;
    zoomManager.actualizarJugador(data.id, {
        figura: data.figura
    });
}

function manejarAccionRemota(data) {
    if (data.id === myId) return;
    if (data.tipo === 'colocar' && data.celda && data.jugadorId) {
        const jugador = zoomManager.obtenerJugador(data.jugadorId);
        if (jugador) {
            const celdas = [...(jugador.celdasColocadas || [])];
            celdas.push(data.celda);
            zoomManager.actualizarJugador(data.jugadorId, {
                celdasColocadas: celdas
            });
        }
    }
}

function manejarCompletarRemoto(data) {
    if (data.id === myId) return;
    zoomManager.actualizarJugador(data.jugadorId, {
        estado: 'completado'
    });
}

function manejarDeshacerRemoto(data) {
    if (data.id === myId) return;
    const jugador = zoomManager.obtenerJugador(data.jugadorId);
    if (jugador && jugador.celdasColocadas.length > 0) {
        const celdas = [...jugador.celdasColocadas];
        celdas.pop();
        zoomManager.actualizarJugador(data.jugadorId, {
            celdasColocadas: celdas
        });
    }
}

function manejarPuntuacionRemota(data) {
    if (data.id === myId) return;
    leaderboardManager.actualizarPuntuacion(data.jugadorId, data.puntos || 0);
}

function manejarListaJugadores(data) {
    if (data.jugadores) {
        for (const jugador of data.jugadores) {
            if (jugador.id !== myId) {
                leaderboardManager.agregarJugador(jugador.id, jugador.nombre);
            }
        }
    }
}

// Renderizar tablero
function renderizarTablero(estado) {
    const { figuraActual, celdasColocadas, completado } = estado;
    
    if (!figuraActual) {
        gameBoard.innerHTML = '<p>Esperando figura...</p>';
        return;
    }
    
    const celdas = figuraActual.celdas;
    const xs = celdas.map(c => c.x);
    const ys = celdas.map(c => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const ancho = maxX - minX + 1;
    const alto = maxY - minY + 1;
    
    let html = '<div class="dice-grid" style="grid-template-columns: repeat(' + ancho + ', 1fr);">';
    
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const celda = celdas.find(c => c.x === x && c.y === y);
            const colocada = celdasColocadas.some(c => c.x === x && c.y === y);
            const esInicio = figuraActual.inicio.x === x && figuraActual.inicio.y === y;
            const disponible = juegoManager.esCeldaDisponible(x, y);
            
            let clases = 'dice-cell';
            if (!celda) {
                clases += ' vacio';
            } else if (completado) {
                clases += ' completado';
            } else if (colocada) {
                clases += ' colocado';
            } else if (disponible) {
                clases += ' disponible';
            }
            
            if (esInicio) {
                clases += ' inicio';
            }
            
            const valor = celda ? celda.valor : '';
            const orden = celda ? celdasColocadas.findIndex(c => c.x === x && c.y === y) + 1 : 0;
            
            html += `<div class="${clases}" data-x="${x}" data-y="${y}">`;
            if (celda) {
                html += `<span class="dice-value">${valor}</span>`;
                if (colocada && orden > 0) {
                    html += `<span class="dice-orden">${orden}</span>`;
                }
                if (esInicio) {
                    html += `<span class="dice-indice">I</span>`;
                }
            }
            html += '</div>';
        }
    }
    
    html += '</div>';
    gameBoard.innerHTML = html;
    
    // Event listeners para celdas
    gameBoard.querySelectorAll('.dice-cell.disponible').forEach(el => {
        el.addEventListener('click', () => {
            const x = parseInt(el.dataset.x);
            const y = parseInt(el.dataset.y);
            handleCellClick(x, y);
        });
    });
    
    const progreso = juegoManager.obtenerProgreso();
    progresoFigura.textContent = 'Progreso: ' + progreso.actual + '/' + progreso.total;
    
    if (completado) {
        estadoFigura.textContent = 'Figura completada!';
        estadoFigura.style.color = 'var(--color-success)';
        btnCompletar.disabled = true;
    } else {
        const disponibles = juegoManager.obtenerCeldasDisponibles();
        if (disponibles.length === 0 && celdasColocadas.length > 0) {
            estadoFigura.textContent = 'No hay movimientos disponibles';
            estadoFigura.style.color = 'var(--color-danger)';
        } else if (celdasColocadas.length === 0) {
            estadoFigura.textContent = 'Coloca el dado inicial';
            estadoFigura.style.color = 'var(--color-warning)';
        } else {
            estadoFigura.textContent = 'Coloca en una celda disponible (' + disponibles.length + ' disponibles)';
            estadoFigura.style.color = 'var(--color-primary)';
        }
        btnCompletar.disabled = false;
    }
}

function handleCellClick(x, y) {
    const estado = juegoManager.obtenerEstado();
    if (estado.completado) return;
    
    const success = juegoManager.colocarDado(x, y);
    if (success && modoJuego === 'multi') {
        mqttManager.publicarAccion('colocar', {
            jugadorId: myId,
            celda: { x, y }
        });
    }
}

function actualizarUI(estado) {
    const jugador = leaderboardManager.obtenerJugador(myId);
    if (jugador) {
        puntosTotal.textContent = jugador.puntos;
        figurasCompletadas.textContent = jugador.figurasCompletadas;
    }
    
    const tieneAcciones = deshacerManager.hayAccionesJugador(myId);
    btnDeshacer.disabled = !tieneAcciones || estado.completado;
}

function renderizarLeaderboard() {
    const ranking = leaderboardManager.obtenerRanking();
    
    if (ranking.length === 0) {
        playersList.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Esperando jugadores...</p>';
        return;
    }
    
    let html = '';
    for (const jugador of ranking) {
        const esMi = jugador.id === myId;
        const esGanador = ranking[0] && jugador.id === ranking[0].id;
        
        html += `
            <div class="player-card ${esMi ? 'me' : ''}" data-player-id="${jugador.id}">
                <div class="player-card-header">
                    <span>${jugador.nombre}${esMi ? ' (Tu)' : ''} ${esGanador ? ' 👑' : ''}</span>
                    <span class="puntos">${jugador.puntos} pts</span>
                </div>
                <div class="mini-board">
                    ${renderizarMiniTablero(jugador)}
                </div>
                <div class="mini-progreso">
                    <span>Figuras: ${jugador.figurasCompletadas || 0}</span>
                    <div class="barra">
                        <div class="relleno" style="width: ${Math.min((jugador.puntos / 10) * 100, 100)}%"></div>
                    </div>
                    <span>${jugador.puntos} pts</span>
                </div>
            </div>
        `;
    }
    
    playersList.innerHTML = html;
    
    // Event listeners para zoom
    playersList.querySelectorAll('.player-card').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.dataset.playerId;
            if (id && id !== myId) {
                zoomManager.toggleZoom(id);
            }
        });
    });
}

function renderizarMiniTablero(jugador) {
    const figura = jugador.figuraActual;
    const celdas = jugador.celdasColocadas || [];
    
    if (!figura) {
        return '<div class="mini-row">Esperando figura...</div>';
    }
    
    const celdasFigura = figura.celdas || [];
    const xs = celdasFigura.map(c => c.x);
    const ys = celdasFigura.map(c => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    let html = '';
    for (let y = minY; y <= maxY; y++) {
        html += '<div class="mini-row">';
        for (let x = minX; x <= maxX; x++) {
            const existe = celdasFigura.some(c => c.x === x && c.y === y);
            const colocada = celdas.some(c => c.x === x && c.y === y);
            const esInicio = figura.inicio && figura.inicio.x === x && figura.inicio.y === y;
            
            let clases = 'mini-cell';
            if (!existe) {
                clases += ' vacio';
            } else if (colocada) {
                clases += ' colocado';
            } else {
                clases += ' disponible';
            }
            if (esInicio) {
                clases += ' inicio';
            }
            
            const valor = existe ? celdasFigura.find(c => c.x === x && c.y === y).valor : '';
            html += `<div class="${clases}">${valor || ''}</div>`;
        }
        html += '</div>';
    }
    
    return html;
}

function renderizarZoom() {
    const seleccionado = zoomManager.obtenerJugadorSeleccionado();
    const cards = document.querySelectorAll('.player-card');
    cards.forEach(card => {
        const isSelected = card.dataset.playerId === (seleccionado ? seleccionado.id : null);
        card.style.borderColor = isSelected ? 'var(--color-primary)' : '';
        card.style.borderWidth = isSelected ? '2px' : '';
    });
}