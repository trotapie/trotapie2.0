create schema if not exists respaldo_amenidades_20261028;
create table respaldo_amenidades_20261028.actividades as select * from public.actividades;
create table respaldo_amenidades_20261028.actividades_traducciones as select * from public.actividades_traducciones;
create table respaldo_amenidades_20261028.actividades_hotel as select * from public.actividades_hotel;
create table respaldo_amenidades_20261028.circuito_actividades as select * from public.circuito_actividades;
