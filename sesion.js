// sesion.js — se carga en TODAS las páginas de FitPlan.
// Hace tres cosas:
//   1. Procesa el retorno de Google (el token llega en la URL) y guarda la sesión.
//   2. Muestra en la cabecera si hay sesión (saludo + Cerrar sesión) o no.
//   3. Reacciona si inicias o cierras sesión en otra pestaña.

const zona = document.getElementById('zona-sesion')
const cabecera = document.querySelector('.site-header')
const botonMenu = document.querySelector('.nav-toggle')

// Menú móvil (no depende de Supabase)
if (botonMenu && cabecera) {
    botonMenu.addEventListener('click', function () {
        const abierto = cabecera.classList.toggle('abierto')
        botonMenu.setAttribute('aria-expanded', String(abierto))
    })
}

function nombreVisible(usuario) {
    const meta = usuario.user_metadata || {}
    const nombre = meta.nombre || meta.full_name || meta.name || (usuario.email || '').split('@')[0]
    return nombre.split(' ')[0]
}

function crearEnlace(texto, href, clases) {
    const a = document.createElement('a')
    a.href = href
    a.className = clases
    a.textContent = texto
    return a
}

// Dibuja la cabecera según haya sesión o no. Es síncrona a propósito.
function pintar(sesion, alSalir) {
    // Elementos que solo ven visitantes (ej. "Crear cuenta") o solo usuarios con sesión
    document.querySelectorAll('[data-solo-visitante]').forEach(function (el) { el.hidden = Boolean(sesion) })
    document.querySelectorAll('[data-solo-sesion]').forEach(function (el) { el.hidden = !sesion })

    if (!zona) return
    zona.replaceChildren()

    if (sesion) {
        const saludo = document.createElement('span')
        saludo.className = 'saludo'
        saludo.append('Hola, ')
        const nombre = document.createElement('strong')
        nombre.textContent = nombreVisible(sesion.user)
        saludo.append(nombre)

        const salir = document.createElement('button')
        salir.type = 'button'
        salir.className = 'btn btn-borde btn-sm'
        salir.textContent = 'Cerrar sesión'
        salir.addEventListener('click', alSalir)

        zona.append(saludo, salir)
    } else {
        zona.append(
            crearEnlace('Iniciar sesión', 'login.html', 'btn btn-borde btn-sm'),
            crearEnlace('Únete', 'registro.html', 'btn btn-primario btn-sm')
        )
    }
}

async function iniciar() {
    let cliente, cerrarSesion
    try {
        // Si el SDK o config.js fallan, la página sigue funcionando como visitante
        ({ cliente, cerrarSesion } = await import('./auth.js'))
    } catch (error) {
        console.error('No se pudo iniciar Supabase:', error.message)
        pintar(null)
        return
    }

    async function alSalir() {
        try { await cerrarSesion() } catch (error) { console.error('No se pudo cerrar la sesión:', error.message) }
        location.href = 'index.html'
    }

    // getSession espera a que el SDK procese el retorno de Google antes de responder
    const { data } = await cliente.auth.getSession()
    pintar(data.session, alSalir)

    // Cambios posteriores: iniciar, cerrar, token renovado o acción en otra pestaña
    cliente.auth.onAuthStateChange(function (evento, sesion) {
        pintar(sesion, alSalir)
    })
}

iniciar()
