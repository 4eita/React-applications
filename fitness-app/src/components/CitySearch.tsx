import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, Navigation, X, Check } from 'lucide-react';

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

interface EnhancedCitySearchProps {
  onCitySelect: (city: string, location?: LocationResult) => void;
  placeholder?: string;
  defaultValue?: string;
  showCurrentLocation?: boolean;
  allowFullAddress?: boolean;
  className?: string;
}

const EnhancedCitySearch: React.FC<EnhancedCitySearchProps> = ({
  onCitySelect,
  placeholder = "Rechercher une ville ou adresse...",
  defaultValue = "",
  showCurrentLocation = true,
  allowFullAddress = true,
  className = ""
}) => {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<AddressSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check geolocation permission on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    if (!navigator.geolocation) {
      setHasLocationPermission(false);
      return;
    }

    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setHasLocationPermission(result.state === 'granted');
        
        result.addEventListener('change', () => {
          setHasLocationPermission(result.state === 'granted');
        });
      } else {
        setHasLocationPermission(null);
      }
    } catch (error) {
      setHasLocationPermission(null);
    }
  };

  // REAL French address search using government API and Nominatim
  const searchAddresses = async (searchQuery: string): Promise<AddressSearchResult[]> => {
    if (searchQuery.length < 2) return [];
    
    try {
      // First try: French Government Address API (most accurate for French addresses)
      const govUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=6&autocomplete=1`;
      
      const govResponse = await fetch(govUrl);
      
      if (govResponse.ok) {
        const govData = await govResponse.json();
        
        if (govData.features && govData.features.length > 0) {
          return govData.features.map((feature: any) => {
            const props = feature.properties || {};
            const coords = feature.geometry?.coordinates || [0, 0];
            
            return {
              formatted: props.label || '',
              city: props.city || props.name || 'Ville inconnue',
              country: 'France',
              lat: coords[1], // GeoJSON uses [lng, lat]
              lng: coords[0],
              confidence: Math.min(props.score || 0.5, 1.0),
              components: {
                street_number: props.housenumber,
                route: props.street,
                locality: props.city,
                administrative_area_level_2: props.context?.split(',')[0]?.trim(),
                administrative_area_level_1: props.context?.split(',')[1]?.trim(),
                country: 'France',
                postal_code: props.postcode
              }
            };
          }).filter((result: { lat: any; lng: any; }) => result.lat && result.lng);
        }
      }
      
      // Fallback: Nominatim (OpenStreetMap) for broader search
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchQuery)}&` +
        `format=json&addressdetails=1&limit=6&countrycodes=fr&accept-language=fr`;
      
      const nominatimResponse = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'FitPlan/1.0 (fitness app)' }
      });
      
      if (nominatimResponse.ok) {
        const nominatimData = await nominatimResponse.json();
        
        return nominatimData.map((item: any) => {
          const address = item.address || {};
          const city = address.city || address.town || address.village || address.municipality || 'Lieu inconnu';
          
          return {
            formatted: item.display_name,
            city,
            country: address.country || 'France',
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            confidence: parseFloat(item.importance) || 0.5,
            components: {
              street_number: address.house_number,
              route: address.road,
              locality: city,
              administrative_area_level_2: address.county,
              administrative_area_level_1: address.state,
              country: address.country || 'France',
              postal_code: address.postcode
            }
          };
        }).filter((result: { lat: number; lng: number; }) => result.lat && result.lng && !isNaN(result.lat) && !isNaN(result.lng));
      }
      
      return [];
      
    } catch (error) {
      console.error('Address search failed:', error);
      throw new Error('Erreur lors de la recherche d\'adresses');
    }
  };

  // REAL geolocation with reverse geocoding
  const getCurrentLocation = async (): Promise<LocationResult> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // Real reverse geocoding using Nominatim
            const reverseUrl = `https://nominatim.openstreetmap.org/reverse?` +
              `lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=fr`;
            
            const response = await fetch(reverseUrl, {
              headers: { 'User-Agent': 'FitPlan/1.0 (fitness app)' }
            });
            
            if (!response.ok) {
              throw new Error('Erreur de géocodage inversé');
            }
            
            const data = await response.json();
            
            if (!data || !data.address) {
              throw new Error('Adresse non trouvée pour cette position');
            }
            
            const address = data.address;
            const city = address.city || address.town || address.village || address.municipality || 'Position détectée';
            
            const locationResult: LocationResult = {
              lat: latitude,
              lng: longitude,
              city,
              country: address.country || 'France',
              formatted: data.display_name || `${city}, France`,
              accuracy: position.coords.accuracy,
              address: {
                street: [address.house_number, address.road].filter(Boolean).join(' '),
                postalCode: address.postcode,
                district: address.suburb || address.district
              }
            };
            
            resolve(locationResult);
            
          } catch (error) {
            reject(new Error('Impossible de déterminer votre adresse'));
          }
        },
        (error) => {
          let message = 'Erreur de géolocalisation';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Permission refusée. Autorisez la géolocalisation.';
              setHasLocationPermission(false);
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Position indisponible.';
              break;
            case error.TIMEOUT:
              message = 'Délai dépassé. Réessayez.';
              break;
          }
          reject(new Error(message));
        },
        options
      );
    });
  };

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const results = await searchAddresses(searchQuery);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(-1);
    } catch (error: any) {
      setError(error.message || 'Erreur de recherche. Réessayez.');
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCurrentLocation = async () => {
    setIsLocating(true);
    setError('');

    try {
      const location = await getCurrentLocation();
      setQuery(location.city);
      onCitySelect(location.city, location);
      setShowSuggestions(false);
      setHasLocationPermission(true);
    } catch (error: any) {
      setError(error.message);
      if (error.message.includes('Permission refusée')) {
        setHasLocationPermission(false);
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setError('');
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleSuggestionSelect = (suggestion: AddressSearchResult) => {
    const locationResult: LocationResult = {
      lat: suggestion.lat,
      lng: suggestion.lng,
      city: suggestion.city,
      country: suggestion.country,
      formatted: suggestion.formatted,
      accuracy: suggestion.confidence * 100,
      address: {
        street: [suggestion.components.street_number, suggestion.components.route]
          .filter(Boolean).join(' '),
        postalCode: suggestion.components.postal_code,
        district: suggestion.components.administrative_area_level_2
      }
    };

    if (allowFullAddress) {
      setQuery(suggestion.formatted);
    } else {
      setQuery(suggestion.city);
    }
    
    onCitySelect(suggestion.city, locationResult);
    setSuggestions([]);
    setShowSuggestions(false);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const clearInput = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setError('');
    inputRef.current?.focus();
  };

  const formatSuggestionDisplay = (suggestion: AddressSearchResult) => {
    if (allowFullAddress) {
      const parts = suggestion.formatted.split(',');
      return {
        primary: parts[0]?.trim() || suggestion.city,
        secondary: parts.slice(1).join(',').trim() || suggestion.country
      };
    } else {
      return {
        primary: suggestion.city,
        secondary: `${suggestion.components.postal_code || ''} ${suggestion.country}`.trim()
      };
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-blue-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder={placeholder}
          className="w-full p-3 pl-10 pr-16 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          autoComplete="off"
        />
        
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {isSearching && (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          )}
          
          {showCurrentLocation && (
            <button
              type="button"
              onClick={handleCurrentLocation}
              disabled={isLocating || hasLocationPermission === false}
              className={`p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                hasLocationPermission === false 
                  ? 'text-red-400' 
                  : isLocating 
                    ? 'text-blue-600' 
                    : 'text-gray-400 hover:text-blue-600'
              }`}
              title={
                hasLocationPermission === false 
                  ? 'Géolocalisation refusée' 
                  : 'Utiliser ma position actuelle'
              }
            >
              <Navigation className={`w-4 h-4 ${isLocating ? 'animate-pulse' : ''}`} />
            </button>
          )}
          
          {query && (
            <button
              type="button"
              onClick={clearInput}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Effacer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 flex items-center">
            <span className="mr-1">⚠️</span>
            {error}
          </p>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {suggestions.map((suggestion, index) => {
            const display = formatSuggestionDisplay(suggestion);
            return (
              <button
                key={index}
                onClick={() => handleSuggestionSelect(suggestion)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors duration-150 focus:outline-none ${
                  index === selectedIndex 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start min-w-0 flex-1">
                    <MapPin className="w-4 h-4 text-gray-400 mr-3 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">
                        {display.primary}
                      </div>
                      {display.secondary && (
                        <div className="text-sm text-gray-500 truncate">
                          {display.secondary}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center ml-2">
                    <span className={`text-xs ${getConfidenceColor(suggestion.confidence)} font-medium`}>
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && !isSearching && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <div className="text-sm text-gray-500">Aucun résultat trouvé</div>
          <div className="text-xs text-gray-400 mt-1">
            Vérifiez l'orthographe ou essayez "Argenteuil" par exemple
          </div>
        </div>
      )}

      {query.length > 0 && query.length < 2 && (
        <div className="mt-2 text-xs text-gray-500">
          Tapez au moins 2 caractères pour rechercher
        </div>
      )}

      {hasLocationPermission === false && showCurrentLocation && (
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-xs text-orange-700">
            Géolocalisation désactivée. Autorisez l'accès dans les paramètres de votre navigateur pour utiliser votre position actuelle.
          </p>
        </div>
      )}

      <div className="mt-1 text-xs text-gray-500">
        {allowFullAddress 
          ? 'Ex: Argenteuil, 95100, Rue Gabriel Péri Argenteuil' 
          : 'Ex: Argenteuil, Boulogne-Billancourt, Saint-Denis'}
      </div>
    </div>
  );
};

export default EnhancedCitySearch;