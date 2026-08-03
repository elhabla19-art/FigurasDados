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
let intervaloPublicacion = null;

// DOM elements
const lobbyModal = document.getElementById('lobbyModal');
const joinModal = document.getElementById('joinModal');
const loadingModal = document.getElementById('loadingModal');
const confirmModal = document.getElementById('confirmModal');
const zoomModal = document.getElementById('zoomModal');
const roomInfoDisplay = document.getElementById('roomInfoDisplay');
const gameBoard = document.getElementById('game-board');
const playersList = document.getElementById('playersList');
const puntosTotal = document.getElementById('puntos-total');
const figurasCompletadas = document.getElementById('figuras-completadas');
const btnReiniciar = document.getElementById('btnReiniciar');
const zoomBoard = document.getElementById('zoomBoard');
const zoomJugadorNombre = document.getElementById('zoomJugadorNombre');
const zoomInfo = document.getElementById('zoomInfo');

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    configurarObservers();
    configurarEventos();
    mostrarModalLobby();
});

// Configurar eventos
function configurarEventos() {
    document.getElementById('btnCrearSala').addEventListener('click', function() {
        myName = document.getElementById('playerName').value.trim() || 'Jugador';
        var codigo = generarIdCorto();
        salaActual = codigo;
        modoJuego = 'multi';
        myId = 'player_' + Math.random().toString(36).substring(2, 10);
        conectarSala(codigo);
    });

    document.getElementById('btnUnirse').addEventListener('click', function() {
        mostrarModalJoin();
    });

    document.getElementById('btnEntrar').addEventListener('click', function() {
        myName = document.getElementById('playerName').value.trim() || 'Jugador';
        var codigo = document.getElementById('roomCodeInput').value.trim().toUpperCase();
        
        if (codigo.length !== 4) {
            alert('El codigo debe tener 4 caracteres');
            return;
        }
        
        salaActual = codigo;
        modoJuego = 'multi';
        myId = 'player_' + Math.random().toString(36).substring(2, 10);
        conectarSala(codigo);
    });

    document.getElementById('btnVolver').addEventListener('click', function() {
        mostrarModalLobby();
    });

    document.getElementById('btnJugarSolo').addEventListener('click', function() {
        myName = document.getElementById('playerName').value.trim() || 'Jugador';
        modoJuego = 'solo';
        myId = 'solo_' + Math.random().toString(36).substring(2, 10);
        salaActual = null;
        iniciarJuegoSolo();
    });

    document.getElementById('btnCancelar').addEventListener('click', function() {
        ocultarConfirm();
    });

    document.getElementById('btnConfirmarReset').addEventListener('click', function() {
        juegoManager.reiniciarTablero();
        if (modoJuego === 'multi' && mqttManager.isConnected()) {
            var estado = juegoManager.obtenerEstado();
            var jugador = leaderboardManager.obtenerJugador(myId);
            mqttManager.publicarEstado({
                nombre: myName,
                figura: estado.figuraActual,
                celdas: estado.celdasColocadas,
                estado: estado.completado ? 'completado' : 'jugando',
                puntos: jugador ? jugador.puntos : 0,
                figurasCompletadas: jugador ? jugador.figurasCompletadas : 0
            });
        }
        ocultarConfirm();
    });

    document.getElementById('btnReiniciar').addEventListener('click', function() {
        mostrarConfirm();
    });

    document.getElementById('btnCerrarZoom').addEventListener('click', function() {
        cerrarZoom();
    });

    zoomModal.addEventListener('click', function(e) {
        if (e.target === zoomModal) {
            cerrarZoom();
        }
    });
}

// Configurar observers
function configurarObservers() {
    if (juegoManager && typeof juegoManager.suscribir === 'function') {
        juegoManager.suscribir(function(estado) {
            renderizarTablero(estado);
            actualizarUI(estado);
            // Publicar estado completo cuando cambia
            if (modoJuego === 'multi' && mqttManager.isConnected()) {
                var jugador = leaderboardManager.obtenerJugador(myId);
                mqttManager.publicarEstado({
                    nombre: myName,
                    figura: estado.figuraActual,
                    celdas: estado.celdasColocadas,
                    estado: estado.completado ? 'completado' : 'jugando',
                    puntos: jugador ? jugador.puntos : 0,
                    figurasCompletadas: jugador ? jugador.figurasCompletadas : 0
                });
            }
        });
    }
    
    if (leaderboardManager && typeof leaderboardManager.suscribir === 'function') {
        leaderboardManager.suscribir(function() {
            renderizarLeaderboard();
        });
    }
    
    if (mqttManager && typeof mqttManager.suscribir === 'function') {
        mqttManager.suscribir(function(mensaje) {
            manejarMensajeMQTT(mensaje);
        });
    }
    
    // Registrar callback para actualizar zoom en tiempo real
    if (zoomManager && typeof zoomManager.registrarZoomCallback === 'function') {
        zoomManager.registrarZoomCallback(function(jugador) {
            console.log('Callback de zoom llamado para:', jugador.nombre);
            actualizarZoomDirecto(jugador);
        });
    }
}

// Mostrar modales
function mostrarModalLobby() {
    lobbyModal.style.display = 'flex';
    joinModal.style.display = 'none';
    loadingModal.style.display = 'none';
    confirmModal.style.display = 'none';
    zoomModal.style.display = 'none';
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

function mostrarZoom(jugadorId) {
    console.log('Mostrando zoom para:', jugadorId);
    
    // Obtener el jugador del zoomManager
    var jugador = zoomManager.obtenerJugador(jugadorId);
    if (!jugador) {
        console.error('Jugador no encontrado en zoomManager:', jugadorId);
        // Intentar obtener del leaderboard como fallback
        var jugadorLB = leaderboardManager.obtenerJugador(jugadorId);
        if (jugadorLB) {
            console.log('Jugador encontrado en leaderboard, creando en zoomManager');
            zoomManager.actualizarJugador(jugadorId, {
                nombre: jugadorLB.nombre,
                figura: jugadorLB.figuraActual,
                celdasColocadas: jugadorLB.celdasColocadas,
                estado: jugadorLB.estado || 'jugando'
            });
            jugador = zoomManager.obtenerJugador(jugadorId);
        }
    }
    
    if (!jugador) {
        console.error('No se pudo obtener el jugador:', jugadorId);
        zoomJugadorNombre.textContent = 'Jugador no encontrado';
        zoomBoard.innerHTML = '<p>No hay datos disponibles</p>';
        zoomInfo.innerHTML = '';
        zoomModal.style.display = 'flex';
        return;
    }
    
    // Actualizar la interfaz del zoom
    zoomJugadorNombre.textContent = jugador.nombre;
    zoomBoard.innerHTML = renderizarZoomTablero(jugador);
    
    var progreso = jugador.progreso || 0;
    var estado = jugador.estado || 'jugando';
    var total = jugador.figura ? jugador.figura.celdas.length : 0;
    var colocadas = jugador.celdasColocadas ? jugador.celdasColocadas.length : 0;
    
    zoomInfo.innerHTML = 'Progreso: ' + colocadas + '/' + total + ' (' + progreso + '%) - ' + 
                         (estado === 'completado' ? 'Completado!' : 'Jugando');
    
    zoomModal.style.display = 'flex';
}

function cerrarZoom() {
    zoomModal.style.display = 'none';
}

function actualizarZoomDirecto(jugador) {
    if (!jugador || zoomModal.style.display !== 'flex') {
        console.log('Zoom no está abierto o no hay jugador');
        return;
    }
    
    // Verificar que el jugador mostrado sea el mismo
    var nombreActual = zoomJugadorNombre.textContent;
    if (nombreActual !== jugador.nombre) {
        console.log('El jugador en zoom no coincide:', nombreActual, 'vs', jugador.nombre);
        return;
    }
    
    console.log('Actualizando zoom directo para:', jugador.nombre);
    
    zoomJugadorNombre.textContent = jugador.nombre;
    zoomBoard.innerHTML = renderizarZoomTablero(jugador);
    
    var progreso = jugador.progreso || 0;
    var estado = jugador.estado || 'jugando';
    var total = jugador.figura ? jugador.figura.celdas.length : 0;
    var colocadas = jugador.celdasColocadas ? jugador.celdasColocadas.length : 0;
    
    zoomInfo.innerHTML = 'Progreso: ' + colocadas + '/' + total + ' (' + progreso + '%) - ' + 
                         (estado === 'completado' ? 'Completado!' : 'Jugando');
}

function renderizarZoomTablero(jugador) {
    console.log('Renderizando zoom para:', jugador.nombre);
    console.log('Figura:', jugador.figura);
    console.log('Celdas colocadas:', jugador.celdasColocadas);
    
    var figura = jugador.figura;
    var celdasColocadas = jugador.celdasColocadas || [];
    
    if (!figura || !figura.celdas) {
        console.warn('Figura no disponible para:', jugador.nombre);
        return '<p>Esperando figura...</p>';
    }
    
    var celdas = figura.celdas;
    var xs = celdas.map(function(c) { return c.x; });
    var ys = celdas.map(function(c) { return c.y; });
    var minX = Math.min.apply(null, xs);
    var maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys);
    var maxY = Math.max.apply(null, ys);
    var ancho = maxX - minX + 1;
    
    var html = '<div class="dice-grid" style="grid-template-columns: repeat(' + ancho + ', 1fr);">';
    
    for (var y = minY; y <= maxY; y++) {
        for (var x = minX; x <= maxX; x++) {
            var celda = null;
            for (var i = 0; i < celdas.length; i++) {
                if (celdas[i].x === x && celdas[i].y === y) {
                    celda = celdas[i];
                    break;
                }
            }
            
            var colocada = false;
            for (var j = 0; j < celdasColocadas.length; j++) {
                if (celdasColocadas[j].x === x && celdasColocadas[j].y === y) {
                    colocada = true;
                    break;
                }
            }
            
            var esInicio = figura.inicio && figura.inicio.x === x && figura.inicio.y === y;
            var completado = jugador.estado === 'completado';
            
            var clases = 'dice-cell';
            if (!celda) {
                clases += ' vacio';
            } else if (completado) {
                clases += ' completado';
            } else if (colocada) {
                clases += ' colocado';
            } else {
                clases += ' disponible';
            }
            if (esInicio) {
                clases += ' inicio';
            }
            
            var valor = celda ? celda.valor : '';
            html += '<div class="' + clases + '">';
            if (celda) {
                html += '<span class="dice-value">' + valor + '</span>';
            }
            html += '</div>';
        }
    }
    
    html += '</div>';
    return html;
}

// Conectar a sala MQTT
function conectarSala(codigo) {
    mostrarLoading('Conectando a la sala...');
    
    mqttManager.connect(codigo, myId)
        .then(function() {
            ocultarLoading();
            unirseSala(codigo);
        })
        .catch(function(err) {
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
    
    // Agregar el jugador al leaderboard con su nombre
    leaderboardManager.agregarJugador(myId, myName);
    
    // Iniciar el juego
    iniciarJuegoMulti();
    
    // Obtener estado inicial
    var estado = juegoManager.obtenerEstado();
    var jugador = leaderboardManager.obtenerJugador(myId);
    
    // Publicar estado completo con el nombre correcto
    mqttManager.publicarEstado({
        nombre: myName,
        figura: estado.figuraActual,
        celdas: estado.celdasColocadas,
        estado: estado.completado ? 'completado' : 'jugando',
        puntos: jugador ? jugador.puntos : 0,
        figurasCompletadas: jugador ? jugador.figurasCompletadas : 0,
        accion: 'join'
    });
    
    // Solicitar sincronización de todos los jugadores
    setTimeout(function() {
        mqttManager.publicar('estado', { 
            accion: 'sync_request' 
        });
    }, 500);
    
    // Limpiar intervalo anterior si existe
    if (intervaloPublicacion) {
        clearInterval(intervaloPublicacion);
        intervaloPublicacion = null;
    }
    
    // Publicar estado cada 3 segundos para mantener sincronización
    intervaloPublicacion = setInterval(function() {
        if (modoJuego === 'multi' && mqttManager.isConnected()) {
            var estadoActual = juegoManager.obtenerEstado();
            var jugadorActual = leaderboardManager.obtenerJugador(myId);
            mqttManager.publicarEstado({
                nombre: myName,
                figura: estadoActual.figuraActual,
                celdas: estadoActual.celdasColocadas,
                estado: estadoActual.completado ? 'completado' : 'jugando',
                puntos: jugadorActual ? jugadorActual.puntos : 0,
                figurasCompletadas: jugadorActual ? jugadorActual.figurasCompletadas : 0
            });
        }
    }, 3000);
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
    juegoManager.setModo('multi', salaActual);
    juegoManager.iniciarRonda(myId);
}

// Manejar mensajes MQTT
function manejarMensajeMQTT(mensaje) {
    var tipo = mensaje.tipo;
    var data = mensaje.data;
    
    // Ignorar mensajes propios
    if (data.id === myId) return;
    
    switch(tipo) {
        case 'estado':
            manejarEstadoCompleto(data);
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

// Manejar estado completo de un jugador
function manejarEstadoCompleto(data) {
    var jugadorId = data.id;
    if (jugadorId === myId) return;
    
    var nombre = data.nombre || 'Jugador';
    
    console.log('Recibiendo estado completo de:', nombre);
    console.log('Datos:', data);
    
    // Actualizar leaderboard
    leaderboardManager.agregarJugador(jugadorId, nombre);
    if (data.puntos !== undefined) {
        leaderboardManager.establecerPuntuacion(jugadorId, data.puntos);
    }
    if (data.estado) {
        leaderboardManager.actualizarEstado(jugadorId, data.estado);
    }
    
    // Actualizar zoom con todos los datos
    zoomManager.actualizarJugador(jugadorId, {
        nombre: nombre,
        figura: data.figura || null,
        celdasColocadas: data.celdas || [],
        estado: data.estado || 'jugando'
    });
    
    // Verificar si el zoom está abierto y es para este jugador
    if (zoomModal.style.display === 'flex') {
        var jugadorZoom = zoomManager.obtenerJugador(jugadorId);
        if (jugadorZoom && zoomJugadorNombre.textContent === jugadorZoom.nombre) {
            console.log('Actualizando zoom desde estado completo');
            actualizarZoomDirecto(jugadorZoom);
        }
    }
    
    // Si es una solicitud de sincronización, enviar nuestro estado
    if (data.accion === 'sync_request') {
        var estado = juegoManager.obtenerEstado();
        var jugador = leaderboardManager.obtenerJugador(myId);
        mqttManager.publicarEstado({
            nombre: myName,
            figura: estado.figuraActual,
            celdas: estado.celdasColocadas,
            estado: estado.completado ? 'completado' : 'jugando',
            puntos: jugador ? jugador.puntos : 0,
            figurasCompletadas: jugador ? jugador.figurasCompletadas : 0
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
        var jugador = zoomManager.obtenerJugador(data.jugadorId);
        if (jugador) {
            var celdas = (jugador.celdasColocadas || []).slice();
            // Verificar si la celda ya está colocada
            var yaColocada = celdas.some(function(c) {
                return c.x === data.celda.x && c.y === data.celda.y;
            });
            if (!yaColocada) {
                celdas.push(data.celda);
                zoomManager.actualizarJugador(data.jugadorId, {
                    celdasColocadas: celdas
                });
            }
        }
    }
    if (data.tipo === 'deshacer' && data.jugadorId) {
        var jugador = zoomManager.obtenerJugador(data.jugadorId);
        if (jugador && jugador.celdasColocadas.length > 0) {
            var celdas = jugador.celdasColocadas.slice();
            // Remover la última celda que coincida con la posición
            for (var i = celdas.length - 1; i >= 0; i--) {
                if (celdas[i].x === data.celda.x && celdas[i].y === data.celda.y) {
                    celdas.splice(i, 1);
                    break;
                }
            }
            zoomManager.actualizarJugador(data.jugadorId, {
                celdasColocadas: celdas
            });
        }
    }
}

function manejarCompletarRemoto(data) {
    if (data.id === myId) return;
    var jugadorId = data.jugadorId || data.id;
    
    leaderboardManager.actualizarEstado(jugadorId, 'completado');
    zoomManager.actualizarJugador(jugadorId, {
        estado: 'completado'
    });
    
    if (data.puntos !== undefined) {
        leaderboardManager.establecerPuntuacion(jugadorId, data.puntos);
    }
}

function manejarDeshacerRemoto(data) {
    if (data.id === myId) return;
    var jugadorId = data.jugadorId || data.id;
    var jugador = zoomManager.obtenerJugador(jugadorId);
    if (jugador && jugador.celdasColocadas.length > 0) {
        var celdas = jugador.celdasColocadas.slice();
        if (data.celda) {
            for (var i = celdas.length - 1; i >= 0; i--) {
                if (celdas[i].x === data.celda.x && celdas[i].y === data.celda.y) {
                    celdas.splice(i, 1);
                    break;
                }
            }
        } else {
            celdas.pop();
        }
        zoomManager.actualizarJugador(jugadorId, {
            celdasColocadas: celdas
        });
    }
}

function manejarPuntuacionRemota(data) {
    if (data.id === myId) return;
    var jugadorId = data.jugadorId || data.id;
    if (data.puntos !== undefined) {
        leaderboardManager.establecerPuntuacion(jugadorId, data.puntos);
    }
}

function manejarListaJugadores(data) {
    if (data.jugadores) {
        for (var i = 0; i < data.jugadores.length; i++) {
            var jugador = data.jugadores[i];
            if (jugador.id !== myId) {
                leaderboardManager.agregarJugador(jugador.id, jugador.nombre || 'Jugador');
            }
        }
    }
}

// Renderizar tablero
function renderizarTablero(estado) {
    var figuraActual = estado.figuraActual;
    var celdasColocadas = estado.celdasColocadas;
    var completado = estado.completado;
    
    if (!figuraActual) {
        gameBoard.innerHTML = '<p>Esperando figura...</p>';
        return;
    }
    
    var celdas = figuraActual.celdas;
    var xs = celdas.map(function(c) { return c.x; });
    var ys = celdas.map(function(c) { return c.y; });
    var minX = Math.min.apply(null, xs);
    var maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys);
    var maxY = Math.max.apply(null, ys);
    var ancho = maxX - minX + 1;
    
    var html = '<div class="dice-grid" style="grid-template-columns: repeat(' + ancho + ', 1fr);">';
    
    for (var y = minY; y <= maxY; y++) {
        for (var x = minX; x <= maxX; x++) {
            var celda = null;
            for (var i = 0; i < celdas.length; i++) {
                if (celdas[i].x === x && celdas[i].y === y) {
                    celda = celdas[i];
                    break;
                }
            }
            
            var colocada = false;
            for (var j = 0; j < celdasColocadas.length; j++) {
                if (celdasColocadas[j].x === x && celdasColocadas[j].y === y) {
                    colocada = true;
                    break;
                }
            }
            
            var esInicio = figuraActual.inicio.x === x && figuraActual.inicio.y === y;
            var disponible = juegoManager.esCeldaDisponible(x, y);
            
            var clases = 'dice-cell';
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
            
            var valor = celda ? celda.valor : '';
            var orden = 0;
            if (celda) {
                for (var k = 0; k < celdasColocadas.length; k++) {
                    if (celdasColocadas[k].x === x && celdasColocadas[k].y === y) {
                        orden = k + 1;
                        break;
                    }
                }
            }
            
            var dataX = x;
            var dataY = y;
            var estaColocada = colocada;
            
            html += '<div class="' + clases + '" data-x="' + dataX + '" data-y="' + dataY + 
                    '" data-colocada="' + estaColocada + '">';
            if (celda) {
                html += '<span class="dice-value">' + valor + '</span>';
                if (colocada && orden > 0) {
                    html += '<span class="dice-orden">' + orden + '</span>';
                }
                if (esInicio) {
                    html += '<span class="dice-indice">I</span>';
                }
            }
            html += '</div>';
        }
    }
    
    html += '</div>';
    gameBoard.innerHTML = html;
    
    // Event listeners para celdas
    var celdasElementos = gameBoard.querySelectorAll('.dice-cell');
    for (var m = 0; m < celdasElementos.length; m++) {
        var el = celdasElementos[m];
        var colocada = el.dataset.colocada === 'true';
        var completado2 = el.classList.contains('completado');
        var vacio = el.classList.contains('vacio');
        
        if (!completado2 && !vacio) {
            el.addEventListener('click', function() {
                var x = parseInt(this.dataset.x);
                var y = parseInt(this.dataset.y);
                var colocada = this.dataset.colocada === 'true';
                handleCellClick(x, y, colocada);
            });
        }
    }
}

// Manejar click en celda
function handleCellClick(x, y, estaColocada) {
    var estado = juegoManager.obtenerEstado();
    if (estado.completado) return;
    
    if (estaColocada) {
        var success = juegoManager.deshacerCelda(x, y);
        if (success && modoJuego === 'multi') {
            mqttManager.publicarAccion('deshacer', {
                jugadorId: myId,
                celda: { x: x, y: y }
            });
            // Publicar estado completo después de deshacer
            var nuevoEstado = juegoManager.obtenerEstado();
            var jugador = leaderboardManager.obtenerJugador(myId);
            mqttManager.publicarEstado({
                nombre: myName,
                figura: nuevoEstado.figuraActual,
                celdas: nuevoEstado.celdasColocadas,
                estado: nuevoEstado.completado ? 'completado' : 'jugando',
                puntos: jugador ? jugador.puntos : 0,
                figurasCompletadas: jugador ? jugador.figurasCompletadas : 0
            });
        }
        return;
    }
    
    var success = juegoManager.colocarDado(x, y);
    if (success && modoJuego === 'multi') {
        mqttManager.publicarAccion('colocar', {
            jugadorId: myId,
            celda: { x: x, y: y }
        });
        // Publicar estado completo después de colocar
        var nuevoEstado = juegoManager.obtenerEstado();
        var jugador = leaderboardManager.obtenerJugador(myId);
        mqttManager.publicarEstado({
            nombre: myName,
            figura: nuevoEstado.figuraActual,
            celdas: nuevoEstado.celdasColocadas,
            estado: nuevoEstado.completado ? 'completado' : 'jugando',
            puntos: jugador ? jugador.puntos : 0,
            figurasCompletadas: jugador ? jugador.figurasCompletadas : 0
        });
        
        // Si se completó la figura, publicar completado
        if (nuevoEstado.completado) {
            mqttManager.publicarCompletar(myId);
            mqttManager.publicarPuntuacion(myId, jugador ? jugador.puntos : 0);
        }
    }
}

function actualizarUI(estado) {
    var jugador = leaderboardManager.obtenerJugador(myId);
    if (jugador) {
        puntosTotal.textContent = jugador.puntos;
        figurasCompletadas.textContent = jugador.figurasCompletadas;
    }
}

function renderizarLeaderboard() {
    var ranking = leaderboardManager.obtenerRanking();
    
    if (ranking.length === 0) {
        playersList.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Esperando jugadores...</p>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < ranking.length; i++) {
        var jugador = ranking[i];
        var esMi = jugador.id === myId;
        var estado = jugador.estado || 'jugando';
        var estadoText = estado === 'completado' ? 'Completado' : 'Jugando';
        var estadoClass = estado === 'completado' ? 'completado' : '';
        
        // Verificar si este jugador tiene datos en zoomManager
        var zoomData = zoomManager.obtenerJugador(jugador.id);
        var tieneZoom = zoomData !== null;
        
        html += '<div class="player-card ' + (esMi ? 'me' : '') + '" data-player-id="' + jugador.id + '">';
        html += '    <span class="nombre">' + jugador.nombre + (esMi ? ' (Tu)' : '') + '</span>';
        html += '    <span>';
        html += '        <span class="estado ' + estadoClass + '">' + estadoText + '</span>';
        html += '        <span class="puntos">' + jugador.puntos + '</span>';
        html += '    </span>';
        html += '</div>';
    }
    
    playersList.innerHTML = html;
    
    // Event listeners para zoom
    var cards = playersList.querySelectorAll('.player-card');
    for (var j = 0; j < cards.length; j++) {
        var card = cards[j];
        card.addEventListener('click', function() {
            var id = this.dataset.playerId;
            if (id) {
                console.log('Click en jugador:', id);
                // Si es el jugador actual, mostrar un mensaje
                if (id === myId) {
                    alert('Este es tu tablero. Puedes verlo en la pantalla principal.');
                    return;
                }
                mostrarZoom(id);
            }
        });
    }
}