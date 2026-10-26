import {NavIndicatorDirective} from '../../../shared/directives/nav-indicator.directive';
import {ImagenesCarruselComponent} from '../../../shared/components/imagenes-carrusel/imagenes-carrusel.component';
import {RangeSlider} from '../../../shared/components/range-slider/range-slider';
import {Dialog} from '../../../shared/components/dialog/dialog';
import {FormsModule} from '@angular/forms';
import {TpInputComponent} from '../../../shared/components/tp-input/tp-input.component';
import {TpSelectSearchComponent} from '../../../shared/components/tp-select-search/tp-select-search.component';
import {GridColumnsDirective} from '../../../shared/directives/grid-columns.directive';
import { DestinationFacts } from '../../destinations/components/destination-facts/destination-facts';
import { destinationPhotos } from '../../destinations/utils/destination-photos';
import { PhotoCarousel } from '../../../shared/components/photo-carousel/photo-carousel';
import { HotelSuggestions } from '../../hotels/components/hotel-suggestions/hotel-suggestions';
import { Component, computed, inject, signal, OnInit, OnDestroy, ElementRef, viewChild, afterNextRender, afterRenderEffect } from '@angular/core';
import { gsap } from 'gsap';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { PublicTravelService } from '../../../data/public/public-travel.service';
import { PublicBrowseStateService } from '../../../data/public/public-browse-state.service';
import { TravelRecord, Page, normalizeRecord } from '../../../data/models/travel-record';
import { shuffleArray } from '../../../core/utils/random-sample';
import { Button } from '../../../shared/components/button/button';
import { Icon } from '../../../shared/components/icon/icon';
import { ImageCard } from '../../../shared/components/image-card/image-card';
import { State } from '../../../shared/components/state/state';
import { FilterBar } from '../../../shared/components/filter-bar/filter-bar';
import { LocationMap } from '../../../shared/components/location-map/location-map';
import { BackButton } from '../../../shared/components/back-button/back-button';
import { ThemeToggle } from '../../../shared/components/theme-toggle/theme-toggle';
import { LanguageMenu } from '../../../shared/components/language-menu/language-menu';
import { PublicFooter } from '../../../shared/components/public-footer/public-footer';
import { QuickFilters } from '../../../shared/components/quick-filters/quick-filters';
import { HotelInformation } from '../../hotels/components/hotel-information/hotel-information';
import {InternationalFilters} from '../../../shared/components/international-filters/international-filters';
import {InternationalCountry} from '../../../data/models/international-geography';
const normalizeExperience = (value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
@Component({
  selector: 'tp-public',
  imports: [NavIndicatorDirective,RangeSlider,Dialog,FormsModule,TpInputComponent,TpSelectSearchComponent,
    GridColumnsDirective,ImagenesCarruselComponent,
    InternationalFilters,
    HotelInformation,
    QuickFilters,
    PublicFooter,
    ThemeToggle,
    LanguageMenu,
    BackButton,
    RouterLink,
    Button,
    Icon,
    ImageCard,
    State,
    FilterBar,
    DestinationFacts,
    PhotoCarousel,
    HotelSuggestions,
    LocationMap,
  ],
  templateUrl: './public.html',
  styleUrl: './public.scss',
})
export class PublicPage implements OnInit, OnDestroy {
  data = inject(PublicTravelService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  private startAtHome = (this.router.currentNavigation()?.extras.info as {publicSection?:string} | undefined)?.publicSection === 'home';
  private browseStates = inject(PublicBrowseStateService);
  private browseKey = '/' + this.route.snapshot.pathFromRoot.flatMap(route=>route.url.map(segment=>segment.path)).join('/');
  mode = this.route.snapshot.data['mode'] || 'home';
  id = Number(this.route.snapshot.paramMap.get('id'));
  loading = signal(true);
  error = signal('');
  page = signal<Page>({ items: [], total: 0, page: 0 });
  cover = signal<any>(null);
  heroPhotos = signal<Array<{src:string;location:string}>>([]);
  detail = signal<any>(null);
  destinationPhotos = computed(() =>
    destinationPhotos(this.detail()?.atracciones_principales || [], this.cover()?.url_imagen || ''),
  );
  mapOpen = signal(false);
  search = signal('');
  type = signal<'NACIONAL' | 'INTERNACIONAL'>('NACIONAL');
  region=signal<number|null>(null);country=signal<number|null>(null);countries=signal<InternationalCountry[]>([]);
  experience = signal('');
  comingSoon = computed(()=>this.experience()==='cabanas'||this.experience()==='promociones');
  experienceOptions = signal<Array<{id:number;slug:string;nombre:string;label:string}>>([]);
  experienceFilters = computed(()=>{
    const fixedNames = new Set(['cabana','cabanas','promocion','promociones']);
    return [
      ...this.experienceOptions()
        .filter(option=>!fixedNames.has(normalizeExperience(option.slug))&&!fixedNames.has(normalizeExperience(option.nombre)))
        .map(option=>({key:String(option.id),label:option.label})),
      {key:'cabanas',label:this.text('Cabañas','Cabins')},
      {key:'promociones',label:this.text('Promociones','Offers')},
    ];
  });
  experienceConfigured = signal(true);
  selectedExperience = computed(()=>this.experienceFilters().find(option=>option.key===this.experience())?.label||'');
  returnUrl = this.route.snapshot.queryParamMap.get('volver') || '/hoteles';
  hotelFilters=signal<{search:string;starsMin:number|null;starsMax:number|null;regime:number|null}>({search:'',starsMin:null,starsMax:null,regime:null});
  hotelRegimes=signal<{value:number;label:string}[]>([]);
  hotelStarRangeValid=computed(()=>{const {starsMin,starsMax}=this.hotelFilterDraft();return starsMin===null||starsMax===null||starsMin<=starsMax;});
  hotelFiltersOpen=signal(false);
  hotelFilterDraft=signal<{search:string;starsMin:number|null;starsMax:number|null;regime:number|null}>({search:'',starsMin:null,starsMax:null,regime:null});
  hotelFilterCount=computed(()=>Number(!!this.hotelFilters().search.trim())+Number(this.hotelFilters().starsMin!==null||this.hotelFilters().starsMax!==null)+Number(this.hotelFilters().regime!==null));
  openHotelFilters(){this.hotelFilterDraft.set({...this.hotelFilters()});this.hotelFiltersOpen.set(true);}
  changeHotelFilter(key:'search'|'starsMin'|'starsMax'|'regime',value:any){this.hotelFilterDraft.update(filters=>({...filters,[key]:key==='search'?value:value===null?null:Number(value)}));}
  resetHotelDraft(){this.hotelFilterDraft.set({search:'',starsMin:null,starsMax:null,regime:null});}
  applyHotelFilters(){if(!this.hotelStarRangeValid())return;clearTimeout(this.timer);this.hotelFilters.set({...this.hotelFilterDraft(),search:this.hotelFilterDraft().search.trim()});this.hotelFiltersOpen.set(false);void this.load(0);}
  clearHotelFilters(){clearTimeout(this.timer);this.hotelFilters.set({search:'',starsMin:null,starsMax:null,regime:null});void this.load(0);}
  hotelPageSize=signal(10);
  hotelGridSize(size:number){if(this.mode!=='hoteles'||!this.id||this.hotelPageSize()===size)return;this.hotelPageSize.set(size);void this.load(0);}
  homeSection=signal<'home'|'destinations'>('home');
  activeSection=computed(()=>this.mode==='home'?this.homeSection():this.mode==='circuitos'||this.mode==='circuito'?'circuits':'destinations');
  updateActiveSection(){const root=this.scrollArea()?.nativeElement;if(root)this.lastScrollTop=root.scrollTop;if(this.mode!=='home')return;const section=this.destinationSection()?.nativeElement;if(root&&section)this.homeSection.set(section.getBoundingClientRect().top<=root.getBoundingClientRect().top+root.clientHeight*.3?'destinations':'home');}
  private lastScrollTop = 0;
  private restoredBrowseState = false;
  private pendingScroll = signal<number|null>(null);
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private scrollArea = viewChild<ElementRef<HTMLElement>>('scrollArea');
  private destinationSection = viewChild<ElementRef<HTMLElement>>('destinationSection');
  constructor() {
    afterNextRender(() => {
      if (!this.restoredBrowseState && this.mode === 'home' && this.route.snapshot.fragment === 'destinos') this.scrollToDestinations();
    });
    afterRenderEffect(()=>{
      const top = this.pendingScroll();
      const area = this.scrollArea()?.nativeElement;
      if (top===null || this.loading() || !area) return;
      gsap.killTweensOf(area);
      area.scrollTop = top;
      this.lastScrollTop = area.scrollTop;
      this.pendingScroll.set(null);
      this.updateActiveSection();
    });
  }
  navigateDestinations(event: MouseEvent) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (this.mode === 'home') this.scrollToDestinations();
    else void this.router.navigate(['/'], { fragment: 'destinos' });
  }
  navigateHome(event: MouseEvent) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (this.mode === 'home') this.scrollContent(0);
    else void this.router.navigate(['/'], {info:{publicSection:'home'}});
  }
  private scrollToDestinations() {
    const area = this.scrollArea()?.nativeElement;
    const section = this.destinationSection()?.nativeElement;
    if (!area || !section) return;
    this.scrollContent(area.scrollTop + section.getBoundingClientRect().top - area.getBoundingClientRect().top);
  }
  private scrollContent(top: number) {
    const area = this.scrollArea()?.nativeElement;
    if (!area) return;
    gsap.killTweensOf(area);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) area.scrollTop = top;
    else gsap.to(area, { scrollTop: top, duration: 0.65, ease: 'power2.inOut', overwrite: true });
  }
  ngOnInit() {
    const state = this.isBrowsePage() ? this.browseStates.get(this.browseKey) : undefined;
    if (state) {
      this.restoredBrowseState = true;
      this.search.set(state.search);
      this.type.set(state.type);
      this.region.set(state.region);
      this.country.set(state.country);
      this.experience.set(state.experience);
      this.experienceOptions.set(state.experiences);
      this.experienceConfigured.set(state.experienceConfigured);
      this.countries.set(state.countries);
      this.page.set(state.page);
      this.cover.set(state.cover);
      this.heroPhotos.set(state.heroPhotos);
      this.hotelFilters.set(state.hotelFilters);
      this.hotelRegimes.set(state.hotelRegimes);
      this.hotelPageSize.set(state.hotelPageSize);
      this.homeSection.set(this.startAtHome ? 'home' : state.homeSection);
      this.loading.set(false);
      this.pendingScroll.set(this.startAtHome ? 0 : state.scrollTop);
    }
    void this.load(state?.page.page ?? 0, !!state);
  }
  private isBrowsePage() { return ['home','destinos','hoteles','circuitos'].includes(this.mode); }
  private saveBrowseState() {
    if (!this.isBrowsePage() || this.error()) return;
    this.browseStates.save(this.browseKey, {
      search:this.search(),type:this.type(),region:this.region(),country:this.country(),
      experience:this.experience(),experiences:this.experienceOptions(),experienceConfigured:this.experienceConfigured(),
      countries:this.countries(),page:this.page(),cover:this.cover(),heroPhotos:this.heroPhotos(),
      hotelFilters:this.hotelFilters(),hotelRegimes:this.hotelRegimes(),hotelPageSize:this.hotelPageSize(),
      homeSection:this.homeSection(),scrollTop:this.lastScrollTop,
    });
  }
  ngOnDestroy() {
    this.saveBrowseState();
    clearTimeout(this.timer);
    const area = this.scrollArea()?.nativeElement;
    if (area) gsap.killTweensOf(area);
    this.generation++;
  }
  async load(page = 0, retainContent = false) {
    const generation = ++this.generation;
    if (!retainContent) this.loading.set(true);
    this.error.set('');
    try {
      if (this.mode === 'hotel') {
        const detail = await this.data.cached('hotel-detail:' + this.id, () =>
          this.data.hotels.infoHotel(this.id, this.data.language.language()),
        );
        if (generation !== this.generation) return;
        if (!detail) throw new Error('No encontramos ese hotel.');
        this.detail.set(detail);
        this.cover.set({ url_imagen: detail.fondo, nombre_destino: detail.nombre_hotel });
      } else if (this.mode === 'destino') {
        const [record, info, hotels] = await Promise.all([
          this.data.backend.client
            .from('catalogo_destinos')
            .select('id,nombre,imagen_destino,activo')
            .eq('id', this.id)
            .eq('activo', true)
            .maybeSingle(),
          this.data.cached('destination-detail:' + this.id, () =>
            this.data.destinations.obtenerDetalleDestino(this.id, this.data.language.language()),
          ),
          this.data.featuredHotels(this.id),
        ]);
        if (generation !== this.generation) return;
        if (record.error || !record.data) throw new Error('No encontramos este destino.');
        this.detail.set({ ...record.data, ...info?.[0] });
        this.cover.set({
          url_imagen:
            info?.[0]?.atracciones_principales?.find((attraction: any) => attraction.imagen_fondo)
              ?.imagen_fondo || record.data.imagen_destino,
          nombre_destino: record.data.nombre,
        });
        this.page.set(hotels);
      } else if (this.mode === 'hoteles' && this.id) {
        const p = await this.data.hotelPage(this.id, page, this.hotelPageSize(),this.hotelFilters());
        if (generation === this.generation) this.page.set(p);
        if(!this.hotelRegimes().length)this.hotelRegimes.set(await this.data.hotelRegimeOptions());
      } else if (this.mode === 'circuitos') {
        const rows = await this.data.cached('public-circuits', () =>
          this.data.circuits.listCircuitosPublicos(this.data.language.language()),
        );
        if (generation === this.generation)
          this.page.set({
            items: rows.map((r) => normalizeRecord(r, 'circuitos')),
            total: rows.length,
            page: 0,
          });
      } else {
        const experiences = await this.data.experienceOptions(this.type());
        if (generation !== this.generation) return;
        this.experienceOptions.set(experiences);
        const automaticSelection = !this.experienceFilters().some(option=>option.key===this.experience());
        if (automaticSelection) {
          const beach = experiences.find(option=>
            ['playa','playas'].includes(normalizeExperience(option.slug)) || ['playa','playas'].includes(normalizeExperience(option.nombre)));
          this.experience.set(beach ? String(beach.id) : this.experienceFilters()[0].key);
          page = 0;
        }
        const experienceId = this.comingSoon() ? null : experiences.find(option=>String(option.id)===this.experience())?.id ?? null;
        const [covers, geography] = await Promise.all([
          this.data.coverImages(),
          this.type()==='INTERNACIONAL'&&experienceId!==null?this.data.internationalGeography(experienceId):Promise.resolve([]),
        ]);
        if (generation !== this.generation) return;
        if (this.region()!==null && !geography.some(country=>country.regionId===this.region())) {
          this.region.set(null);
          page = 0;
        }
        if (this.country()!==null && !geography.some(country=>country.id===this.country() && (this.region()===null || country.regionId===this.region()))) {
          this.country.set(null);
          page = 0;
        }
        const result = experienceId!==null
          ? await this.data.publicDestinations(this.type(),page,this.search(),experienceId,this.region(),this.country())
          : {items:[],total:0,page};
        if (generation !== this.generation) return;
        this.page.set(result);
        this.countries.set(geography);
        this.experienceConfigured.set(experienceId!==null);
        this.cover.set(covers[0] || null);
        const heroList = covers
          .filter((photo: any) => !!photo.url_imagen)
          .map((photo: any) => ({
            src: photo.url_imagen,
            location: photo.nombre_destino || 'Trotapie Travel',
          }));
        this.heroPhotos.set(shuffleArray(heroList));
      }
    } catch (e) {
      if (generation === this.generation)
        this.error.set(e instanceof Error ? e.message : 'No pudimos cargar esta información.');
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  changeSearch(text: string) {
    this.search.set(text);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.load(), 300);
  }
  changeType(type: string) {
    clearTimeout(this.timer);this.region.set(null);this.country.set(null);
    if (!this.experienceOptions().length) this.experience.set('');
    this.type.set(type as 'NACIONAL' | 'INTERNACIONAL');
    void this.load();
  }
  changeRegion(id:number|null){clearTimeout(this.timer);this.region.set(id);this.country.set(null);void this.load();}
  changeCountry(id:number|null){clearTimeout(this.timer);this.country.set(id);void this.load();}
  clearGeography(){clearTimeout(this.timer);this.region.set(null);this.country.set(null);void this.load();}
  changeExperience(key: string) { if(key===this.experience()||!this.experienceFilters().some(option=>option.key===key))return;clearTimeout(this.timer);this.experience.set(key);void this.load(); }
  open(record: TravelRecord) {
    this.lastScrollTop = this.scrollArea()?.nativeElement.scrollTop ?? this.lastScrollTop;
    this.saveBrowseState();
    if ((this.mode === 'hoteles' && this.id) || this.mode === 'destino')
      void this.router.navigate(['/hotel', record.id], { queryParams: { volver: this.mode === 'destino' ? `/destinos/${this.id}` : `/hoteles/${this.id}` } });
    else if (this.mode === 'hoteles') void this.router.navigate(['/hoteles', record.id]);
    else if (this.mode === 'circuitos') void this.router.navigate(['/circuito', record.id]);
    else void this.router.navigate(['/destinos', record.id]);
  }
  text(es: string, en?: string) {
    return this.data.language.translateText(es, en);
  }
  imageError(event: Event) {
    (event.target as HTMLImageElement).src = '/brand/iso.png';
  }
}
