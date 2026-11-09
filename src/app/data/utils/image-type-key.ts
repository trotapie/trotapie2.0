export function generateImageTypeKey(description: string, existingKeys: readonly string[]): string {
  const letters = description.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
  const preferred = (letters || 'IMG').slice(0, 3).padEnd(3, 'X');
  const used = new Set(existingKeys.map(key => key.trim().toUpperCase()));
  if (!used.has(preferred)) return preferred;

  for (let index = 0; index < 26 ** 3; index++) {
    const candidate = String.fromCharCode(65 + Math.floor(index / 676), 65 + Math.floor(index / 26) % 26, 65 + index % 26);
    if (!used.has(candidate)) return candidate;
  }
  throw new Error('No quedan claves de tres letras disponibles para tipos de imagen.');
}
