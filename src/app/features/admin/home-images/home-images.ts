import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TravelDataService, Row, TravelRecord } from '../../../data/facades/travel-data.service';
import { FieldDefinition } from '../../../shared/models/resource-definition';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Button } from '../../../shared/components/button/button';
import { State } from '../../../shared/components/state/state';
import { ImageCard } from '../../../shared/components/image-card/image-card';
import { Dialog } from '../../../shared/components/dialog/dialog';
import { ResourceForm } from '../../../shared/components/resource-form/resource-form';
import { TpToastService } from '../../../shared/services/tp-toast.service';

@Component({
  imports: [PageHeader, Button, State, ImageCard, Dialog, ResourceForm],
  selector: 'tp-home-images',
  styleUrl: './home-images.scss',
  templateUrl: './home-images.html',
})
export class HomeImages implements OnInit {
  readonly data = inject(TravelDataService);
  private readonly toast = inject(TpToastService);
  readonly records = signal<TravelRecord[]>([]);
  readonly languages = signal<{id: number; codigo: string; nombre: string}[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly editorOpen = signal(false);
  readonly selected = signal<TravelRecord | null>(null);
  readonly value = signal<Row>({});
  readonly saving = signal(false);
  readonly editorError = signal('');
  readonly fields = computed<FieldDefinition[]>(() => [
    {key: 'nombre_destino', label: 'Nombre del destino', required: true},
    {key: 'url_imagen', label: 'URL de la imagen', type: 'url', required: true, imagePreview: true, hint: 'Pega el enlace público de la fotografía.'},
    {key: 'activo', label: 'Mostrar en el inicio', type: 'checkbox'},
    ...this.languages().filter(language => language.codigo !== 'es').map(language => ({key: 'translation_'+language.id, label: 'Nombre del destino · '+language.nombre}))
  ]);
  canEdit() { return this.data.auth.hasPermission('destinos.edit'); }
  ngOnInit() { void this.load(); }
  async load() {
    this.loading.set(true); this.error.set('');
    try {
      const [images, languages] = await Promise.all([this.data.legacy.obtenerImagenesFondoAdmin(), this.data.legacy.obtenerIdiomasAdmin()]);
      this.languages.set(languages);
      this.records.set(images.map(image => ({id: String(image.id), title: image.nombre_destino || 'Sin nombre', subtitle: 'Imagen del inicio', image: image.url_imagen, status: image.activo ? 'Activo' : 'Inactivo', raw: image})));
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No pudimos cargar las imágenes del inicio.'); }
    finally { this.loading.set(false); }
  }
  open(record: TravelRecord | null) {
    if (!this.canEdit()) return;
    this.selected.set(record); this.editorError.set('');
    const value: Row = record ? {...record.raw} : {activo: true};
    for (const translation of record?.raw['traducciones'] || []) value['translation_'+translation.idioma_id] = translation.nombre_destino;
    this.value.set(value); this.editorOpen.set(true);
  }
  async save(value: Row) {
    if (!this.canEdit() || this.saving()) return;
    this.saving.set(true); this.editorError.set('');
    try {
      const name = String(value['nombre_destino'] || '').trim();
      const url = String(value['url_imagen'] || '').trim();
      if (!name) throw new Error('Captura el nombre del destino.');
      let parsed: URL;
      try { parsed = new URL(url); } catch { throw new Error('Introduce una URL válida para la imagen.'); }
      if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('La imagen debe tener una URL HTTP o HTTPS.');
      // Preserve translations for languages not exposed by the editor.
      const translations = new Map<number, string>((this.selected()?.raw['traducciones'] || []).map((translation: Row) => [Number(translation['idioma_id']), String(translation['nombre_destino'] || '')]));
      for (const language of this.languages()) translations.set(language.id, language.codigo === 'es' ? name : String(value['translation_'+language.id] || '').trim());
      await this.data.legacy.guardarImagenFondoAdmin({id: this.selected() ? Number(this.selected()!.id) : null, nombre_destino: name, url_imagen: url, activo: !!value['activo'], traducciones: Array.from(translations, ([idioma_id, nombre_destino]) => ({idioma_id, nombre_destino}))});
      this.data.invalidate(); this.editorOpen.set(false);
      this.toast.success('La imagen del inicio se guardó correctamente.');
      await this.load();
    } catch (error) { this.editorError.set(error instanceof Error ? error.message : 'No pudimos guardar la imagen. Intenta nuevamente.'); }
    finally { this.saving.set(false); }
  }
}
