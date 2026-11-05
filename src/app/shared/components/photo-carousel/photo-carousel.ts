import {ImageComposer} from '../image-composer/image-composer';
import {CompositionScaleDirective} from '../../directives/composition-scale.directive';
import {NgStyle} from '@angular/common';
import {homeImagePhotoStyle,homeImageTextStyle} from '../../models/home-image-style';
import {
  Component,
  ElementRef,
  DestroyRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import type { CarouselPhoto } from './models/carousel-photo';
import { LanguageService } from '../../../core/services/language.service';
import { shuffleArray } from '../../../core/utils/random-sample';
import { gsap } from 'gsap';

@Component({
  selector: 'tp-photo-carousel',
  imports: [ImageComposer, Button, Icon, NgStyle, CompositionScaleDirective],
  templateUrl: './photo-carousel.html',
  styleUrl: './photo-carousel.scss',
  host: {
    // '(mouseenter)': 'hovering.set(true)',
    // '(mouseleave)': 'hovering.set(false)',
    '(focusin)': 'focused.set(true)',
    '(focusout)': 'focusOut($event)',
    '(document:visibilitychange)': 'visibilityChanged()',
  },
})
export class PhotoCarousel {
  readonly homeImagePhotoStyle = homeImagePhotoStyle;
  readonly homeImageTextStyle = homeImageTextStyle;
  photos = input<CarouselPhoto[]>([]);
  shuffle = input(false);
  label = input('Galería del destino');
  autoplay = input(true);
  english = input(false);
  variant = input<'gallery' | 'hero' | 'lightbox'>('gallery');
  headline = input('');
  eyebrow = input('');
  intervalMs = input(3000);
  startIndex = input(0);
  orderedPhotos = linkedSignal<CarouselPhoto[]>(() => {
    const raw = this.photos();
    if (!this.shuffle() || raw.length <= 1) return [...raw];
    return shuffleArray(raw);
  });
  index = linkedSignal(() => {
    this.orderedPhotos();
    return Math.min(Math.max(0, this.startIndex()), Math.max(0, this.orderedPhotos().length - 1));
  });
  current = computed(() => this.orderedPhotos()[this.index()]);
  nextPhoto = computed(() => this.orderedPhotos()[(this.index() + 1) % this.orderedPhotos().length]);
  reducedMotion = signal(true);
  paused = linkedSignal(() => this.reducedMotion());
  hovering = signal(false);
  focused = signal(false);
  visible = signal(false);
  hidden = signal(false);
  canAutoplay = computed(() => this.orderedPhotos().length > 1 && this.autoplay());
  isPaused = computed(() =>
    this.paused() ||
    this.hovering() ||
    (this.focused() && this.variant() === 'gallery') ||
    !this.visible() ||
    this.hidden()
  );
  private element = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroy = inject(DestroyRef);

  constructor() {
    effect((onCleanup) => {
      if (!this.canAutoplay() || this.isPaused()) return;
      const timer = setInterval(() => this.move(1), this.intervalMs());
      onCleanup(() => clearInterval(timer));
    });
    afterNextRender(() => {
      this.visibilityChanged();
      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion.set(motion.matches);
      const changed = () => this.reducedMotion.set(motion.matches);
      motion.addEventListener('change', changed);
      const observer = new IntersectionObserver(([entry]) =>
        this.visible.set(entry.isIntersecting),
      );
      observer.observe(this.element.nativeElement);
      this.destroy.onDestroy(() => {
        observer.disconnect();
        motion.removeEventListener('change', changed);
      });
    });
    let previousSrc: string | undefined;
    afterRenderEffect((onCleanup) => {
      const photo = this.current();
      const outgoingSrc = previousSrc;
      previousSrc = photo?.src;
      const image = this.element.nativeElement.querySelector<HTMLElement>('.carousel-photo');
      if (!image || this.reducedMotion()) return;
      // Draft framing/text changes are not slide changes; keep the preview stable while editing.
      if (outgoingSrc === photo?.src) return;
      if (this.variant() === 'lightbox') {
        const outgoing = outgoingSrc && outgoingSrc !== photo?.src ? image.cloneNode(true) as HTMLImageElement : null;
        if (outgoing) {
          outgoing.src = outgoingSrc!;
          outgoing.alt = '';
          outgoing.setAttribute('aria-hidden', 'true');
          outgoing.classList.add('carousel-outgoing');
          image.parentElement?.appendChild(outgoing);
          gsap.fromTo(outgoing, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.55, ease: 'sine.inOut', overwrite: true });
        }
        gsap.fromTo(image, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.55, ease: 'sine.inOut', overwrite: true });
        onCleanup(() => {
          gsap.killTweensOf(image);
          gsap.set(image, { clearProps: 'opacity,visibility' });
          if (outgoing) { gsap.killTweensOf(outgoing); outgoing.remove(); }
        });
        return;
      }
      if (photo?.homeStyle) {
        gsap.fromTo(image, { opacity: 0.62 }, { opacity: 1, duration: 0.7, ease: 'power2.out' });
        onCleanup(() => {
          gsap.killTweensOf(image);
          gsap.set(image, { clearProps: 'opacity' });
        });
        return;
      }
      gsap.fromTo(image, { opacity: 0.62, scale: 1.025 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' });
      onCleanup(() => gsap.killTweensOf(image));
    });
  }

  reshuffle() {
    if (!this.shuffle() || this.photos().length <= 1) return;
    const currentList = this.orderedPhotos();
    const lastPhoto = currentList[currentList.length - 1];
    const nextList = shuffleArray(this.photos());
    if (nextList.length > 1 && nextList[0].src === lastPhoto?.src) {
      const swapIdx = 1 + Math.floor(Math.random() * (nextList.length - 1));
      [nextList[0], nextList[swapIdx]] = [nextList[swapIdx], nextList[0]];
    }
    this.orderedPhotos.set(nextList);
  }

  moveManually(direction: number) {
    if (this.variant() === 'lightbox') this.paused.set(true);
    this.move(direction);
  }
  move(direction: number) {
    const count = this.orderedPhotos().length;
    if (count <= 1) return;
    const next = this.index() + direction;
    if (next >= count) {
      if (this.shuffle()) {
        this.reshuffle();
      }
      this.index.set(0);
    } else if (next < 0) {
      this.index.set(count - 1);
    } else {
      this.index.set(next);
    }
  }
  onProgressEnd() {
    if (this.canAutoplay() && !this.isPaused()) {
      this.move(1);
    }
  }
  focusOut(event: FocusEvent) {
    if (
      !(event.relatedTarget instanceof Node) ||
      !this.element.nativeElement.contains(event.relatedTarget)
    )
      this.focused.set(false);
  }
  visibilityChanged() {
    this.hidden.set(document.hidden);
  }
  private langService = inject(LanguageService);
  text(es: string, en?: string) {
    return this.langService.translateText(es, en);
  }
  imageError(event: Event) {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith('/brand/iso.png')) image.src = '/brand/iso.png';
  }
}
