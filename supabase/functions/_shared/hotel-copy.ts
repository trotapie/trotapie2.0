export const HOTEL_COPY = {
  ficha: {
    antetitulo: 'Para vivirlo a tu manera',
    descripcion: 'Descubre los horarios, servicios y detalles para planear tu próxima estancia.',
    cotizar: 'Solicitar cotización',
    ubicacion: 'Ver ubicación',
  },
  informacion: {
    antetitulo: 'Todo para tu estancia',
    titulo: 'Conoce tu hotel',
    ubicacion: 'Ubicación',
    compartir: 'Compartir hotel',
    cotizar: 'Cotizar mi estancia',
  },
} as const;

export const hotelInheritsDestinationCopy = (group: string, key: string) =>
  group === 'ficha' && (key === 'antetitulo' || key === 'ubicacion');
