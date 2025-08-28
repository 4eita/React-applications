import React, { useState, useEffect } from 'react';
import { Navigation, Loader2, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';

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

interface RealLocationDetectorProps {
  onLocationDetected: (location: LocationResult) => void;
  onCityDetected: (city: string) => void;
  currentLocation?: LocationResult | null;
}

const RealLocationDetector: React.FC<RealLocationDetectorProps> = ({
  onLocationDetected,
  onCityDetected,
  currentLocation
}) => {
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    if (!navigator.geolocation) {
      setPermissionStatus('denied');
      setError('Géolocalisation non supportée par votre navigateur');
      return 'denied';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionStatus(result.state);
      
      result.addEventListener('change', () => {
        setPermissionStatus(result.state);
      });
      
      return result.state;
    } catch (error) {
      setPermissionStatus('unknown');
      return 'unknown';
    }
  };

  // Real reverse geocoding using Nominatim (free OpenStreetMap service)
  const reverseGeocode = async (lat: number, lng: number): Promise<LocationResult> => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr&addressdetails=1`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'FitPlan/1.0 (fitness app)'
        }
      });
      
      if (!response.ok) {
        throw new Error('Erreur de géocodage');
      }
      
      const data = await response.json();
      
      if (!data || !data.address) {
        throw new Error('Adresse non trouvée');
      }
      
      const address = data.address;
      
      // Extract city information - handle French address structure
      const city = address.city || 
                   address.town || 
                   address.village || 
                   address.municipality || 
                   address.suburb ||
                   'Ville inconnue';
      
      const locationResult: LocationResult = {
        lat,
        lng,
        city,
        country: address.country || 'France',
        formatted: data.display_name || `${lat}, ${lng}`,
        address: {
          street: [address.house_number, address.road].filter(Boolean).join(' '),
          postalCode: address.postcode,
          district: address.suburb || address.district || address.quarter
        }
      };
      
      console.log('Reverse geocoding result:', locationResult);
      return locationResult;
      
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      
      // Fallback with basic location info
      return {
        lat,
        lng,
        city: 'Position détectée',
        country: 'France',
        formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        address: {}
      };
    }
  };

  // Alternative: Try IP-based geolocation as fallback
  const getLocationByIP = async (): Promise<LocationResult> => {
    try {
      // Try multiple IP geolocation services
      const services = [
        'https://ipapi.co/json/',
        'https://api.ipify.org/?format=json', // Just IP, need to geocode
        'http://ip-api.com/json/' // Note: HTTP only for ip-api
      ];
      
      for (const serviceUrl of services) {
        try {
          const response = await fetch(serviceUrl);
          const data = await response.json();
          
          if (data.city && data.latitude && data.longitude) {
            return {
              lat: data.latitude,
              lng: data.longitude,
              city: data.city,
              country: data.country_name || data.country || 'France',
              formatted: `${data.city}, ${data.region || ''} ${data.country || 'France'}`.trim(),
              accuracy: 10000, // IP-based is less accurate
              address: {
                postalCode: data.postal
              }
            };
          }
        } catch (error) {
          console.warn(`IP service ${serviceUrl} failed:`, error);
          continue;
        }
      }
      
      throw new Error('Tous les services IP ont échoué');
      
    } catch (error) {
      console.error('IP geolocation failed:', error);
      throw error;
    }
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('GPS position obtained:', position.coords);
          resolve(position);
        },
        (error) => {
          let message = 'Erreur de géolocalisation';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Permission refusée par l\'utilisateur';
              setPermissionStatus('denied');
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Position non disponible';
              break;
            case error.TIMEOUT:
              message = 'Délai d\'attente dépassé';
              break;
          }
          console.error('Geolocation error:', error);
          reject(new Error(message));
        },
        options
      );
    });
  };

  const detectLocation = async () => {
    setDetecting(true);
    setError('');

    try {
      console.log('Starting location detection...');
      
      // First, try GPS
      try {
        const position = await getCurrentPosition();
        console.log('GPS successful, reverse geocoding...');
        
        const locationResult = await reverseGeocode(
          position.coords.latitude,
          position.coords.longitude
        );
        
        locationResult.accuracy = position.coords.accuracy;
        
        console.log('Location detected:', locationResult);
        
        onLocationDetected(locationResult);
        onCityDetected(locationResult.city);
        
        setPermissionStatus('granted');
        return;
        
      } catch (gpsError) {
        console.warn('GPS failed, trying IP geolocation...', gpsError);
        setError('GPS indisponible, tentative par IP...');
        
        // Fallback to IP-based geolocation
        try {
          const ipLocation = await getLocationByIP();
          console.log('IP geolocation successful:', ipLocation);
          
          onLocationDetected(ipLocation);
          onCityDetected(ipLocation.city);
          
          setError('Position approximative détectée par IP');
          return;
          
        } catch (ipError) {
          console.error('IP geolocation also failed:', ipError);
          throw new Error('Impossible de détecter votre position automatiquement');
        }
      }
      
    } catch (err: any) {
      const errorMessage = err.message || 'Impossible de détecter votre position';
      setError(errorMessage);
      setPermissionStatus('denied');
      
    } finally {
      setDetecting(false);
    }
  };

  const getStatusIcon = () => {
    if (detecting) return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
    if (permissionStatus === 'granted' || currentLocation) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (permissionStatus === 'denied') return <AlertTriangle className="w-5 h-5 text-red-600" />;
    return <MapPin className="w-5 h-5 text-gray-600" />;
  };

  const getStatusText = () => {
    if (currentLocation) {
      return `Position actuelle: ${currentLocation.city}${currentLocation.accuracy ? ` (±${Math.round(currentLocation.accuracy)}m)` : ''}`;
    }
    if (permissionStatus === 'granted') return 'Géolocalisation autorisée';
    if (permissionStatus === 'denied') return 'Géolocalisation refusée';
    return 'Position non détectée';
  };

  const getStatusColor = () => {
    if (currentLocation) return 'text-green-700';
    if (permissionStatus === 'granted') return 'text-green-600';
    if (permissionStatus === 'denied') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            {getStatusIcon()}
            <span className="font-medium text-blue-800 ml-2">Localisation automatique</span>
          </div>
          
          <div className={`text-sm ${getStatusColor()} mb-2`}>
            {getStatusText()}
          </div>

          {error && (
            <div className="text-sm text-red-600 mb-2 flex items-start">
              <AlertTriangle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {currentLocation && (
            <div className="text-xs text-gray-600 bg-white rounded-lg p-2 mt-2">
              <div><strong>Détails:</strong></div>
              <div>Ville: {currentLocation.city}</div>
              {currentLocation.address?.postalCode && (
                <div>Code postal: {currentLocation.address.postalCode}</div>
              )}
              {currentLocation.address?.street && (
                <div>Rue: {currentLocation.address.street}</div>
              )}
              <div>Coordonnées: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</div>
            </div>
          )}
        </div>
        
        <div className="ml-4">
          <button
            onClick={detectLocation}
            disabled={detecting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <Navigation className={`w-4 h-4 ${detecting ? 'animate-pulse' : ''}`} />
            <span>{detecting ? 'Détection...' : currentLocation ? 'Actualiser' : 'Détecter'}</span>
          </button>
        </div>
      </div>

      {permissionStatus === 'denied' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-800">
            <p className="font-medium mb-1">Comment réactiver la géolocalisation :</p>
            <ul className="text-xs space-y-1">
              <li>• Cliquez sur l'icône de cadenas dans la barre d'adresse</li>
              <li>• Sélectionnez "Autoriser" pour la localisation</li>
              <li>• Actualisez la page si nécessaire</li>
            </ul>
          </div>
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500">
        Votre position n'est utilisée que pour personnaliser vos recommandations d'activités à Argenteuil et aux alentours.
      </div>
    </div>
  );
};

export default RealLocationDetector;