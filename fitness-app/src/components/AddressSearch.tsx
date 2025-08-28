import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MapPin, 
  Loader2, 
  X, 
  Navigation,
  Home,
  Building,
  Map
} from 'lucide-react';

interface AddressComponent {
  street_number?: string;
  route?: string;
  locality?: string;
  administrative_area_level_2?: string;
  administrative_area_level_1?: string;
  country?: string;
  postal_code?: string;
}

interface DetailedAddress {
  formatted: string;
  components: AddressComponent;
  lat: number;
  lng: number;
  place_id?: string;
  confidence: number;
  type: 'street' | 'city' | 'postal_code' | 'establishment';
}

interface AddressSearchProps {
  onAddressSelect: (address: DetailedAddress) => void;
  onCitySelect?: (city: string) => void;
  placeholder?: string;
  defaultValue?: string;
  showCurrentLocation?: boolean;
  className?: string;
}

const AddressSearch: React.FC<AddressSearchProps> = ({
  onAddressSelect,
  onCitySelect,
  placeholder = "Rechercher une adresse...",
  defaultValue = "",
  showCurrentLocation = true,
  className = ""
}) => {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<DetailedAddress[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // REAL French address search using government API
  const searchAddresses = async (searchQuery: string): Promise<DetailedAddress[]> => {
    if (searchQuery.length < 2) return [];
    
    try {
      // Use French Government Address API (free and official)
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=8&autocomplete=1`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Erreur API gouvernementale');
      }
      
      const data = await response.json();
      
      if (!data.features || !Array.isArray(data.features)) {
        return [];
      }
      
      return data.features.map((feature: any) => {
        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates || [0, 0];
        
        // Extract address components
        const components: AddressComponent = {
          street_number: props.housenumber,
          route: props.street,
          locality: props.city,
          administrative_area_level_2: props.context?.split(',')[0]?.trim(),
          administrative_area_level_1: props.context?.split(',')[1]?.trim(),
          country: 'France',
          postal_code: props.postcode
        };
        
        // Determine address type
        let type: 'street' | 'city' | 'postal_code' | 'establishment' = 'city';
        if (props.housenumber && props.street) {
          type = 'street';
        } else if (props.postcode && !props.street) {
          type = 'postal_code';
        } else if (props.type === 'municipality') {
          type = 'city';
        }
        
        return {
          formatted: props.label || '',
          components,
          lat: coords[1], // GeoJSON uses [lng, lat]
          lng: coords[0],
          confidence: Math.min(props.score || 0.5, 1.0),
          type,
          place_id: `france_${props.id || Math.random()}`
        };
      }).filter((result: { lat: number; lng: number; formatted: any; }) => 
        result.lat && result.lng && 
        !isNaN(result.lat) && !isNaN(result.lng) &&
        result.formatted
      );
      
    } catch (error) {
      console.warn('French Gov API failed, trying Nominatim fallback');
      
      // Fallback to Nominatim (OpenStreetMap)
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(searchQuery)}&` +
          `format=json&addressdetails=1&limit=8&countrycodes=fr&accept-language=fr`;
        
        const response = await fetch(nominatimUrl, {
          headers: { 'User-Agent': 'FitPlan/1.0 (fitness app)' }
        });
        
        if (!response.ok) throw new Error('Nominatim failed');
        
        const data = await response.json();
        
        return data.map((item: any) => {
          const address = item.address || {};
          
          const components: AddressComponent = {
            street_number: address.house_number,
            route: address.road,
            locality: address.city || address.town || address.village,
            administrative_area_level_2: address.county,
            administrative_area_level_1: address.state,
            country: address.country || 'France',
            postal_code: address.postcode
          };
          
          return {
            formatted: item.display_name,
            components,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            confidence: parseFloat(item.importance) || 0.5,
            type: 'city' as const,
            place_id: `osm_${item.osm_id}`
          };
        }).filter((result: { lat: number; lng: number; }) => 
          result.lat && result.lng && 
          !isNaN(result.lat) && !isNaN(result.lng)
        );
        
      } catch (nominatimError) {
        throw new Error('Tous les services de géocodage ont échoué');
      }
    }
  };

  const getCurrentLocationAddress = async (): Promise<DetailedAddress> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Real reverse geocoding using Nominatim
            const { latitude, longitude } = position.coords;
            const url = `https://nominatim.openstreetmap.org/reverse?` +
              `lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=fr`;
            
            const response = await fetch(url, {
              headers: { 'User-Agent': 'FitPlan/1.0 (fitness app)' }
            });
            
            if (!response.ok) {
              throw new Error('Erreur de géocodage inversé');
            }
            
            const data = await response.json();
            
            if (!data || !data.address) {
              throw new Error('Adresse non trouvée');
            }
            
            const address = data.address;
            const city = address.city || address.town || address.village || 'Position actuelle';
            
            const result: DetailedAddress = {
              formatted: data.display_name || `${city}, France`,
              components: {
                street_number: address.house_number,
                route: address.road,
                locality: city,
                administrative_area_level_2: address.county,
                administrative_area_level_1: address.state,
                country: address.country || 'France',
                postal_code: address.postcode
              },
              lat: latitude,
              lng: longitude,
              confidence: 1.0,
              type: 'establishment'
            };
            
            resolve(result);
            
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          let message = 'Impossible d\'obtenir la position actuelle';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Permission de géolocalisation refusée';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Position non disponible';
              break;
            case error.TIMEOUT:
              message = 'Délai de géolocalisation dépassé';
              break;
          }
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
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
      setError(error.message || 'Erreur lors de la recherche d\'adresses');
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (query.trim()) {
        performSearch(query.trim());
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setError('');
    
    if (value.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleAddressSelect = (address: DetailedAddress) => {
    setQuery(address.components.locality || address.formatted);
    setSuggestions([]);
    setShowSuggestions(false);
    setError('');
    onAddressSelect(address);
    
    if (onCitySelect && address.components.locality) {
      onCitySelect(address.components.locality);
    }
  };

  const handleCurrentLocation = async () => {
    setIsSearching(true);
    setError('');
    
    try {
      const currentAddress = await getCurrentLocationAddress();
      handleAddressSelect(currentAddress);
    } catch (error: any) {
      setError(error.message || 'Erreur de géolocalisation');
    } finally {
      setIsSearching(false);
    }
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
          handleAddressSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const getAddressIcon = (type: string) => {
    switch (type) {
      case 'street': return <Home className="w-4 h-4 text-blue-500" />;
      case 'establishment': return <Building className="w-4 h-4 text-green-500" />;
      case 'city': return <Map className="w-4 h-4 text-purple-500" />;
      case 'postal_code': return <MapPin className="w-4 h-4 text-orange-500" />;
      default: return <MapPin className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatAddressDisplay = (address: DetailedAddress) => {
    const components = address.components;
    const street = [components.street_number, components.route].filter(Boolean).join(' ');
    const city = components.locality;
    const postal = components.postal_code;
    
    return {
      primary: street || city || address.formatted.split(',')[0],
      secondary: street ? `${postal ? postal + ' ' : ''}${city}` : components.administrative_area_level_1
    };
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
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={placeholder}
          className="w-full p-3 pl-10 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
              disabled={isSearching}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
              title="Utiliser ma position actuelle"
            >
              <Navigation className="w-4 h-4" />
            </button>
          )}
          
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Effacer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {suggestions.map((address, index) => {
            const display = formatAddressDisplay(address);
            return (
              <button
                key={index}
                onClick={() => handleAddressSelect(address)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors duration-150 focus:outline-none ${
                  index === selectedIndex 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    {getAddressIcon(address.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {display.primary}
                    </div>
                    {display.secondary && (
                      <div className="text-sm text-gray-500 truncate">
                        {display.secondary}
                      </div>
                    )}
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="text-xs text-gray-400 capitalize">
                        {address.type}
                      </span>
                      <span className="text-xs text-green-600">
                        {Math.round(address.confidence * 100)}% fiable
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && !isSearching && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center text-gray-500 text-sm">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <div>Aucune adresse trouvée</div>
          <div className="text-xs mt-1">Vérifiez l'orthographe ou essayez une recherche moins précise</div>
        </div>
      )}

      {query.length > 0 && query.length < 2 && (
        <div className="mt-2 text-xs text-gray-500">
          Tapez au moins 2 caractères pour rechercher
        </div>
      )}

      <div className="mt-1 text-xs text-gray-500">
        Ex: Argenteuil, 95100, Rue Gabriel Péri Argenteuil
      </div>
    </div>
  );
};

export default AddressSearch;