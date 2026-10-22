// contacto.js — Envío de mensajes desde el formulario de contacto a Supabase

const formulario = document.getElementById('contacto-form');
const inputNombre = document.getElementById('nombre-contacto');
const inputCorreo = document.getElementById('correo-contacto');
const inputAsunto = document.getElementById('asunto');
const inputMensaje = document.getElementById('mensaje');
const pMensaje = document.getElementById('mensaje-contacto');
const btnEnviar = formulario ? formulario.querySelector('button[type="submit"]') : null;

let cliente, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY;

/**
 * Muestra mensajes con estilos del sistema (ok, error, suave).
 */
function mostrarMensaje(texto, tipo = '') {
    if (!pMensaje) return;
    pMensaje.textContent = texto;
    pMensaje.className = tipo ? `mensaje ${tipo}` : 'mensaje';
}

/**
 * Valida los 4 campos del formulario según límites de tamaño y formato.
 */
function validarFormulario(nombre, correo, asunto, mensaje) {
    if (!nombre || nombre.length > 100) {
        return 'Por favor ingresa tu nombre (máximo 100 caracteres).';
    }

    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correo || correo.length < 3 || correo.length > 150 || !regexCorreo.test(correo)) {
        return 'Por favor ingresa un correo electrónico válido.';
    }

    if (!asunto || asunto.length > 150) {
        return 'Por favor ingresa un asunto (máximo 150 caracteres).';
    }

    if (!mensaje || mensaje.length > 1000) {
        return 'Por favor escribe tu mensaje (máximo 1000 caracteres).';
    }

    return null;
}

/**
 * Inicializa el módulo cargando dependencias y conectando el evento de envío.
 */
async function iniciar() {
    try {
        const authModulo = await import('./auth.js');
        const configModulo = await import('./config.js');
        cliente = authModulo.cliente;
        SUPABASE_URL = configModulo.SUPABASE_URL;
        SUPABASE_PUBLISHABLE_KEY = configModulo.SUPABASE_PUBLISHABLE_KEY;
    } catch (error) {
        mostrarMensaje('Error al cargar la configuración de envío. Por favor intenta más tarde.', 'error');
        return;
    }

    if (!formulario) return;

    formulario.addEventListener('submit', async function (evento) {
        evento.preventDefault();

        const nombre = (inputNombre.value || '').trim();
        const correo = (inputCorreo.value || '').trim();
        const asunto = (inputAsunto.value || '').trim();
        const mensaje = (inputMensaje.value || '').trim();

        const errorValidacion = validarFormulario(nombre, correo, asunto, mensaje);
        if (errorValidacion) {
            mostrarMensaje(errorValidacion, 'error');
            return;
        }

        if (btnEnviar) btnEnviar.disabled = true;
        mostrarMensaje('');

        // Armar headers para Supabase REST
        const headers = {
            'apikey': SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        };

        // Si hay una sesión activa, incluir el token de autorización
        try {
            const { data } = await cliente.auth.getSession();
            if (data && data.session && data.session.access_token) {
                headers['Authorization'] = `Bearer ${data.session.access_token}`;
            }
        } catch (_) {}

        const endpoint = `${SUPABASE_URL}/rest/v1/mensajes_contacto`;
        const payload = {
            nombre,
            correo,
            asunto,
            mensaje
        };

        let respuesta;
        try {
            respuesta = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });
        } catch (errorRed) {
            if (btnEnviar) btnEnviar.disabled = false;
            mostrarMensaje('No recibí confirmación; revisa tu conexión. Tus datos se conservan, y si no estás seguro de que se envió, espera antes de reenviar.', 'error');
            return;
        }

        if (btnEnviar) btnEnviar.disabled = false;

        if (respuesta.ok) {
            mostrarMensaje('Mensaje enviado. Gracias por escribirnos.', 'ok');
            formulario.reset();
        } else {
            let detalle = '';
            try {
                const errorJson = await respuesta.json();
                detalle = errorJson.message || errorJson.error || '';
            } catch (_) {}
            mostrarMensaje(`Error al enviar mensaje (${respuesta.status}): ${detalle || 'Intenta de nuevo.'}`, 'error');
        }
    });
}

iniciar();
