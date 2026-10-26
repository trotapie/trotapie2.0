import {DOCUMENT} from '@angular/common';
import {afterEveryRender, DestroyRef, inject, Injectable} from '@angular/core';
import {Router, type CanActivateFn, type CanDeactivateFn} from '@angular/router';
import {createUnsavedChangesProtection} from '../utils/unsaved-changes';

@Injectable({providedIn: 'root'})
class PendingChangesRegistry {
  readonly checks = new Set<() => boolean>();
}

export interface UnsavedChangesAware {
  canDeactivate(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<UnsavedChangesAware> = component =>
  component.canDeactivate();

/** CanDeactivate does not run when Angular reuses a route with different parameters. */
export const reusedRouteChangesGuard: CanActivateFn = next => {
  let current = inject(Router).routerState.snapshot.root;
  while (current.firstChild) current = current.firstChild;
  if (current.routeConfig !== next.routeConfig) return true;
  return [...inject(PendingChangesRegistry).checks].every(check => check());
};

/** Call in an injection context. Rechecks mutable, template-driven models after rendering. */
export function protectUnsavedChanges(hasChanges: () => boolean, busy: () => boolean = () => false) {
  const protection = createUnsavedChangesProtection(inject(DOCUMENT).defaultView, hasChanges, busy);
  const registry = inject(PendingChangesRegistry);
  registry.checks.add(protection.confirm);
  const renderRef = afterEveryRender(protection.sync);
  inject(DestroyRef).onDestroy(() => {
    renderRef.destroy();
    registry.checks.delete(protection.confirm);
    protection.destroy();
  });
  return protection;
}
