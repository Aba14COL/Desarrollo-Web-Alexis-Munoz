// progreso.js — Gestión de la vista de progreso y registros de entrenamiento
import { cliente } from './auth.js';
import { rutinas, buscarRutinaPorId } from './datos.js';
import { listarRegistros } from './registros-api.js';

// Elementos del DOM
const selectRutina = document.getElementById('rutina');
const inputFecha = document.getElementById('fecha');
const inputDuracion = document.getElementById('duracion');
const inputNota = document.getElementById('nota');
const btnGuardar = document.getElementById('btn-guardar');
const btnCancelar = document.getElementById('btn-cancelar');
const inputBusqueda = document.getElementById('busqueda');
const mensajeProgreso = document.getElementById('mensaje-progreso');
const listaRegistros = document.getElementById('lista-registros');

// Estado local de los registros cargados
let todosLosRegistros = [];

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
 * Muestra u oculta mensajes de estado generales.
 */
function mostrarMensaje(texto, tipo = '') {
    mensajeProgreso.textContent = texto;
    mensajeProgreso.className = tipo ? `mensaje ${tipo}` : 'mensaje';
}

/**
 * Dibuja la lista de tarjetas de entrenamiento en el contenedor.
 * Todo el contenido dinámico se crea con createElement y textContent.
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
        btnEditar.dataset.id = registro.id;

        const btnEliminar = document.createElement('button');
        btnEliminar.type = 'button';
        btnEliminar.className = 'btn btn-borde btn-sm';
        btnEliminar.textContent = 'Eliminar';
        btnEliminar.dataset.id = registro.id;

        acciones.append(btnEditar, btnEliminar);
        tarjeta.append(acciones);

        listaRegistros.appendChild(tarjeta);
    });
}

/**
 * Filtra los registros en memoria usando el texto del campo de búsqueda.
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
 * Consulta los registros al REST de Supabase y maneja los estados de carga, vacío y error.
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
 * Inicialización de la página: comprobación de sesión y arranque de lectura.
 */
async function iniciar() {
    // Si no hay sesión iniciada, redirige a login
    const { data } = await cliente.auth.getSession();
    if (!data || !data.session) {
        window.location.href = 'login.html';
        return;
    }

    // Configuración inicial de formulario
    poblarSelectRutinas();
    inputFecha.value = new Date().toISOString().split('T')[0];

    // Conectar buscador
    inputBusqueda.addEventListener('input', aplicarFiltro);

    // Cargar listado inicial
    await cargarRegistros();
}

iniciar();
