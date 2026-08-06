/**
 * Tydigo City Service
 *
 * Loads cities dynamically from the database with caching.
 * Supports future expansion to all African countries.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type City = {
  id: string;
  country: string;
  state: string;
  city: string;
  is_active: boolean;
};

// In-memory cache
let cityCache: City[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get all active cities, grouped by state.
 */
export async function getCities(): Promise<City[]> {
  const now = Date.now();
  if (cityCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return cityCache;
  }

  if (isSupabaseAvailable() && supabase) {
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .eq("is_active", true)
      .order("state")
      .order("city");

    if (!error && data) {
      cityCache = data as City[];
      cacheTimestamp = now;
      return cityCache;
    }
  }

  // Fallback static list
  return getStaticCities();
}

/**
 * Get cities grouped by state for dropdown rendering.
 */
export async function getCitiesByState(): Promise<Record<string, City[]>> {
  const cities = await getCities();
  const grouped: Record<string, City[]> = {};

  for (const city of cities) {
    if (!grouped[city.state]) grouped[city.state] = [];
    grouped[city.state].push(city);
  }

  return grouped;
}

/**
 * Get the state for a given city name.
 */
export function getStateForCity(cityName: string, cities: City[]): string {
  const found = cities.find(
    (c) => c.city.toLowerCase() === cityName.toLowerCase()
  );
  return found?.state || "";
}

/**
 * Static fallback for when Supabase is unavailable.
 */
function getStaticCities(): City[] {
  return [
    { id: "static-1", country: "Nigeria", state: "FCT", city: "Abuja", is_active: true },
    { id: "static-2", country: "Nigeria", state: "Lagos", city: "Lagos", is_active: true },
    { id: "static-3", country: "Nigeria", state: "Rivers", city: "Port Harcourt", is_active: true },
    { id: "static-4", country: "Nigeria", state: "Kano", city: "Kano", is_active: true },
    { id: "static-5", country: "Nigeria", state: "Oyo", city: "Ibadan", is_active: true },
    { id: "static-6", country: "Nigeria", state: "Kaduna", city: "Kaduna", is_active: true },
    { id: "static-7", country: "Nigeria", state: "Edo", city: "Benin City", is_active: true },
    { id: "static-8", country: "Nigeria", state: "Enugu", city: "Enugu", is_active: true },
    { id: "static-9", country: "Nigeria", state: "Plateau", city: "Jos", is_active: true },
    { id: "static-10", country: "Nigeria", state: "Cross River", city: "Calabar", is_active: true },
    { id: "static-11", country: "Nigeria", state: "Imo", city: "Owerri", is_active: true },
    { id: "static-12", country: "Nigeria", state: "Akwa Ibom", city: "Uyo", is_active: true },
    { id: "static-13", country: "Nigeria", state: "Borno", city: "Maiduguri", is_active: true },
  ];
}
