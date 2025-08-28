// services/geoapifyService.ts - VERSION CORRIGÉE
// Service Geoapify pour géocodage avancé et recherche de lieux

// FIXED: Better environment variable handling
const GEOAPIFY_API_KEY = process.env.REACT_APP_GEOAPIFY_API_KEY || '678c28e379554ad9b191db0532c69695';

interface GeoapifyLocation {
  geometry: any;
  properties: any;
  lat: number;
  lon: number;
  formatted: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postcode: string;
  country: string;
  country_code: string;
  state?: string;
  confidence: number;
  place_id: string;
}

interface GeoapifyResponse {
  results: GeoapifyLocation[];
  query: {
    text: string;
    parsed: any;
  };
}

interface PlaceSearch {
  name: string;
  lat: number;
  lon: number;
  formatted: string;
  categories: string[];
  distance?: number;
}

class GeoapifyService {
  private baseUrl = 'https://api.geoapify.com/v1';
  private apiKey: string;

  constructor() {
    this.apiKey = GEOAPIFY_API_KEY;
    
    if (!this.apiKey || this.apiKey === '678c28e379554ad9b191db0532c69695') {
      console.warn('GEOAPIFY API key not configured - using mock data');
    }
  }

  // Check if real API key is configured
  private isConfigured(): boolean {
    return typeof this.apiKey === 'string' && this.apiKey !== '678c28e379554ad9b191db0532c69695' && this.apiKey.length > 10;
  }

  // FIXED: Better error handling and timeout
  private async makeRequest(url: string, timeoutMs: number = 5000): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  // ========== GÉOCODAGE (ADRESSE → COORDONNÉES) ==========
  
  async geocodeAddress(address: string, options?: {
    countryCode?: string;
    language?: string;
    limit?: number;
  }): Promise<GeoapifyLocation[]> {
    
    if (!address || address.length < 2) {
      return [];
    }

    if (!this.isConfigured()) {
      console.log('Using mock geocoding results');
      return this.getMockGeocodingResults(address);
    }

    try {
      const params = new URLSearchParams({
        text: address.trim(),
        format: 'json',
        apiKey: this.apiKey,
        limit: (options?.limit || 5).toString()
      });

      if (options?.countryCode) {
        params.append('filter', `countrycode:${options.countryCode}`);
      }

      if (options?.language) {
        params.append('lang', options.language);
      }

      const data: GeoapifyResponse = await this.makeRequest(`${this.baseUrl}/geocode/search?${params}`);
      
      return data.results.map(result => ({
        ...result.properties,
        lat: result.geometry.coordinates[1],
        lon: result.geometry.coordinates[0]
      })) as GeoapifyLocation[];

    } catch (error) {
      console.error('Geocoding error:', error);
      return this.getMockGeocodingResults(address);
    }
  }

  // ========== GÉOCODAGE INVERSÉ (COORDONNÉES → ADRESSE) ==========
  
  async reverseGeocode(lat: number, lon: number, language?: string): Promise<GeoapifyLocation | null> {
    
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      console.warn('Invalid coordinates for reverse geocoding');
      return null;
    }

    if (!this.isConfigured()) {
      return this.getMockReverseGeocodingResult(lat, lon);
    }

    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'json',
        apiKey: this.apiKey
      });

      if (language) {
        params.append('lang', language);
      }

      const data: GeoapifyResponse = await this.makeRequest(`${this.baseUrl}/geocode/reverse?${params}`);
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          ...result.properties,
          lat: result.geometry.coordinates[1],
          lon: result.geometry.coordinates[0]
        } as GeoapifyLocation;
      }

      return null;

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return this.getMockReverseGeocodingResult(lat, lon);
    }
  }

  // ========== AUTOCOMPLÉTION D'ADRESSE ==========
  
  async autocompleteAddress(
    text: string, 
    options?: {
      countryCode?: string;
      language?: string;
      limit?: number;
      bias?: { lat: number; lon: number; radius?: number };
    }
  ): Promise<GeoapifyLocation[]> {
    
    if (!text || text.length < 3) {
      return [];
    }

    if (!this.isConfigured()) {
      return this.getMockAutocompleteResults(text);
    }

    try {
      const params = new URLSearchParams({
        text: text.trim(),
        format: 'json',
        apiKey: this.apiKey,
        limit: (options?.limit || 5).toString()
      });

      if (options?.countryCode) {
        params.append('filter', `countrycode:${options.countryCode}`);
      }

      if (options?.language) {
        params.append('lang', options.language);
      }

      if (options?.bias) {
        const radius = options.bias.radius || 10000;
        params.append('bias', `proximity:${options.bias.lon},${options.bias.lat}`);
        params.append('filter', `circle:${options.bias.lon},${options.bias.lat},${radius}`);
      }

      const data: GeoapifyResponse = await this.makeRequest(`${this.baseUrl}/geocode/autocomplete?${params}`);
      
      return data.results.map(result => ({
        ...result.properties,
        lat: result.geometry.coordinates[1],
        lon: result.geometry.coordinates[0]
      })) as GeoapifyLocation[];

    } catch (error) {
      console.error('Autocomplete error:', error);
      return this.getMockAutocompleteResults(text);
    }
  }

  // ========== RECHERCHE DE LIEUX (PISCINES, PARCS, ETC.) ==========
  
  async searchPlaces(
    query: string,
    categories: string[],
    location: { lat: number; lon: number },
    radiusKm: number = 5
  ): Promise<PlaceSearch[]> {
    
    if (!location.lat || !location.lon || isNaN(location.lat) || isNaN(location.lon)) {
      console.warn('Invalid location for place search');
      return this.getMockPlaceResults(query, categories);
    }

    if (!this.isConfigured()) {
      return this.getMockPlaceResults(query, categories);
    }

    try {
      const params = new URLSearchParams({
        categories: categories.join(','),
        filter: `circle:${location.lon},${location.lat},${radiusKm * 1000}`,
        bias: `proximity:${location.lon},${location.lat}`,
        limit: '20',
        format: 'json',
        apiKey: this.apiKey
      });

      if (query && query.trim()) {
        params.append('text', query.trim());
      }

      const data = await this.makeRequest(`${this.baseUrl}/places?${params}`);
      
      return data.features.map((feature: any) => ({
        name: feature.properties.name || feature.properties.formatted || 'Lieu sans nom',
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
        formatted: feature.properties.formatted || '',
        categories: feature.properties.categories || [],
        distance: feature.properties.distance
      }));

    } catch (error) {
      console.error('Place search error:', error);
      return this.getMockPlaceResults(query, categories);
    }
  }

  // ========== MÉTHODES SPÉCIALISÉES POUR L'APP FITNESS ==========
  
  async findNearbyGyms(lat: number, lon: number, radiusKm: number = 3): Promise<PlaceSearch[]> {
    return this.searchPlaces('', [
      'sport.fitness',
      'sport.swimming_pool',
      'sport.sports_centre'
    ], { lat, lon }, radiusKm);
  }

  async findNearbyParks(lat: number, lon: number, radiusKm: number = 2): Promise<PlaceSearch[]> {
    return this.searchPlaces('', [
      'leisure.park',
      'natural.beach',
      'leisure.nature_reserve'
    ], { lat, lon }, radiusKm);
  }

  async findNearbySwimmingPools(lat: number, lon: number, radiusKm: number = 5): Promise<PlaceSearch[]> {
    return this.searchPlaces('piscine', [
      'sport.swimming_pool',
      'leisure.water_park'
    ], { lat, lon }, radiusKm);
  }

  // ========== UTILITAIRES ==========
  
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // ========== DONNÉES MOCK POUR LES TESTS ==========
  
  private getMockGeocodingResults(address: string): GeoapifyLocation[] {
    console.log('Using mock geocoding data for:', address);
    
    return [
      {
        lat: 48.8566,
        lon: 2.3522,
        formatted: `${address}, Paris, France`,
        address_line1: address,
        address_line2: '',
        city: 'Paris',
        postcode: '75001',
        country: 'France',
        country_code: 'fr',
        confidence: 0.9,
        place_id: 'mock-place-id',
        geometry: undefined,
        properties: undefined
      }
    ];
  }

  private getMockReverseGeocodingResult(lat: number, lon: number): GeoapifyLocation {
    console.log('Using mock reverse geocoding data');
    
    return {
      lat,
      lon,
      formatted: 'Adresse simulée, France',
      address_line1: '123 Rue de la Paix',
      address_line2: '',
      city: 'Paris',
      postcode: '75001',
      country: 'France',
      country_code: 'fr',
      confidence: 0.8,
      place_id: 'mock-reverse-id',
      geometry: undefined,
      properties: undefined
    };
  }

  private getMockAutocompleteResults(text: string): GeoapifyLocation[] {
    console.log('Using mock autocomplete data');
    
    const cities = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'];
    return cities
      .filter(city => city.toLowerCase().includes(text.toLowerCase()))
      .slice(0, 3)
      .map((city, index) => ({
        lat: 48.8566 + index * 0.1,
        lon: 2.3522 + index * 0.1,
        formatted: `${city}, France`,
        address_line1: city,
        address_line2: '',
        city: city,
        postcode: '75001',
        country: 'France',
        country_code: 'fr',
        confidence: 0.85,
        place_id: `mock-autocomplete-${index}`,
        geometry: undefined,
        properties: undefined
      }));
  }

  private getMockPlaceResults(query: string, categories: string[]): PlaceSearch[] {
    console.log('Using mock place search data');
    
    const mockPlaces: PlaceSearch[] = [];
    
    if (categories.some(cat => cat.includes('swimming'))) {
      mockPlaces.push({
        name: 'Piscine Municipale',
        lat: 48.8566,
        lon: 2.3522,
        formatted: 'Piscine Municipale, Paris',
        categories: ['sport.swimming_pool'],
        distance: 1200
      });
    }
    
    if (categories.some(cat => cat.includes('park'))) {
      mockPlaces.push({
        name: 'Parc des Tuileries',
        lat: 48.8634,
        lon: 2.3275,
        formatted: 'Parc des Tuileries, Paris',
        categories: ['leisure.park'],
        distance: 800
      });
    }

    if (categories.some(cat => cat.includes('fitness'))) {
      mockPlaces.push({
        name: 'Salle de Sport Basic Fit',
        lat: 48.8584,
        lon: 2.3545,
        formatted: 'Basic Fit, Paris',
        categories: ['sport.fitness'],
        distance: 500
      });
    }
    
    return mockPlaces;
  }
}

// Export updated service instance
export const geoapifyService = new GeoapifyService();

// Types exportés
export type { GeoapifyLocation, PlaceSearch };