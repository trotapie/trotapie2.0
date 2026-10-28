export function isClassifiedImage(image: any): boolean {
  const id=Number(image?.tipo_imagen_id??image?.tipo?.id);
  return Number.isSafeInteger(id)&&id>0;
}
