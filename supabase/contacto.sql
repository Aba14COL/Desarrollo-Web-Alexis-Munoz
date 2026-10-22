-- Tabla para almacenar los mensajes enviados desde el formulario de contacto
create table if not exists mensajes_contacto (
    id uuid primary key default gen_random_uuid(),
    nombre text not null check (char_length(nombre) between 1 and 100),
    correo text not null check (char_length(correo) between 3 and 150),
    asunto text not null check (char_length(asunto) between 1 and 150),
    mensaje text not null check (char_length(mensaje) between 1 and 1000),
    creado_en timestamptz not null default now()
);

-- Habilitar seguridad a nivel de fila (RLS)
alter table mensajes_contacto enable row level security;

-- Política de inserción pública:
-- Se permite insertar mensajes a cualquier visitante (anon) y usuario autenticado (authenticated).
-- No se definen políticas de SELECT, UPDATE ni DELETE para que nadie pueda consultar ni alterar
-- los mensajes desde el navegador, garantizando la privacidad de quienes contactan a FitPlan.
create policy "Cualquiera puede enviar mensajes de contacto"
on mensajes_contacto
for insert
to anon, authenticated
with check (true);
