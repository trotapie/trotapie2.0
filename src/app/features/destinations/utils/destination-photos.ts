import type { PublicAttraction } from '../models/public-attraction';
import type { CarouselPhoto } from '../../../shared/components/photo-carousel/models/carousel-photo';

export function destinationPhotos(
  attractions: readonly PublicAttraction[],
  fallback = '',
): CarouselPhoto[] {
  const photos: CarouselPhoto[] = [];
  const urls = new Set<string>();
  for (const attraction of attractions) {
    const images = attraction.imagenes?.length
      ? attraction.imagenes.filter((image) => image.activa !== false)
      : attraction.imagen_fondo
        ? [{ imagen_url: attraction.imagen_fondo }]
        : [];
    for (const image of images) {
      const src = image.imagen_url?.trim();
      if (!src || urls.has(src)) continue;
      urls.add(src);
      const imageTitle = image.nombre?.trim() || '';
      photos.push({
        src,
        style: {...image},
        title: /\.(jpe?g|png|webp|avif|gif)$/i.test(imageTitle)
          ? attraction.nombre
          : imageTitle || attraction.nombre,
        description: image.descripcion || attraction.descripcion,
      });
    }
  }
  return photos.length ? photos : fallback ? [{ src: fallback }] : [];
}
