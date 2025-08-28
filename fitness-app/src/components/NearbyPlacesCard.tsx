import React, { useState, useEffect } from 'react';
import { Navigation, RefreshCw, MapPin, Loader2, Compass, ExternalLink } from 'lucide-react';

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

interface PlaceData {
  name: string;
  formatted: string;
  lat: number;
  lng: number;
  distance?: number;
  categories?: string[];
  rating?: number;
  openingHours?: string;
  phone?: string;
  website?: string;
  amenity?: string;
  leisure?: string;
}

interface NearbyPlacesCardProps {
  userLocation: LocationResult | null;
}

interface Category {
  value: string;
  label: string;
  icon: string;
  searchTerms: string[];
}

const NearbyPlacesCard: React.FC<NearbyPlacesCardProps> = ({ userLocation }) => {
  const [places, setPlaces] = useState<PlaceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [error, setError] = useState('');
  const [radiusKm, setRadiusKm] = useState(5);

  const categories: Category[] = [
    { 
      value: 'all', 
      label: 'Tout', 
      icon: '🏃‍♀️',
      searchTerms: ['fitness', 'sport', 'gym', 'park', 'swimming']
    },
    { 
      value: 'fitness', 
      label: 'Salles', 
      icon: '🏋️‍♀️',
      searchTerms: ['fitness', 'gym', 'sport', 'health']
    },
    { 
      value: 'swimming', 
      label: 'Piscines', 
      icon: '🏊‍♀️',
      searchTerms: ['swimming', 'pool', 'aquatic']
    },
    { 
      value: 'park', 
      label: 'Parcs', 
      icon: '🌳',
      searchTerms: ['park', 'garden', 'recreation']
    }
  ];

  // Real location service using OpenStreetMap Overpass API
  const realLocationService = {
    calculateDistance: (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },

    // Real implementation using Overpass API (OpenStreetMap data)
    getNearbyPlaces: async (userLat: number, userLng: number, radiusKm: number): Promise<PlaceData[]> => {
      const radiusMeters = radiusKm * 1000;
      
      // Overpass API query for fitness, sports, and recreation facilities
      const overpassQuery = `
        [out:json][timeout:25];
        (
          nwr["leisure"~"^(fitness_centre|sports_centre|swimming_pool|park)$"](around:${radiusMeters},${userLat},${userLng});
          nwr["amenity"~"^(gym|swimming_pool)$"](around:${radiusMeters},${userLat},${userLng});
          nwr["sport"]["name"](around:${radiusMeters},${userLat},${userLng});
          nwr["club"="sport"]["name"](around:${radiusMeters},${userLat},${userLng});
        );
        out center meta;
      `;

      try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: overpassQuery,
          headers: {
            'Content-Type': 'text/plain'
          }
        });

        if (!response.ok) {
          throw new Error(`Overpass API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.elements || !Array.isArray(data.elements)) {
          return [];
        }

        // Process the results
        const places = data.elements
          .filter((element: any) => {
            // Must have a name and location
            return element.tags?.name && 
                   (element.lat && element.lon || element.center);
          })
          .map((element: any) => {
            const tags = element.tags || {};
            
            // Get coordinates (handle different element types)
            let lat: number, lng: number;
            if (element.center) {
              lat = element.center.lat;
              lng = element.center.lon;
            } else {
              lat = element.lat;
              lng = element.lon;
            }

            // Build categories array
            const categories: string[] = [];
            if (tags.leisure) categories.push(`leisure.${tags.leisure}`);
            if (tags.amenity) categories.push(`amenity.${tags.amenity}`);
            if (tags.sport) categories.push(`sport.${tags.sport}`);
            if (tags.club) categories.push(`club.${tags.club}`);

            // Determine formatted address
            const addressParts: string[] = [];
            if (tags['addr:street']) {
              addressParts.push(`${tags['addr:housenumber'] || ''} ${tags['addr:street']}`.trim());
            }
            if (tags['addr:city']) {
              addressParts.push(tags['addr:city']);
            } else if (tags['addr:postcode']) {
              addressParts.push(tags['addr:postcode']);
            }

            const formatted = addressParts.length > 0 
              ? addressParts.join(', ') 
              : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

            // Calculate distance
            const distance = realLocationService.calculateDistance(userLat, userLng, lat, lng) * 1000;

            return {
              name: tags.name,
              formatted,
              lat,
              lng,
              distance,
              categories,
              phone: tags.phone,
              website: tags.website,
              openingHours: tags.opening_hours,
              amenity: tags.amenity,
              leisure: tags.leisure
            };
          })
          .filter((place: PlaceData) => 
            place.distance !== undefined && place.distance <= radiusKm * 1000
          )
          .sort((a: PlaceData, b: PlaceData) => (a.distance || 0) - (b.distance || 0));

        return places;

      } catch (error) {
        console.error('Overpass API failed:', error);
        
        // Fallback: try Nominatim search for nearby amenities
        return realLocationService.fallbackNearbySearch(userLat, userLng, radiusKm);
      }
    },

    // Fallback using Nominatim search
    fallbackNearbySearch: async (userLat: number, userLng: number, radiusKm: number): Promise<PlaceData[]> => {
      const searchTerms = ['gym', 'fitness', 'piscine', 'park', 'sport'];
      const allResults: PlaceData[] = [];

      for (const term of searchTerms) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(term)}&` +
            `format=json&` +
            `limit=10&` +
            `bounded=1&` +
            `viewbox=${userLng - 0.05},${userLat + 0.05},${userLng + 0.05},${userLat - 0.05}&` +
            `addressdetails=1&` +
            `accept-language=fr`;

          const response = await fetch(url, {
            headers: { 'User-Agent': 'FitPlan/1.0 (fitness app)' }
          });

          if (response.ok) {
            const data = await response.json();
            
            const places = data
              .filter((item: any) => item.lat && item.lon && item.display_name)
              .map((item: any) => {
                const lat = parseFloat(item.lat);
                const lng = parseFloat(item.lon);
                const distance = realLocationService.calculateDistance(userLat, userLng, lat, lng) * 1000;

                return {
                  name: item.display_name.split(',')[0] || 'Lieu sans nom',
                  formatted: item.display_name,
                  lat,
                  lng,
                  distance,
                  categories: [term],
                  amenity: item.class === 'amenity' ? item.type : undefined,
                  leisure: item.class === 'leisure' ? item.type : undefined
                };
              })
              .filter((place: PlaceData) => 
                place.distance !== undefined && place.distance <= radiusKm * 1000
              );

            allResults.push(...places);
          }
        } catch (error) {
          console.warn(`Fallback search for ${term} failed:`, error);
        }
      }

      // Remove duplicates and sort by distance
      const uniquePlaces = allResults.filter((place, index, self) => 
        index === self.findIndex(p => 
          Math.abs(p.lat - place.lat) < 0.001 && Math.abs(p.lng - place.lng) < 0.001
        )
      );

      return uniquePlaces.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }
  };

  const loadNearbyPlaces = async () => {
    if (!userLocation) {
      setError('Position non disponible');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const nearbyPlaces = await realLocationService.getNearbyPlaces(
        userLocation.lat, 
        userLocation.lng, 
        radiusKm
      );
      
      // Validate places data
      const validPlaces = nearbyPlaces.filter(place => 
        place && 
        typeof place.lat === 'number' && 
        typeof place.lng === 'number' &&
        place.name && 
        place.name.trim() !== '' &&
        !isNaN(place.lat) && !isNaN(place.lng)
      );
      
      setPlaces(validPlaces);
      
      if (validPlaces.length === 0) {
        setError(`Aucun lieu trouvé dans un rayon de ${radiusKm} km`);
      }
    } catch (error: any) {
      console.error('Erreur chargement lieux à proximité:', error);
      setError(error.message || 'Erreur lors de la recherche des lieux');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLocation) {
      loadNearbyPlaces();
    }
  }, [userLocation, radiusKm]);

  const filteredPlaces = places.filter(place => {
    if (selectedCategory === 'all') return true;
    
    const category = categories.find(c => c.value === selectedCategory);
    if (!category) return false;
    
    // Check categories array
    const hasMatchingCategory = place.categories?.some(cat => 
      category.searchTerms.some(term => 
        cat.toLowerCase().includes(term.toLowerCase())
      )
    );
    
    // Also check amenity and leisure tags directly
    const hasMatchingAmenity = place.amenity && 
      category.searchTerms.some(term => 
        place.amenity!.toLowerCase().includes(term.toLowerCase())
      );
      
    const hasMatchingLeisure = place.leisure && 
      category.searchTerms.some(term => 
        place.leisure!.toLowerCase().includes(term.toLowerCase())
      );
    
    // Check name for keyword matches
    const hasMatchingName = place.name && 
      category.searchTerms.some(term => 
        place.name.toLowerCase().includes(term.toLowerCase())
      );
    
    return hasMatchingCategory || hasMatchingAmenity || hasMatchingLeisure || hasMatchingName;
  });

  const getPlaceIcon = (place: PlaceData): string => {
    if (!place.categories && !place.amenity && !place.leisure) return '📍';
    
    const checkTerms = [
      ...(place.categories || []),
      place.amenity || '',
      place.leisure || '',
      place.name.toLowerCase()
    ].join(' ').toLowerCase();
    
    if (checkTerms.includes('fitness') || checkTerms.includes('gym') || checkTerms.includes('sport')) return '🏋️‍♀️';
    if (checkTerms.includes('swimming') || checkTerms.includes('pool') || checkTerms.includes('piscine')) return '🏊‍♀️';
    if (checkTerms.includes('park') || checkTerms.includes('garden') || checkTerms.includes('parc')) return '🌳';
    
    return '📍';
  };

  const formatDistance = (distanceMeters?: number): string => {
    if (typeof distanceMeters !== 'number') return 'N/A';
    
    if (distanceMeters < 1000) {
      return `${Math.round(distanceMeters)} m`;
    } else {
      return `${(distanceMeters / 1000).toFixed(1)} km`;
    }
  };

  const openInMaps = (place: PlaceData) => {
    const query = encodeURIComponent(`${place.name} ${place.formatted}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
  };

  if (!userLocation) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <Navigation className="w-5 h-5 mr-2 text-green-600" />
            Lieux à proximité
          </h3>
        </div>
        
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-sm mb-2">Position non disponible</p>
          <p className="text-gray-500 text-xs">Activez la géolocalisation pour voir les lieux à proximité</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center">
          <Navigation className="w-5 h-5 mr-2 text-green-600" />
          Lieux à proximité
        </h3>
        <div className="flex items-center space-x-2">
          <select
            value={radiusKm}
            onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            disabled={loading}
          >
            <option value={2}>2 km</option>
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
          </select>
          <button
            onClick={loadNearbyPlaces}
            disabled={loading}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Actualiser les lieux"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex space-x-2 mb-4 overflow-x-auto">
        {categories.map((category) => (
          <button
            key={category.value}
            onClick={() => setSelectedCategory(category.value)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center space-x-1 ${
              selectedCategory === category.value
                ? 'bg-green-100 text-green-700 ring-2 ring-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600 mb-2" />
            <p className="text-gray-600 text-sm">Recherche en cours...</p>
            <p className="text-gray-500 text-xs mt-1">
              Recherche de lieux réels près de {userLocation.city}...
            </p>
          </div>
        ) : filteredPlaces.length > 0 ? (
          filteredPlaces.slice(0, 10).map((place, index) => (
            <div
              key={`${place.lat}-${place.lng}-${index}`}
              className="group p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
              onClick={() => openInMaps(place)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <div className="text-xl flex-shrink-0 mt-1">
                    {getPlaceIcon(place)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-800 truncate mb-1">
                          {place.name}
                        </div>
                        <div className="text-sm text-gray-600 truncate mb-1">
                          {place.formatted}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          {place.rating && (
                            <span className="flex items-center">
                              ⭐ {place.rating.toFixed(1)}
                            </span>
                          )}
                          {place.openingHours && (
                            <span>{place.openingHours}</span>
                          )}
                          {place.phone && (
                            <span>{place.phone}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="text-sm font-medium text-green-600 mb-1">
                          {formatDistance(place.distance)}
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : !loading && places.length === 0 ? (
          <div className="text-center py-8">
            <Compass className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 text-sm mb-2">Aucun lieu trouvé</p>
            <p className="text-gray-500 text-xs">
              {selectedCategory === 'all' 
                ? `Essayez d'augmenter le rayon de recherche à ${userLocation.city}`
                : 'Aucun lieu de cette catégorie dans les environs'}
            </p>
          </div>
        ) : filteredPlaces.length === 0 && places.length > 0 ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">
              {categories.find(c => c.value === selectedCategory)?.icon || '📍'}
            </div>
            <p className="text-gray-600 text-sm">
              Aucun {categories.find(c => c.value === selectedCategory)?.label.toLowerCase()} dans cette catégorie
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Essayez de sélectionner "Tout" ou d'augmenter le rayon
            </p>
          </div>
        ) : null}
      </div>

      {filteredPlaces.length > 10 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            {filteredPlaces.length - 10} autres lieux disponibles
          </p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Données réelles depuis OpenStreetMap • Cliquez pour ouvrir dans Google Maps
        </p>
      </div>
    </div>
  );
};

export default NearbyPlacesCard;