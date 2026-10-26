import { Component, OnInit, computed, inject, signal, isDevMode, viewChild } from '@angular/core';
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
import { translateHomeImage } from './translate-home-image';
import { processHomeImages, type HomeImageBulkAction, type HomeImageBulkResult } from './bulk-home-images';

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
  readonly translating = signal(false);
  readonly deleteTarget = signal<TravelRecord | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal('');
  readonly checkedIds = signal<ReadonlySet<string>>(new Set());
  readonly selectionMode = signal(false);
  readonly checkedRecords = computed(() => this.records().filter(record => this.checkedIds().has(record.id)));
  readonly allChecked = computed(() => this.records().length > 0 && this.checkedRecords().length === this.records().length);
  readonly bulkDeletingOpen = signal(false);
  readonly bulkBusy = signal(false);
  readonly bulkProgress = signal<{completed: number; total: number} | null>(null);
  readonly bulkResult = signal<HomeImageBulkResult | null>(null);
  readonly actionsLocked = computed(() => this.loading() || this.importing() || this.saving() || this.translating() || this.deleting() || this.bulkBusy());
  readonly translationsOpen = signal(false);
  readonly translationsError = signal('');
  readonly savedTranslations = computed(() => this.languages()
    .filter(language => language.codigo !== 'es')
    .map(language => ({
      id: language.id,
      code: language.codigo,
      name: language.nombre,
      text: String(this.selected()?.raw['traducciones']?.find((translation: Row) => Number(translation['idioma_id']) === language.id)?.nombre_destino || '').trim(),
    })));
  private readonly editor = viewChild(ResourceForm);
  driveFolder = '';
  readonly importOpen = signal(false);
  readonly importing = signal(false);
  readonly importError = signal('');
  readonly importResult = signal<DriveImportResult | null>(null);
  readonly importProgress = signal<{completed: number; total: number} | null>(null);
  private readonly pendingImport = protectUnsavedChanges(
    () => this.editorOpen() && !!this.editor()?.hasChanges(),
    () => this.importing() || this.translating() || this.saving() || this.deleting() || this.bulkBusy(),
  );
  canDeactivate() { return this.pendingImport.confirm(); }
  readonly fields = computed<FieldDefinition[]>(() => [
    {key: 'nombre_destino', label: 'Nombre del destino', required: true, textPreview: true},
    {key: 'url_imagen', label: 'URL de la imagen', type: 'url', required: true, imagePreview: true, hint: 'Pega el enlace público de la fotografía.'},
    {key: 'activo', label: 'Mostrar en el inicio', type: 'checkbox'},
  ]);
  canEdit() { return this.data.auth.hasPermission('destinos.edit'); }
  async previewTranslations() {
    if (this.actionsLocked() || !this.editorOpen()) return;
    this.translationsError.set('');
    this.translationsOpen.set(true);
    const record = this.selected();
    if (!record || !this.canEdit()) return;
    this.translating.set(true);
    this.pendingImport.sync();
    try {
      // Consult persisted values, not the editor draft. A previous attempt may have saved some languages.
      const images = await this.data.legacy.obtenerImagenesFondoAdmin();
      const image = images.find(image => String(image.id) === record.id);
      if (!image) throw new Error('La imagen ya no existe o no tienes permisos para consultarla.');
      const current = {...record, raw: image};
      this.selected.set(current);
      const missing = this.languages().filter(language => language.codigo !== 'es' &&
        !image.traducciones?.some(translation => Number(translation.idioma_id) === language.id && translation.nombre_destino?.trim()));
      if (!missing.length) return;
      const prepared = await translateHomeImage({nombre_destino: image.nombre_destino}, missing,
        payload => this.data.legacy.traducirDesdeEspanol(payload), () => true);
      if (!prepared) return;
      const translations = missing.map(language => ({idioma_id: language.id, nombre_destino: String(prepared['translation_'+language.id])}));
      if (!this.canEdit()) throw new Error('No tienes permiso para guardar traducciones.');
      await this.data.legacy.completarTraduccionesImagenFondoAdmin(Number(record.id), translations);
      const refreshed = await this.data.legacy.obtenerImagenesFondoAdmin();
      const saved = refreshed.find(image => String(image.id) === record.id);
      if (!saved) throw new Error('No pudimos consultar las traducciones guardadas. Intenta nuevamente.');
      this.selected.set({...record, raw: saved});
      this.records.update(records => records.map(item => item.id === record.id ? {...item, raw: saved} : item));
      this.data.invalidate();
    } catch (error) {
      this.translationsError.set(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'No pudimos completar las traducciones. Intenta nuevamente.');
    } finally {
      this.translating.set(false);
      this.pendingImport.sync();
    }
  }
  toggleSelectionMode() {
    if (!this.canEdit() || this.actionsLocked() || this.bulkDeletingOpen()) return;
    this.selectionMode.update(enabled => !enabled);
    this.checkedIds.set(new Set());
  }
  toggleChecked(id: string) {
    if (!this.canEdit() || !this.selectionMode() || this.actionsLocked() || this.bulkDeletingOpen()) return;
    this.checkedIds.update(ids => { const next = new Set(ids); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  selectAll() {
    if (!this.canEdit() || this.actionsLocked() || this.bulkDeletingOpen()) return;
    this.checkedIds.set(new Set(this.records().map(record => record.id)));
  }
  clearSelection() {
    if (!this.canEdit() || this.actionsLocked() || this.bulkDeletingOpen()) return;
    this.checkedIds.set(new Set());
  }
  requestBulkDelete() {
    if (!this.canEdit() || this.actionsLocked() || !this.checkedRecords().length || this.editorOpen() || this.importOpen() || this.deleteTarget()) return;
    this.bulkResult.set(null);
    this.bulkDeletingOpen.set(true);
  }
  closeBulkDelete() { if (!this.bulkBusy()) this.bulkDeletingOpen.set(false); }
  async runBulk(action: HomeImageBulkAction) {
    if (!this.canEdit() || this.actionsLocked() || this.editorOpen() || this.importOpen() || this.deleteTarget() || !this.checkedRecords().length) return;
    if ((action === 'delete') !== this.bulkDeletingOpen()) return;
    const images = this.checkedRecords().map(record => ({id: record.id, title: record.title, active: !!record.raw['activo']}));
    this.bulkBusy.set(true);
    this.bulkResult.set(null);
    this.pendingImport.sync();
    try {
      const result = await processHomeImages(images, action, async (id, operation) => {
        if (!this.canEdit()) throw new Error('No tienes permiso para modificar imágenes.');
        if (operation === 'delete') await this.data.legacy.eliminarImagenFondoAdmin(id);
        else await this.data.legacy.actualizarEstadoImagenFondoAdmin(id, operation === 'activate');
      }, (completed, total) => this.bulkProgress.set({completed, total}));
      const succeeded = new Set(result.succeeded);
      this.records.update(records => action === 'delete'
        ? records.filter(record => !succeeded.has(record.id))
        : records.map(record => succeeded.has(record.id) ? {...record, status: action === 'activate' ? 'Activo' : 'Inactivo', raw: {...record.raw, activo: action === 'activate'}} : record));
      this.checkedIds.set(new Set(result.failed.map(failure => failure.id)));
      this.bulkResult.set(result);
      this.bulkDeletingOpen.set(false);
      this.data.invalidate();
      if (result.failed.length) this.toast.warning('La operación terminó con errores. Las imágenes fallidas siguen seleccionadas para reintentar.');
      else this.toast.success('La operación se completó correctamente.');
    } finally {
      this.bulkBusy.set(false);
      this.bulkProgress.set(null);
      this.pendingImport.sync();
    }
  }
  requestDelete(record: TravelRecord) {
    if (!this.canEdit() || this.actionsLocked() || this.bulkDeletingOpen() || this.editorOpen()) return;
    this.deleteError.set('');
    this.deleteTarget.set(record);
  }
  closeDelete() {
    if (!this.deleting()) this.deleteTarget.set(null);
  }
  async confirmDelete() {
    const record = this.deleteTarget();
    if (!record || !this.canEdit() || this.actionsLocked()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.pendingImport.sync();
    try {
      await this.data.legacy.eliminarImagenFondoAdmin(Number(record.id));
      this.records.update(records => records.filter(image => image.id !== record.id));
      this.checkedIds.update(ids => new Set([...ids].filter(id => id !== record.id)));
      this.data.invalidate();
      this.deleteTarget.set(null);
      this.toast.success('La imagen se eliminó de Trotapie. El archivo de Google Drive se conserva.');
    } catch (error) {
      this.deleteError.set(error && typeof error === 'object' && 'message' in error
        ? String(error.message) : 'No pudimos eliminar la imagen. Intenta nuevamente.');
    } finally {
      this.deleting.set(false);
      this.pendingImport.sync();
    }
  }
  openDriveImport() {
    if (!this.canEdit() || this.actionsLocked() || this.bulkDeletingOpen() || this.editorOpen() || this.deleteTarget()) return;
    this.importOpen.set(true);
  }
  closeDriveImport() {
    if (!this.importing()) this.importOpen.set(false);
  }
  async importDrive() {
    if (!this.canEdit() || !this.importOpen() || this.actionsLocked() || this.bulkDeletingOpen() || this.editorOpen() || !this.driveFolder.trim()) return;
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
      if (this.importResult() && !this.importResult()!.failed.length && !this.importError()) {
        this.driveFolder = '';
        this.importResult.set(null);
        this.importProgress.set(null);
        this.importError.set('');
        this.importOpen.set(false);
      }
      this.pendingImport.sync();
    }
  }
  ngOnInit() { void this.load(); }
  async load() {
    if (this.bulkBusy() || this.deleting() || this.bulkDeletingOpen()) return;
    this.loading.set(true); this.error.set('');
    try {
      const [images, languages] = await Promise.all([this.data.legacy.obtenerImagenesFondoAdmin(), this.data.legacy.obtenerIdiomasAdmin()]);
      this.languages.set(languages);
      this.records.set(images.map(image => ({id: String(image.id), title: image.nombre_destino || 'Sin nombre', subtitle: 'Imagen del inicio', image: image.url_imagen, status: image.activo ? 'Activo' : 'Inactivo', raw: image})));
      this.checkedIds.update(ids => new Set([...ids].filter(id => this.records().some(record => record.id === id))));
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No pudimos cargar las imágenes del inicio.'); }
    finally { this.loading.set(false); }
  }
  open(record: TravelRecord | null) {
    if (!this.canEdit() || this.actionsLocked() || this.bulkDeletingOpen() || this.deleteTarget()) return;
    this.selected.set(record); this.editorError.set('');
    this.translationsOpen.set(false);
    const value: Row = record ? {...record.raw} : {activo: true};
    for (const translation of record?.raw['traducciones'] || []) value['translation_'+translation.idioma_id] = translation.nombre_destino;
    this.value.set(value); this.editorOpen.set(true);
  }
  closeEditor() {
    if (this.pendingImport.confirm()) this.editorOpen.set(false);
  }
  async save(value: Row) {
    if (!this.canEdit() || this.actionsLocked() || this.bulkDeletingOpen()) return;
    this.saving.set(true); this.editorError.set('');
    this.pendingImport.sync();
    try {
      const name = String(value['nombre_destino'] || '').trim();
      const url = String(value['url_imagen'] || '').trim();
      if (!name) throw new Error('Captura el nombre del destino.');
      let parsed: URL;
      try { parsed = new URL(url); } catch { throw new Error('Introduce una URL válida para la imagen.'); }
      if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('La imagen debe tener una URL HTTP o HTTPS.');
      let prepared = value;
      if (this.languages().some(language => language.codigo !== 'es')) {
        this.translating.set(true);
        prepared = await translateHomeImage(value, this.languages(),
          payload => this.data.legacy.traducirDesdeEspanol(payload), () => true) || value;
        this.translating.set(false);
      }
      // Preserve translations for languages outside the current catalog.
      const translations = new Map<number, string>((this.selected()?.raw['traducciones'] || []).map((translation: Row) => [Number(translation['idioma_id']), String(translation['nombre_destino'] || '')]));
      for (const language of this.languages()) translations.set(language.id, language.codigo === 'es' ? name : String(prepared['translation_'+language.id] || '').trim());
      await this.data.legacy.guardarImagenFondoAdmin({id: this.selected() ? Number(this.selected()!.id) : null, nombre_destino: name, url_imagen: url, activo: !!value['activo'], traducciones: Array.from(translations, ([idioma_id, nombre_destino]) => ({idioma_id, nombre_destino}))});
      this.data.invalidate(); this.editorOpen.set(false);
      this.toast.success('La imagen del inicio se guardó correctamente.');
      await this.load();
    } catch (error) { this.editorError.set(error instanceof Error ? error.message : 'No pudimos guardar la imagen. Intenta nuevamente.'); }
    finally { this.translating.set(false); this.saving.set(false); this.pendingImport.sync(); }
  }
}
