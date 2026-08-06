/**
 * Tydigo Location Service
 *
 * Manages countries, states, and cities with caching.
 * Supports future expansion to all African countries.
 */

import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export type Country = {
  id: string;
  name: string;
  code: string;
  code_alpha3: string;
  currency: string;
  phone_code: string;
  is_active: boolean;
};

export type State = {
  id: string;
  country_id: string;
  name: string;
  code: string | null;
  is_active: boolean;
};

export type City = {
  id: string;
  country: string;
  state: string;
  city: string;
  is_active: boolean;
};

// Cache
let cityCache: City[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getCities(): Promise<City[]> {
  const now = Date.now();
  if (cityCache && now - cacheTimestamp < CACHE_TTL_MS) return cityCache;

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

  return getStaticCities();
}

export async function getCitiesByState(): Promise<Record<string, City[]>> {
  const cities = await getCities();
  const grouped: Record<string, City[]> = {};
  for (const city of cities) {
    if (!grouped[city.state]) grouped[city.state] = [];
    grouped[city.state].push(city);
  }
  return grouped;
}

export function getStateForCity(cityName: string, cities: City[]): string {
  const found = cities.find((c) => c.city.toLowerCase() === cityName.toLowerCase());
  return found?.state || "";
}

export async function searchCities(query: string): Promise<City[]> {
  const cities = await getCities();
  const q = query.toLowerCase();
  return cities.filter(
    (c) => c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
  ).slice(0, 15);
}

function getStaticCities(): City[] {
  return [
    { id: "s1", country: "Nigeria", state: "FCT", city: "Abuja", is_active: true },
    { id: "s2", country: "Nigeria", state: "Lagos", city: "Lagos", is_active: true },
    { id: "s3", country: "Nigeria", state: "Rivers", city: "Port Harcourt", is_active: true },
    { id: "s4", country: "Nigeria", state: "Kano", city: "Kano", is_active: true },
    { id: "s5", country: "Nigeria", state: "Oyo", city: "Ibadan", is_active: true },
    { id: "s6", country: "Nigeria", state: "Kaduna", city: "Kaduna", is_active: true },
    { id: "s7", country: "Nigeria", state: "Edo", city: "Benin City", is_active: true },
    { id: "s8", country: "Nigeria", state: "Enugu", city: "Enugu", is_active: true },
    { id: "s9", country: "Nigeria", state: "Plateau", city: "Jos", is_active: true },
    { id: "s10", country: "Nigeria", state: "Cross River", city: "Calabar", is_active: true },
    { id: "s11", country: "Nigeria", state: "Imo", city: "Owerri", is_active: true },
    { id: "s12", country: "Nigeria", state: "Akwa Ibom", city: "Uyo", is_active: true },
    { id: "s13", country: "Nigeria", state: "Borno", city: "Maiduguri", is_active: true },
  ];
}
