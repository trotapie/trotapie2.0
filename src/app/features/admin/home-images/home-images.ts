import { Component, OnInit, computed, inject, signal, isDevMode } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TravelDataService, Row, TravelRecord } from '../../../data/facades/travel-data.service';
import { FieldDefinition } from '../../../shared/models/resource-definition';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Button } from '../../../shared/components/button/button';
import { State } from '../../../shared/components/state/state';
import { ImageCard } from '../../../shared/components/image-card/image-card';
import { Dialog } from '../../../shared/components/dialog/dialog';
import { ResourceForm } from '../../../shared/components/resource-form/resource-form';
import { TpToastService } from '../../../shared/services/tp-toast.service';
import { Field } from '../../../shared/components/field/field';
import { protectUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';
import { importHomeImages, type DriveImportResult } from './drive-import';

@Component({
  imports: [PageHeader, Button, State, ImageCard, Dialog, ResourceForm, FormsModule, Field],
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
  driveFolder = '';
  readonly importOpen = signal(false);
  readonly importing = signal(false);
  readonly importError = signal('');
  readonly importResult = signal<DriveImportResult | null>(null);
  readonly importProgress = signal<{completed: number; total: number} | null>(null);
  private readonly pendingImport = protectUnsavedChanges(() => false, () => this.importing());
  canDeactivate() { return this.pendingImport.confirm(); }
  readonly fields = computed<FieldDefinition[]>(() => [
    {key: 'nombre_destino', label: 'Nombre del destino', required: true},
    {key: 'url_imagen', label: 'URL de la imagen', type: 'url', required: true, imagePreview: true, hint: 'Pega el enlace público de la fotografía.'},
    {key: 'activo', label: 'Mostrar en el inicio', type: 'checkbox'},
    ...this.languages().filter(language => language.codigo !== 'es').map(language => ({key: 'translation_'+language.id, label: 'Nombre del destino · '+language.nombre}))
  ]);
  canEdit() { return this.data.auth.hasPermission('destinos.edit'); }
  openDriveImport() {
    if (!this.canEdit() || this.loading() || this.saving() || this.importing() || this.editorOpen()) return;
    this.importOpen.set(true);
  }
  closeDriveImport() {
    if (!this.importing()) this.importOpen.set(false);
  }
  async importDrive() {
    if (!this.canEdit() || !this.importOpen() || this.importing() || this.saving() || this.editorOpen() || this.loading() || !this.driveFolder.trim()) return;
    this.importing.set(true);
    this.pendingImport.sync();
    this.importError.set('');
    this.importResult.set(null);
    this.importProgress.set(null);
    try {
      // Re-read the catalog: the page may have been open while another user added images.
      const [folders, existing] = await Promise.all([
        this.data.legacy.obtenerImagenesInicioDesdeDrive(this.driveFolder.trim()),
        this.data.legacy.obtenerImagenesFondoAdmin(),
      ]);
      const result = await importHomeImages(folders, existing.map(image => image.url_imagen), image => {
        if (!this.canEdit()) throw new Error('No tienes permiso para importar imágenes.');
        if (isDevMode()) console.log('[Drive inicio] Datos enviados a guardar', structuredClone(image));
        return this.data.legacy.agregarImagenFondoDesdeDriveAdmin(image);
      }, (completed, total) => this.importProgress.set({completed, total}));
      this.importResult.set(result);
      if (isDevMode()) console.log('[Drive inicio] Resultado de importación', structuredClone(result));
      if (!result.failed.length) this.toast.success(`Importación completada: ${result.added} agregadas, ${result.skipped} omitidas.`);
      else this.toast.warning('La importación terminó con errores. Revisa el resultado antes de reintentar.');
    } catch (error) {
      this.importError.set(error && typeof error === 'object' && 'message' in error
        ? String(error.message) : 'No pudimos consultar Drive. Verifica el enlace y los permisos de la carpeta e intenta nuevamente.');
    } finally {
      // Refresh even after partial failures; do not leave successful writes hidden.
      this.data.invalidate();
      await this.load();
      this.importing.set(false);
      this.pendingImport.sync();
    }
  }
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
    if (!this.canEdit() || this.importing() || this.saving()) return;
    this.selected.set(record); this.editorError.set('');
    const value: Row = record ? {...record.raw} : {activo: true};
    for (const translation of record?.raw['traducciones'] || []) value['translation_'+translation.idioma_id] = translation.nombre_destino;
    this.value.set(value); this.editorOpen.set(true);
  }
  async save(value: Row) {
    if (!this.canEdit() || this.saving() || this.importing()) return;
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
