-- Esquema para la tabla de registros de entrenamiento en FitPlan
-- Define la estructura de datos y las políticas de seguridad por fila (RLS).

create table if not exists registros_entrenamiento (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    rutina_id int not null,
    fecha date not null default current_date,
    duracion_min int not null check (duracion_min > 0),
    nota text,
    creado_en timestamptz not null default now()
);

-- Habilitar seguridad de nivel de fila para restringir el acceso a los datos
alter table registros_entrenamiento enable row level security;

-- Política 1 (SELECT): Permite a los usuarios autenticados consultar únicamente sus propios registros.
-- El filtro auth.uid() = user_id impide que un usuario lea los entrenamientos de otras personas.
create policy "Los usuarios pueden ver sus propios registros"
on registros_entrenamiento
for select
to authenticated
using (auth.uid() = user_id);

-- Política 2 (INSERT): Permite a los usuarios autenticados registrar nuevos entrenamientos propios.
-- La verificación with check garantiza que el user_id asignado sea exactamente el del usuario autenticado.
create policy "Los usuarios pueden crear sus propios registros"
on registros_entrenamiento
for insert
to authenticated
with check (auth.uid() = user_id);

-- Política 3 (UPDATE): Permite a los usuarios autenticados editar solo sus entrenamientos existentes.
-- using verifica la propiedad actual de la fila y with check previene transferir el registro a otro usuario.
create policy "Los usuarios pueden editar sus propios registros"
on registros_entrenamiento
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Política 4 (DELETE): Permite a los usuarios autenticados borrar únicamente sus propios registros.
-- using asegura que un usuario no pueda eliminar registros pertenecientes a otras cuentas.
create policy "Los usuarios pueden eliminar sus propios registros"
on registros_entrenamiento
for delete
to authenticated
using (auth.uid() = user_id);
