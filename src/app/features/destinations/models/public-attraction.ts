export interface AttractionImage {
  imagen_url: string;
  nombre?: string;
  descripcion?: string;
  activa?: boolean;
}

export interface PublicAttraction {
  id: number;
  nombre?: string;
  descripcion?: string;
  imagen_fondo?: string;
  imagenes?: AttractionImage[];
}

export interface DestinationFact {
  clave: string;
  label: string;
  valor: string;
}
