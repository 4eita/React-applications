// services/locationService.ts

interface LocationResult {
  lat: number;
  lng: number;
  city: string;
  country: string;
  formatted: string;
  address?: {
    street?: string;
    postalCode?: string;
    district?: string;
  };
  accuracy?: number;
}

interface AddressSearchResult {
  formatted: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  confidence: number;
  components: {
    street_number?: string;
    route?: string;
    locality?: string;
    administrative_area_level_2?: string;
    administrative_area_level_1?: string;
    country?: string;
    postal_code?: string;
  };
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

interface PlaceData {
  [x: string]: any;
  name: string;
  formatted: string;
  lat: number;
  lng: number;
  distance?: number;
  categories?: string[];
}

class EnhancedLocationService {
  private lastKnownPosition: GeolocationPosition | null = null;
  private geocodingApiKey: string;
  private mapboxApiKey: string;
  private googlePlacesApiKey: string;
  
  constructor(config: {
    geocodingApiKey?: string;
    mapboxApiKey?: string;
    googlePlacesApiKey?: string;
  } = {}) {
    this.geocodingApiKey = config.geocodingApiKey || process.env.REACT_APP_GEOCODING_API_KEY || '';
    this.mapboxApiKey = config.mapboxApiKey || process.env.REACT_APP_MAPBOX_API_KEY || '';
    this.googlePlacesApiKey = config.googlePlacesApiKey || process.env.REACT_APP_GOOGLE_PLACES_API_KEY || '';
  }

  /**
   * Check geolocation permission status
   */
  async checkPermission(): Promise<PermissionState> {
    if (!navigator.permissions) {
      return 'prompt';
    }
    
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch (error) {
      return 'prompt';
    }
  }

  /**
   * Get current position with enhanced error handling
   */
  async getCurrentPosition(timeout: number = 15000, options?: GeolocationOptions): Promise<LocationResult | null> {
    if (!navigator.geolocation) {
      throw new Error('Géolocalisation non supportée par ce navigateur');
    }

    const positionOptions: PositionOptions = {
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? timeout,
      maximumAge: options?.maximumAge ?? 300000 // 5 minutes
    };

    try {
      const position = await this.getPositionPromise(positionOptions);
      this.lastKnownPosition = position;
      
      // Reverse geocode to get address details
      const locationResult = await this.reverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );
      
      locationResult.accuracy = position.coords.accuracy;
      return locationResult;
      
    } catch (error: any) {
      // Try to use cached position if available
      if (this.lastKnownPosition) {
        const cachedResult = await this.reverseGeocode(
          this.lastKnownPosition.coords.latitude,
          this.lastKnownPosition.coords.longitude
        );
        cachedResult.accuracy = this.lastKnownPosition.coords.accuracy;
        return cachedResult;
      }
      
      throw this.formatGeolocationError(error);
    }
  }

  /**
   * Convert geolocation API to Promise
   */
  private getPositionPromise(options: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  /**
   * Format geolocation errors into user-friendly messages
   */
  private formatGeolocationError(error: GeolocationPositionError): Error {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return new Error('Accès à la localisation refusé. Veuillez autoriser la géolocalisation.');
      case error.POSITION_UNAVAILABLE:
        return new Error('Position indisponible. Vérifiez votre connexion et réessayez.');
      case error.TIMEOUT:
        return new Error('Délai de géolocalisation dépassé. Réessayez ou saisissez votre adresse.');
      default:
        return new Error('Erreur de géolocalisation inconnue.');
    }
  }

  /**
   * Reverse geocode coordinates to address using multiple providers
   */
  async reverseGeocode(lat: number, lng: number): Promise<LocationResult> {
    // Try multiple providers in order of preference
    const providers = [
      () => this.reverseGeocodeWithMapbox(lat, lng),
      () => this.reverseGeocodeWithOpenStreetMap(lat, lng),
      () => this.reverseGeocodeWithGoogle(lat, lng)
    ];

    for (const provider of providers) {
      try {
        const result = await provider();
        if (result) return result;
      } catch (error) {
        console.warn('Reverse geocoding provider failed:', error);
        continue;
      }
    }

    // Fallback to basic coordinates
    return {
      lat,
      lng,
      city: 'Position inconnue',
      country: 'France',
      formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      address: {}
    };
  }

  /**
   * Reverse geocode with Mapbox
   */
  private async reverseGeocodeWithMapbox(lat: number, lng: number): Promise<LocationResult> {
    if (!this.mapboxApiKey) {
      throw new Error('Mapbox API key not configured');
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${this.mapboxApiKey}&language=fr`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Mapbox API error');
    
    const data = await response.json();
    const feature = data.features[0];
    
    if (!feature) throw new Error('No results from Mapbox');

    return this.parseMapboxResult(feature, lat, lng);
  }

  /**
   * Reverse geocode with OpenStreetMap (Nominatim)
   */
  private async reverseGeocodeWithOpenStreetMap(lat: number, lng: number): Promise<LocationResult> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FitPlan/1.0'
      }
    });
    
    if (!response.ok) throw new Error('Nominatim API error');
    
    const data = await response.json();
    return this.parseNominatimResult(data, lat, lng);
  }

  /**
   * Reverse geocode with Google Maps
   */
  private async reverseGeocodeWithGoogle(lat: number, lng: number): Promise<LocationResult> {
    if (!this.googlePlacesApiKey) {
      throw new Error('Google API key not configured');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googlePlacesApiKey}&language=fr`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Google Geocoding API error');
    
    const data = await response.json();
    if (data.status !== 'OK') throw new Error(`Google API error: ${data.status}`);
    
    return this.parseGoogleResult(data.results[0], lat, lng);
  }

  /**
   * Search addresses with autocomplete
   */
  async searchAddresses(query: string, options?: {
    countryCode?: string;
    language?: string;
    limit?: number;
    proximity?: { lat: number; lng: number };
  }): Promise<AddressSearchResult[]> {
    if (query.length < 3) return [];

    const providers = [
      () => this.searchWithMapbox(query, options),
      () => this.searchWithNominatim(query, options)
    ];

    for (const provider of providers) {
      try {
        const results = await provider();
        if (results && results.length > 0) return results;
      } catch (error) {
        console.warn('Address search provider failed:', error);
        continue;
      }
    }

    return [];
  }

  /**
   * Search addresses with Mapbox
   */
  private async searchWithMapbox(
    query: string, 
    options?: { countryCode?: string; limit?: number; proximity?: { lat: number; lng: number } }
  ): Promise<AddressSearchResult[]> {
    if (!this.mapboxApiKey) return [];

    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.mapboxApiKey}&language=fr&limit=${options?.limit || 8}`;
    
    if (options?.countryCode) {
      url += `&country=${options.countryCode}`;
    }
    
    if (options?.proximity) {
      url += `&proximity=${options.proximity.lng},${options.proximity.lat}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Mapbox search failed');
    
    const data = await response.json();
    return data.features.map((feature: any) => this.parseMapboxSearchResult(feature));
  }

  /**
   * Search addresses with Nominatim
   */
  private async searchWithNominatim(
    query: string,
    options?: { countryCode?: string; limit?: number }
  ): Promise<AddressSearchResult[]> {
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&accept-language=fr&limit=${options?.limit || 8}`;
    
    if (options?.countryCode) {
      url += `&countrycodes=${options.countryCode}`;
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'FitPlan/1.0' }
    });
    
    if (!response.ok) throw new Error('Nominatim search failed');
    
    const data = await response.json();
    return data.map((item: any) => this.parseNominatimSearchResult(item));
  }

  /**
   * Get city by IP (fallback method)
   */
  async getCityByIP(): Promise<string> {
    try {
      // Try multiple IP geolocation services
      const providers = [
        'https://ipapi.co/json/',
        'https://ip-api.com/json/',
        'https://ipinfo.io/json'
      ];

      for (const url of providers) {
        try {
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.city) {
            return data.city;
          }
        } catch (error) {
          continue;
        }
      }
      
      return 'Paris'; // Default fallback
    } catch (error) {
      return 'Paris';
    }
  }

  /**
   * Find nearby places of interest
   */
  async getNearbyPlaces(radiusKm: number = 5): Promise<PlaceData[]> {
    if (!this.lastKnownPosition) {
      throw new Error('Position non disponible');
    }

    const { latitude, longitude } = this.lastKnownPosition.coords;
    
    // Use Overpass API for OpenStreetMap data
    const query = `
      [out:json][timeout:25];
      (
        way["leisure"~"^(fitness_centre|sports_centre|swimming_pool)$"](around:${radiusKm * 1000},${latitude},${longitude});
        way["amenity"~"^(gym|swimming_pool)$"](around:${radiusKm * 1000},${latitude},${longitude});
        way["leisure"="park"](around:${radiusKm * 1000},${latitude},${longitude});
      );
      out center meta;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain' }
      });

      if (!response.ok) throw new Error('Overpass API error');
      
      const data = await response.json();
      return this.parseOverpassResults(data.elements, latitude, longitude);
    } catch (error) {
      console.warn('Nearby places search failed:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Helper methods for parsing API responses
  private parseMapboxResult(feature: any, lat: number, lng: number): LocationResult {
    const place = feature.place_name;
    const context = feature.context || [];
    
    const city = context.find((c: any) => c.id.includes('place'))?.text || 
                 feature.properties?.name || 'Ville inconnue';
    const country = context.find((c: any) => c.id.includes('country'))?.text || 'France';
    
    return {
      lat,
      lng,
      city,
      country,
      formatted: place,
      address: {
        street: feature.properties?.address,
        postalCode: context.find((c: any) => c.id.includes('postcode'))?.text
      }
    };
  }

  private parseNominatimResult(data: any, lat: number, lng: number): LocationResult {
    const address = data.address || {};
    
    return {
      lat,
      lng,
      city: address.city || address.town || address.village || 'Ville inconnue',
      country: address.country || 'France',
      formatted: data.display_name || `${lat}, ${lng}`,
      address: {
        street: [address.house_number, address.road].filter(Boolean).join(' '),
        postalCode: address.postcode,
        district: address.suburb || address.district
      }
    };
  }

  private parseGoogleResult(result: any, lat: number, lng: number): LocationResult {
    const components = result.address_components || [];
    const getComponent = (type: string) => 
      components.find((c: any) => c.types.includes(type))?.long_name;

    return {
      lat,
      lng,
      city: getComponent('locality') || getComponent('administrative_area_level_2') || 'Ville inconnue',
      country: getComponent('country') || 'France',
      formatted: result.formatted_address,
      address: {
        street: [getComponent('street_number'), getComponent('route')].filter(Boolean).join(' '),
        postalCode: getComponent('postal_code')
      }
    };
  }

  private parseMapboxSearchResult(feature: any): AddressSearchResult {
    const context = feature.context || [];
    const city = context.find((c: any) => c.id.includes('place'))?.text || 
                 feature.properties?.name || 'Ville inconnue';
    
    return {
      formatted: feature.place_name,
      city,
      country: context.find((c: any) => c.id.includes('country'))?.text || 'France',
      lat: feature.center[1],
      lng: feature.center[0],
      confidence: feature.relevance || 0.5,
      components: {
        locality: city,
        country: context.find((c: any) => c.id.includes('country'))?.text
      }
    };
  }

  private parseNominatimSearchResult(item: any): AddressSearchResult {
    const address = item.address || {};
    
    return {
      formatted: item.display_name,
      city: address.city || address.town || address.village || 'Ville inconnue',
      country: address.country || 'France',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      confidence: parseFloat(item.importance) || 0.5,
      components: {
        street_number: address.house_number,
        route: address.road,
        locality: address.city || address.town,
        postal_code: address.postcode,
        country: address.country
      }
    };
  }

  private parseOverpassResults(elements: any[], userLat: number, userLng: number): PlaceData[] {
    return elements.map(element => {
      const tags = element.tags || {};
      const center = element.center || { lat: element.lat, lon: element.lon };
      
      const distance = this.calculateDistance(
        userLat, userLng, center.lat, center.lon
      ) * 1000; // Convert to meters

      return {
        name: tags.name || 'Lieu sans nom',
        formatted: this.formatPlaceAddress(tags, center),
        lat: center.lat,
        lng: center.lon,
        distance,
        categories: this.getPlaceCategories(tags)
      };
    }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  private formatPlaceAddress(tags: any, center: any): string {
    const parts = [
      tags.name,
      tags['addr:street'],
      tags['addr:city'] || tags.city
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : `${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}`;
  }

  private getPlaceCategories(tags: any): string[] {
    const categories = [];
    
    if (tags.leisure) categories.push(`leisure.${tags.leisure}`);
    if (tags.amenity) categories.push(`amenity.${tags.amenity}`);
    if (tags.sport) categories.push(`sport.${tags.sport}`);
    
    return categories;
  }
}

// Export singleton instance
export const locationService = new EnhancedLocationService();