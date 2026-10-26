import { Injectable, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { gsap } from 'gsap';

const LIGHT_THEME: Record<string, string> = {
  '--canvas': '#e9e8e5',
  '--shell': '#f2f1ef',
  '--surface': '#ffffff',
  '--muted-surface': '#f8f7f5',
  '--ink': '#202420',
  '--muted': '#70756f',
  '--line': '#e5e5df',
  '--sand': '#ebc8a8',
  '--sand-soft': '#f6e9dc',
  '--brand': '#137053',
  '--brand-soft': '#e7f1eb',
  '--success': '#266c3b',
  '--success-bg': '#e4f7e4',
  '--warning': '#855711',
  '--warning-bg': '#fff0d9',
  '--danger': '#a43b3b',
  '--danger-bg': '#fce8e8',
};

const DARK_THEME: Record<string, string> = {
  '--canvas': '#161c18',
  '--shell': '#202723',
  '--surface': '#2b332d',
  '--muted-surface': '#313b33',
  '--ink': '#f1f3ed',
  '--muted': '#bec6bb',
  '--line': '#424d44',
  '--sand': '#d4b18b',
  '--sand-soft': '#463b2e',
  '--brand': '#9ad5b6',
  '--brand-soft': '#30473b',
  '--success': '#b7e7be',
  '--success-bg': '#294232',
  '--warning': '#f4ce92',
  '--warning-bg': '#4a3e29',
  '--danger': '#f5b5b5',
  '--danger-bg': '#4b3031',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);
  readonly dark = signal(this.document.documentElement.dataset['theme'] === 'dark');
  private activeTween?: gsap.core.Tween;

  toggle(origin?: { x: number; y: number } | MouseEvent) {
    const nextDark = !this.dark();
    this.dark.set(nextDark);

    try {
      localStorage.setItem('trotapie-theme', nextDark ? 'dark' : 'light');
    } catch {}

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const root = this.document.documentElement;

    if (reducedMotion) {
      root.dataset['theme'] = nextDark ? 'dark' : 'light';
      return;
    }

    this.triggerRipple(origin, nextDark);

    if (this.activeTween) {
      this.activeTween.kill();
    }

    const targetTheme = nextDark ? DARK_THEME : LIGHT_THEME;
    const computedStyle = getComputedStyle(root);

    const currentValues: Record<string, string> = {};
    for (const key of Object.keys(targetTheme)) {
      currentValues[key] = computedStyle.getPropertyValue(key).trim() || targetTheme[key];
    }

    let swapped = false;
    this.activeTween = gsap.to(currentValues, {
      ...targetTheme,
      duration: 0.48,
      ease: 'power2.inOut',
      overwrite: 'auto',
      onUpdate: () => {
        for (const key of Object.keys(targetTheme)) {
          root.style.setProperty(key, currentValues[key]);
        }
        if (!swapped && this.activeTween && this.activeTween.progress() >= 0.5) {
          swapped = true;
          root.dataset['theme'] = nextDark ? 'dark' : 'light';
        }
      },
      onComplete: () => {
        root.dataset['theme'] = nextDark ? 'dark' : 'light';
        for (const key of Object.keys(targetTheme)) {
          root.style.removeProperty(key);
        }
        this.activeTween = undefined;
      },
    });
  }

  private triggerRipple(origin?: { x: number; y: number } | MouseEvent, dark?: boolean) {
    if (typeof window === 'undefined') return;
    const x =
      origin instanceof MouseEvent
        ? origin.clientX
        : origin?.x ?? window.innerWidth - 60;
    const y =
      origin instanceof MouseEvent
        ? origin.clientY
        : origin?.y ?? 40;

    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const ripple = this.document.createElement('div');
    ripple.className = 'tp-theme-ripple';
    ripple.style.cssText = `
      position: fixed;
      top: ${y}px;
      left: ${x}px;
      width: ${maxRadius * 2}px;
      height: ${maxRadius * 2}px;
      margin-top: ${-maxRadius}px;
      margin-left: ${-maxRadius}px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 99999;
      background: ${
        dark
          ? 'radial-gradient(circle, rgba(22,28,24,0.32) 0%, rgba(22,28,24,0) 70%)'
          : 'radial-gradient(circle, rgba(242,241,239,0.42) 0%, rgba(242,241,239,0) 70%)'
      };
      will-change: transform, opacity;
    `;
    this.document.body.appendChild(ripple);

    gsap.fromTo(
      ripple,
      { scale: 0, opacity: 1 },
      {
        scale: 1,
        opacity: 0,
        duration: 0.55,
        ease: 'power2.out',
        onComplete: () => ripple.remove(),
      }
    );
  }
}
