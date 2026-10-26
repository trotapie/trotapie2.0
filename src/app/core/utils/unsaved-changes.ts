/** Browser lifecycle protection kept independent from Angular for deterministic tests. */
export function createUnsavedChangesProtection(
  window: Window | null,
  hasChanges: () => boolean,
  busy: () => boolean = () => false,
) {
  let listening = false;
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (!hasChanges() && !busy()) return;
    event.preventDefault();
    event.returnValue = '';
  };
  return {
    sync() {
      const needed = hasChanges() || busy();
      if (needed === listening || !window) return;
      listening = needed;
      if (needed) window.addEventListener('beforeunload', beforeUnload);
      else window.removeEventListener('beforeunload', beforeUnload);
    },
    confirm(check = hasChanges) {
      return !busy() && (!check() || !!window?.confirm(
        'Tienes cambios sin guardar. ¿Quieres salir y descartarlos?',
      ));
    },
    destroy() {
      if (listening) window?.removeEventListener('beforeunload', beforeUnload);
      listening = false;
    },
  };
}
