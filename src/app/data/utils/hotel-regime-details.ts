interface RegimeTranslation {
  idioma_id: number;
  descripcion?: string | null;
  descripcion_general?: string | null;
}

interface CatalogRegime {
  id: number;
  descripcion?: string | null;
  icono_svg?: string | null;
  muestra_plan_todo_incluido?: boolean;
  traducciones?: RegimeTranslation[] | null;
}

export interface HotelRegimeDetails {
  id: number;
  descripcion: string;
  descripcion_general: string;
  icono_svg: string | null;
  muestra_plan_todo_incluido: boolean;
}

export function hotelRegimeDetails(
  primary: CatalogRegime | null,
  assigned: (CatalogRegime | null)[],
  languageId: number,
): HotelRegimeDetails[] {
  const regimes = new Map<number, HotelRegimeDetails>();
  for (const regime of [primary, ...assigned.filter(item => item !== null).sort((a, b) => a.id - b.id)]) {
    if (!regime || regimes.has(regime.id)) continue;
    const localized = regime.traducciones?.find(item => item.idioma_id === languageId);
    const spanish = regime.traducciones?.find(item => item.idioma_id === 1);
    const name = localized?.descripcion?.trim() || spanish?.descripcion?.trim() || regime.descripcion?.trim();
    if (!name) continue;
    regimes.set(regime.id, {
      id: regime.id,
      descripcion: name,
      descripcion_general: localized?.descripcion_general?.trim() || spanish?.descripcion_general?.trim() || '',
      icono_svg: regime.icono_svg ?? null,
      muestra_plan_todo_incluido: regime.muestra_plan_todo_incluido === true,
    });
  }
  return [...regimes.values()];
}
