create table respaldo_amenidades_20261028.dev_actividades as select * from public.actividades where false;
create table respaldo_amenidades_20261028.dev_traducciones as select * from public.actividades_traducciones where false;
create table respaldo_amenidades_20261028.equivalencias (origen_id bigint primary key, destino_id bigint not null, metodo text not null);
