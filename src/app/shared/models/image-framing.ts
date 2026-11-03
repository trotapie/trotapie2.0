export interface ImageFraming {
  imagen_zoom?: number | null;
  imagen_x?: number | null;
  imagen_y?: number | null;
}

export function normalizeImageFraming(image: ImageFraming = {}) {
  const number = (value: number | null | undefined, fallback: number, min: number, max: number) =>
    value == null || !Number.isFinite(Number(value)) ? fallback : Math.min(max, Math.max(min, Number(value)));
  return {
    imagen_zoom: number(image.imagen_zoom, 1, 0.5, 3),
    imagen_x: number(image.imagen_x, 50, 0, 100),
    imagen_y: number(image.imagen_y, 50, 0, 100),
  };
}

export function imageFramingStyle(image: ImageFraming): Record<string, string> {
  const {imagen_zoom: zoom, imagen_x: x, imagen_y: y} = normalizeImageFraming(image);
  // Fit the complete original before zooming; cover would permanently crop portraits.
  return {'object-fit': 'contain', 'object-position': `${x}% ${y}%`, transform: `scale(${zoom})`, 'transform-origin': `${x}% ${y}%`};
}

export function imageFramingSize(frameWidth: number, frameHeight: number, imageRatio: number) {
  return {width: Math.min(frameWidth, frameHeight * imageRatio), height: Math.min(frameHeight, frameWidth / imageRatio)};
}
