-- Visitors may read published UI copy, but not the admin revision or any quotation data.
grant select (seccion, textos) on public.textos_configurables to anon;
grant select (seccion, idioma, textos) on public.textos_configurables_traducciones to anon;

alter policy textos_configurables_lectura on public.textos_configurables
  to anon, authenticated;
alter policy textos_configurables_traducciones_lectura on public.textos_configurables_traducciones
  to anon, authenticated;
