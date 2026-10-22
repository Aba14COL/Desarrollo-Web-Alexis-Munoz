// registros-api.js — Módulo de acceso a la API REST de Supabase para registros de entrenamiento
import { cliente } from './auth.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const ENDPOINT = `${SUPABASE_URL}/rest/v1/registros_entrenamiento`;

/**
 * Obtiene los headers requeridos para consultar el REST de Supabase,
 * incluyendo la clave pública y el token de acceso de la sesión actual.
 */
async function obtenerHeaders(esEscritura = false) {
    const { data, error } = await cliente.auth.getSession();
    if (error || !data || !data.session) {
        throw new Error('No hay una sesión activa para autenticar la petición');
    }

    const token = data.session.access_token;
    const headers = {
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    if (esEscritura) {
        headers['Prefer'] = 'return=representation';
    }

    return headers;
}

/**
 * Ejecuta una petición fetch controlando y clasificando los tipos de error:
 * distingue error de red (sin respuesta / resultado incierto) de error del servidor (status != 2xx).
 */
async function ejecutarFetch(url, opciones = {}) {
    let respuesta;
    try {
        respuesta = await fetch(url, opciones);
    } catch (error) {
        // Error de red, caída de conexión o petición cortada sin respuesta
        const errorRed = new Error('Error de red o sin conexión con el servidor. No se recibió respuesta.');
        errorRed.esErrorRed = true;
        throw errorRed;
    }

    if (!respuesta.ok) {
        let detalle = '';
        try {
            const errorJson = await respuesta.json();
            detalle = errorJson.message || errorJson.error || JSON.stringify(errorJson);
        } catch {
            detalle = respuesta.statusText || 'Error sin detalle';
        }
        const errorServidor = new Error(`Error del servidor (${respuesta.status}): ${detalle}`);
        errorServidor.esErrorRed = false;
        errorServidor.status = respuesta.status;
        throw errorServidor;
    }

    // Para peticiones DELETE o escrituras con contenido vacío
    const texto = await respuesta.text();
    return texto ? JSON.parse(texto) : [];
}

/**
 * Helper para saber si un error corresponde a un problema de red / falta de respuesta.
 */
export function esErrorDeRed(error) {
    return Boolean(error && error.esErrorRed);
}

/**
 * Obtiene la lista de registros del usuario autenticado ordenados por fecha descendente.
 */
export async function listarRegistros() {
    try {
        const headers = await obtenerHeaders(false);
        const url = `${ENDPOINT}?order=fecha.desc,creado_en.desc`;
        const datos = await ejecutarFetch(url, {
            method: 'GET',
            headers
        });
        return Array.isArray(datos) ? datos : [];
    } catch (error) {
        throw error;
    }
}

/**
 * Inserta un nuevo registro de entrenamiento.
 * Verifica que Supabase devuelva exactamente una fila creada.
 */
export async function crearRegistro(datos) {
    try {
        const headers = await obtenerHeaders(true);
        const respuesta = await ejecutarFetch(ENDPOINT, {
            method: 'POST',
            headers,
            body: JSON.stringify(datos)
        });

        if (!Array.isArray(respuesta) || respuesta.length !== 1) {
            throw new Error('No se pudo verificar la creación del registro');
        }

        return respuesta[0];
    } catch (error) {
        throw error;
    }
}

/**
 * Modifica un registro existente filtrando estrictamente por su id.
 * Si no encuentra la fila, lanza error específico y nunca crea registros nuevos.
 */
export async function editarRegistro(id, cambios) {
    try {
        if (!id) {
            throw new Error('Se requiere el id del registro para editar');
        }

        const headers = await obtenerHeaders(true);
        const url = `${ENDPOINT}?id=eq.${encodeURIComponent(id)}`;
        const respuesta = await ejecutarFetch(url, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(cambios)
        });

        if (!Array.isArray(respuesta) || respuesta.length === 0) {
            throw new Error('no se encontró el registro');
        }

        if (respuesta.length !== 1) {
            throw new Error('Se actualizó un número inesperado de registros');
        }

        return respuesta[0];
    } catch (error) {
        throw error;
    }
}

/**
 * Elimina un registro existente filtrando obligatoriamente por su id.
 * Confirma que afectó exactamente 1 fila antes de finalizar.
 */
export async function eliminarRegistro(id) {
    try {
        if (!id) {
            throw new Error('Se requiere el id del registro para eliminar');
        }

        const headers = await obtenerHeaders(true);
        const url = `${ENDPOINT}?id=eq.${encodeURIComponent(id)}`;
        const respuesta = await ejecutarFetch(url, {
            method: 'DELETE',
            headers
        });

        if (!Array.isArray(respuesta) || respuesta.length !== 1) {
            throw new Error('No se pudo eliminar el registro o ya no existe');
        }

        return respuesta[0];
    } catch (error) {
        throw error;
    }
}
