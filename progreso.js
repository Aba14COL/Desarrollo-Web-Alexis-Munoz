// progreso.js — Gestión integral de registros de entrenamiento en FitPlan
import { cliente } from './auth.js';
import { rutinas, buscarRutinaPorId } from './datos.js';
import {
    listarRegistros,
    crearRegistro,
    editarRegistro,
    eliminarRegistro,
    esErrorDeRed
} from './registros-api.js';

// Elementos del DOM
const formulario = document.getElementById('registro-form');
const selectRutina = document.getElementById('rutina');
const inputFecha = document.getElementById('fecha');
const inputDuracion = document.getElementById('duracion');
const inputNota = document.getElementById('nota');
const btnGuardar = document.getElementById('btn-guardar');
const btnCancelar = document.getElementById('btn-cancelar');
const inputBusqueda = document.getElementById('busqueda');
const mensajeProgreso = document.getElementById('mensaje-progreso');
const listaRegistros = document.getElementById('lista-registros');

// Estado local
let todosLosRegistros = [];
let idEnEdicion = null; // null = modo creación; id string/uuid = modo edición
let enviandoDatos = false;

/**
 * Llena las opciones del select con las rutinas disponibles en FitPlan.
 */
function poblarSelectRutinas() {
    rutinas.forEach(function (rutina) {
        const opcion = document.createElement('option');
        opcion.value = String(rutina.id);
        opcion.textContent = rutina.nombre;
        selectRutina.appendChild(opcion);
    });
}

/**
 * Muestra texto de estado con su clase de estilo (ok, error, suave).
 */
function mostrarMensaje(texto, tipo = '') {
    mensajeProgreso.replaceChildren();
    if (!texto) {
        mensajeProgreso.className = 'mensaje';
        return;
    }
    mensajeProgreso.textContent = texto;
    mensajeProgreso.className = tipo ? `mensaje ${tipo}` : 'mensaje';
}

/**
 * Muestra el aviso específico cuando la escritura tuvo éxito pero la lectura falló,
 * permitiendo reintentar únicamente la consulta sin reenviar datos.
 */
function mostrarAvisoFalloLecturaPosterior() {
    mensajeProgreso.replaceChildren();
    mensajeProgreso.className = 'mensaje suave';

    const spanTexto = document.createElement('span');
    spanTexto.textContent = 'Se guardó, pero no pude actualizar la lista. ';
    spanTexto.style.marginRight = '0.75rem';

    const btnReintentar = document.createElement('button');
    btnReintentar.type = 'button';
    btnReintentar.className = 'btn btn-primario btn-sm';
    btnReintentar.textContent = 'Reintentar consulta';
    btnReintentar.addEventListener('click', async function () {
        btnReintentar.disabled = true;
        try {
            todosLosRegistros = await listarRegistros();
            aplicarFiltro();
            mostrarMensaje('Lista actualizada correctamente.', 'ok');
        } catch (error) {
            btnReintentar.disabled = false;
            mostrarMensaje(`No se pudo actualizar la lista: ${error.message}`, 'error');
        }
    });

    mensajeProgreso.append(spanTexto, btnReintentar);
}

/**
 * Deshabilita o habilita controles interactivos durante peticiones en curso.
 * NOTA: Deshabilitar el botón previene duplicados en la interfaz local por doble clic,
 * pero no garantiza la idempotencia absoluta ante problemas de red (para una garantía real
 * se requeriría una clave de idempotencia o una restricción de unicidad en la base de datos).
 */
function alternarBloqueoInterfaz(bloquear) {
    enviandoDatos = bloquear;
    btnGuardar.disabled = bloquear;
    btnCancelar.disabled = bloquear;
    selectRutina.disabled = bloquear;
    inputFecha.disabled = bloquear;
    inputDuracion.disabled = bloquear;
    inputNota.disabled = bloquear;

    document.querySelectorAll('.registro-acciones button').forEach(function (btn) {
        btn.disabled = bloquear;
    });
}

/**
 * Limpia el formulario y regresa al modo creación sin guardar nada.
 */
function limpiarFormulario() {
    formulario.reset();
    inputFecha.value = new Date().toISOString().split('T')[0];
    idEnEdicion = null;
    btnGuardar.textContent = 'Guardar';
    btnCancelar.hidden = true;
}

/**
 * Pone el formulario en modo edición con los datos del registro seleccionado.
 */
function iniciarEdicion(registro) {
    if (enviandoDatos) return;

    idEnEdicion = registro.id;
    selectRutina.value = String(registro.rutina_id);
    inputFecha.value = registro.fecha;
    inputDuracion.value = registro.duracion_min;
    inputNota.value = registro.nota || '';

    btnGuardar.textContent = 'Guardar cambios';
    btnCancelar.hidden = false;
    mostrarMensaje('');
    selectRutina.focus();
}

/**
 * Dibuja la lista de tarjetas de entrenamiento usando createElement y textContent.
 */
function renderizarLista(registros, esBusqueda = false) {
    listaRegistros.replaceChildren();

    if (registros.length === 0) {
        const vacio = document.createElement('div');
        vacio.className = 'estado-mensaje';
        if (esBusqueda) {
            vacio.textContent = 'No se encontraron registros que coincidan con tu búsqueda.';
        } else {
            vacio.textContent = 'Aún no tienes registros de entrenamiento. ¡Completa el formulario para registrar tu primera sesión!';
        }
        listaRegistros.appendChild(vacio);
        return;
    }

    registros.forEach(function (registro) {
        const tarjeta = document.createElement('article');
        tarjeta.className = 'tarjeta-registro';

        const cabecera = document.createElement('div');
        cabecera.className = 'tarjeta-registro-cabecera';

        const infoRutina = buscarRutinaPorId(Number(registro.rutina_id));
        const titulo = document.createElement('h3');
        titulo.textContent = infoRutina ? infoRutina.nombre : `Rutina #${registro.rutina_id}`;

        const fechaSpan = document.createElement('span');
        fechaSpan.className = 'registro-fecha';
        fechaSpan.textContent = registro.fecha || '';

        cabecera.append(titulo, fechaSpan);

        const meta = document.createElement('div');
        meta.className = 'registro-meta';
        meta.textContent = `⏱ Duración: ${registro.duracion_min} minutos`;

        tarjeta.append(cabecera, meta);

        if (registro.nota && registro.nota.trim()) {
            const notaP = document.createElement('p');
            notaP.className = 'registro-nota';
            notaP.textContent = registro.nota;
            tarjeta.append(notaP);
        }

        const acciones = document.createElement('div');
        acciones.className = 'registro-acciones';

        const btnEditar = document.createElement('button');
        btnEditar.type = 'button';
        btnEditar.className = 'btn btn-borde btn-sm';
        btnEditar.textContent = 'Editar';
        btnEditar.disabled = enviandoDatos;
        btnEditar.addEventListener('click', function () {
            iniciarEdicion(registro);
        });

        const btnEliminar = document.createElement('button');
        btnEliminar.type = 'button';
        btnEliminar.className = 'btn btn-borde btn-sm';
        btnEliminar.textContent = 'Eliminar';
        btnEliminar.disabled = enviandoDatos;
        btnEliminar.addEventListener('click', function () {
            solicitarEliminacion(registro);
        });

        acciones.append(btnEditar, btnEliminar);
        tarjeta.append(acciones);

        listaRegistros.appendChild(tarjeta);
    });
}

/**
 * Filtra los registros en memoria por nombre de rutina o nota.
 */
function aplicarFiltro() {
    const termino = (inputBusqueda.value || '').trim().toLowerCase();
    if (!termino) {
        renderizarLista(todosLosRegistros, false);
        return;
    }

    const filtrados = todosLosRegistros.filter(function (reg) {
        const infoRutina = buscarRutinaPorId(Number(reg.rutina_id));
        const nombreRutina = infoRutina ? infoRutina.nombre.toLowerCase() : '';
        const nota = (reg.nota || '').toLowerCase();
        return nombreRutina.includes(termino) || nota.includes(termino);
    });

    renderizarLista(filtrados, true);
}

/**
 * Consulta la lista de registros en Supabase y maneja estados.
 */
async function cargarRegistros() {
    listaRegistros.replaceChildren();

    const cargando = document.createElement('div');
    cargando.className = 'estado-mensaje';
    cargando.textContent = 'Cargando tus registros…';
    listaRegistros.appendChild(cargando);

    try {
        todosLosRegistros = await listarRegistros();
        aplicarFiltro();
    } catch (error) {
        listaRegistros.replaceChildren();

        const contenedorError = document.createElement('div');
        contenedorError.className = 'estado-mensaje';

        const textoError = document.createElement('p');
        textoError.textContent = `Ocurrió un error al cargar tus registros: ${error.message}`;
        textoError.style.color = 'var(--color-error)';
        textoError.style.marginBottom = '1rem';

        const btnReintentar = document.createElement('button');
        btnReintentar.type = 'button';
        btnReintentar.className = 'btn btn-primario btn-sm';
        btnReintentar.textContent = 'Reintentar';
        btnReintentar.addEventListener('click', function () {
            cargarRegistros();
        });

        contenedorError.append(textoError, btnReintentar);
        listaRegistros.appendChild(contenedorError);
    }
}

/**
 * Valida los campos ingresados en el formulario antes de procesar el envío.
 */
function validarFormulario() {
    const rutinaId = parseInt(selectRutina.value, 10);
    if (!rutinaId || Number.isNaN(rutinaId)) {
        return 'Por favor selecciona una rutina válida.';
    }

    const fecha = inputFecha.value.trim();
    if (!fecha || Number.isNaN(Date.parse(fecha))) {
        return 'Por favor ingresa una fecha válida.';
    }

    const duracion = parseInt(inputDuracion.value, 10);
    if (!Number.isInteger(duracion) || duracion <= 0) {
        return 'La duración debe ser un número entero mayor a 0 minutos.';
    }

    const nota = inputNota.value.trim();
    if (nota.length > 200) {
        return 'La nota no puede exceder los 200 caracteres.';
    }

    return null;
}

/**
 * Maneja el resultado incierto cuando una petición de red se corta o falla sin respuesta.
 * Consulta el estado actual del servidor para verificar si la acción realmente ocurrió.
 */
async function verificarResultadoIncierto(accion, datosEsperados, idAfectado) {
    mostrarMensaje('No recibí confirmación. Voy a revisar el estado actual…', 'suave');

    try {
        const registrosActuales = await listarRegistros();
        todosLosRegistros = registrosActuales;
        aplicarFiltro();

        if (accion === 'crear') {
            const encontrado = registrosActuales.find(function (r) {
                return (
                    Number(r.rutina_id) === Number(datosEsperados.rutina_id) &&
                    r.fecha === datosEsperados.fecha &&
                    Number(r.duracion_min) === Number(datosEsperados.duracion_min) &&
                    (r.nota || null) === (datosEsperados.nota || null)
                );
            });

            if (encontrado) {
                mostrarMensaje('Confirmado: el entrenamiento sí se registró en el servidor.', 'ok');
                limpiarFormulario();
            } else {
                mostrarMensaje('No se encontró el registro en el servidor. Tus datos se conservan para que decidas si reintentar.', 'error');
            }
        } else if (accion === 'editar') {
            const modificado = registrosActuales.find(function (r) {
                return (
                    r.id === idAfectado &&
                    Number(r.rutina_id) === Number(datosEsperados.rutina_id) &&
                    r.fecha === datosEsperados.fecha &&
                    Number(r.duracion_min) === Number(datosEsperados.duracion_min) &&
                    (r.nota || null) === (datosEsperados.nota || null)
                );
            });

            if (modificado) {
                mostrarMensaje('Confirmado: los cambios sí fueron guardados en el servidor.', 'ok');
                limpiarFormulario();
            } else {
                mostrarMensaje('Los cambios no se reflejaron en el servidor. Los datos se conservan en el formulario.', 'error');
            }
        } else if (accion === 'eliminar') {
            const todaviaExiste = registrosActuales.some(function (r) {
                return r.id === idAfectado;
            });

            if (!todaviaExiste) {
                mostrarMensaje('Confirmado: el registro sí fue eliminado del servidor.', 'ok');
                if (idEnEdicion === idAfectado) {
                    limpiarFormulario();
                }
            } else {
                mostrarMensaje('El registro aún existe en el servidor. No se pudo concretar la eliminación.', 'error');
            }
        }
    } catch (error) {
        mostrarMensaje('No se pudo determinar el estado con el servidor por fallas de conexión. Conservamos tus datos.', 'error');
    }
}

/**
 * Evento de envío del formulario: crear o editar según idEnEdicion.
 */
formulario.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    if (enviandoDatos) return;

    const errorValidacion = validarFormulario();
    if (errorValidacion) {
        mostrarMensaje(errorValidacion, 'error');
        return;
    }

    const payload = {
        rutina_id: parseInt(selectRutina.value, 10),
        fecha: inputFecha.value.trim(),
        duracion_min: parseInt(inputDuracion.value, 10),
        nota: inputNota.value.trim() || null
    };

    alternarBloqueoInterfaz(true);
    mostrarMensaje('');

    const esEdicion = Boolean(idEnEdicion);
    const idObjetivo = idEnEdicion;
    let filaConfirmada = null;

    try {
        if (esEdicion) {
            filaConfirmada = await editarRegistro(idObjetivo, payload);
        } else {
            filaConfirmada = await crearRegistro(payload);
        }
    } catch (error) {
        alternarBloqueoInterfaz(false);

        if (esErrorDeRed(error)) {
            await verificarResultadoIncierto(esEdicion ? 'editar' : 'crear', payload, idObjetivo);
        } else {
            // Error del servidor: conserva lo escrito y el id de edición
            mostrarMensaje(error.message, 'error');
        }
        return;
    }

    // Escritura confirmada con éxito por el servidor
    alternarBloqueoInterfaz(false);
    limpiarFormulario();
    mostrarMensaje(esEdicion ? 'Guardado correctamente.' : 'Guardado correctamente.', 'ok');

    // Consulta posterior separada
    try {
        todosLosRegistros = await listarRegistros();
        aplicarFiltro();
    } catch (errorListado) {
        mostrarAvisoFalloLecturaPosterior();
    }
});

/**
 * Botón para cancelar la edición en curso.
 */
btnCancelar.addEventListener('click', function () {
    if (enviandoDatos) return;
    limpiarFormulario();
    mostrarMensaje('');
});

/**
 * Solicita confirmación y ejecuta la eliminación del registro.
 * Se implementa borrado físico porque los registros de entrenamiento son datos
 * estrictamente personales del usuario y no tienen relaciones dependientes en otras tablas.
 */
async function solicitarEliminacion(registro) {
    if (enviandoDatos) return;

    const infoRutina = buscarRutinaPorId(Number(registro.rutina_id));
    const nombreRutina = infoRutina ? infoRutina.nombre : `Rutina #${registro.rutina_id}`;
    const fecha = registro.fecha || 'sin fecha';

    const confirmado = window.confirm(
        `¿Deseas eliminar el registro de "${nombreRutina}" del día ${fecha}?\nEsta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    alternarBloqueoInterfaz(true);
    mostrarMensaje('');

    try {
        await eliminarRegistro(registro.id);
    } catch (error) {
        alternarBloqueoInterfaz(false);

        if (esErrorDeRed(error)) {
            await verificarResultadoIncierto('eliminar', null, registro.id);
        } else {
            mostrarMensaje(error.message, 'error');
            // Si devuelve 0 filas o falló, refresca la lista para sincronizar
            try {
                todosLosRegistros = await listarRegistros();
                aplicarFiltro();
            } catch (_) {}
        }
        return;
    }

    // Eliminación confirmada de 1 fila
    alternarBloqueoInterfaz(false);

    if (idEnEdicion === registro.id) {
        limpiarFormulario();
    }

    mostrarMensaje('Registro eliminado correctamente.', 'ok');

    // Consulta posterior separada
    try {
        todosLosRegistros = await listarRegistros();
        aplicarFiltro();
    } catch (errorListado) {
        mostrarAvisoFalloLecturaPosterior();
    }
}

/**
 * Inicialización al cargar la página.
 */
async function iniciar() {
    const { data } = await cliente.auth.getSession();
    if (!data || !data.session) {
        window.location.href = 'login.html';
        return;
    }

    poblarSelectRutinas();
    inputFecha.value = new Date().toISOString().split('T')[0];

    inputBusqueda.addEventListener('input', aplicarFiltro);

    await cargarRegistros();
}

iniciar();
