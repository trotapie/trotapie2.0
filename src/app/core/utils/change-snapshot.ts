/** Snapshot mutable form models too, not only signal references. */
export function changeSnapshot(value: unknown): string {
  return JSON.stringify(value) ?? '';
}

export class ChangeTracker<T = unknown> {
  private baseline: string | undefined;

  capture(value: unknown): void {
    this.baseline = changeSnapshot(value);
  }

  hasChanges(value: unknown): boolean {
    return this.baseline !== undefined && this.baseline !== changeSnapshot(value);
  }

  /** Accept only fields persisted by a partial save; keep other edits pending. */
  acceptSaved(update: (saved: T) => void): void {
    if (!this.baseline) return;
    const saved = JSON.parse(this.baseline) as T;
    update(saved);
    this.capture(saved);
  }
}
