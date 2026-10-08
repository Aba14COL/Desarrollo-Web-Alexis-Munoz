// auth.js — cliente único de Supabase para todo FitPlan
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js'

export const cliente = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    { auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
)

// Todo vuelve al inicio (esa es la URL autorizada en Supabase)
const INICIO = new URL('index.html', window.location.href).href

export async function entrarConGoogle() {
    const { error } = await cliente.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: INICIO }
    })
    if (error) throw error
}

export async function registrarConCorreo(nombre, correo, password) {
    const { data, error } = await cliente.auth.signUp({
        email: correo,
        password,
        options: { data: { nombre }, emailRedirectTo: INICIO }
    })
    if (error) throw error
    return data // data.session es null si Supabase exige confirmar el correo
}

export async function entrarConCorreo(correo, password) {
    const { data, error } = await cliente.auth.signInWithPassword({
        email: correo,
        password
    })
    if (error) throw error
    return data
}

export async function cerrarSesion() {
    const { error } = await cliente.auth.signOut({ scope: 'local' })
    if (error) throw error
}