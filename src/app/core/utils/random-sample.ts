/** Choose distinct entries without changing the source or shuffling the entire list. */
export function randomSample<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const size = Math.min(Math.max(0, Math.floor(count)), pool.length);
  for (let index = 0; index < size; index++) {
    const chosen = index + Math.floor(Math.random() * (pool.length - index));
    [pool[index], pool[chosen]] = [pool[chosen], pool[index]];
  }
  return pool.slice(0, size);
}

export function shuffleArray<T>(items: readonly T[]): T[] {
  return randomSample(items, items.length);
}
