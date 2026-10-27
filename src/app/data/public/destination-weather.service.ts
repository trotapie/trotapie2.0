import { Injectable } from '@angular/core';
import type { MapPoint } from '../../shared/utils/location';

@Injectable({ providedIn: 'root' })
export class DestinationWeatherService {
  async temperature(point: MapPoint, signal: AbortSignal): Promise<number | null> {
    const params = new URLSearchParams({
      latitude: String(point.lat),
      longitude: String(point.lng),
      current_weather: 'true',
      temperature_unit: 'celsius',
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
    if (!response.ok) throw new Error('Weather request failed');
    const weather = await response.json();
    const temperature: unknown = weather?.current_weather?.temperature;
    return typeof temperature === 'number' && Number.isFinite(temperature) ? temperature : null;
  }
}
