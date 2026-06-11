import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const SECONDS_PER_MINUTE = 60;
const FULL_CIRCLE_DEGREES = 360;
const ZERO_BEARING = 0;
const RADIAN_TO_DEGREE = 180 / Math.PI;

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatEta(segundos: number): string {
  if (segundos <= 0) {
    return "0s";
  }

  const totalSeconds = Math.floor(segundos);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const remainingSeconds = totalSeconds % SECONDS_PER_MINUTE;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes}min`;
  }

  return `${minutes}min ${remainingSeconds}s`;
}

export function calcBearing(
  from: [number, number],
  to: [number, number],
): number {
  const [fromLat, fromLng] = from;
  const [toLat, toLng] = to;

  if (fromLat === toLat && fromLng === toLng) {
    return ZERO_BEARING;
  }

  const fromLatRad = (fromLat * Math.PI) / 180;
  const toLatRad = (toLat * Math.PI) / 180;
  const deltaLngRad = ((toLng - fromLng) * Math.PI) / 180;

  const y = Math.sin(deltaLngRad) * Math.cos(toLatRad);
  const x =
    Math.cos(fromLatRad) * Math.sin(toLatRad) -
    Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(deltaLngRad);
  const bearing = Math.atan2(y, x) * RADIAN_TO_DEGREE;

  return (bearing + FULL_CIRCLE_DEGREES) % FULL_CIRCLE_DEGREES;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
