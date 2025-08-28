import React from 'react';
import { 
  BarChart3, Heart, Zap, TrendingDown, Navigation, 
  Loader2, MapPin, CheckCircle, AlertTriangle, RefreshCw 
} from 'lucide-react';

interface ActivitySession {
  date: any;
  activity: string;
  duration?: number;
  actualDuration?: number;
  completed?: boolean;
  rating?: number;
  calories?: number;
}

interface UserStats {
  totalDuration?: number;
  favoriteActivity?: string;
  totalSessions?: number;
  totalCalories?: number;
  streakDays?: number;
  weeklyAverage?: number;
  monthlyProgress?: number;
}

interface UserProfile {
  name: string;
  city: string;
  weight: number;
  height: number;
  age: number;
  weeklyGoal?: number;
  fitnessLevel?: string;
  maxDuration: number;
  preferredActivity: string;
  goal: string;
  restDays: string[];
  notifications?: boolean;
}

interface WeightEntry {
  weight: number;
  date: any;
  notes?: string;
}

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

interface AuthUser {
  uid: string;
  email?: string;
  isAnonymous: boolean;
}

// Integrated Real Location Detector
const RealLocationDetector: React.FC<{
  onLocationDetected: (location: LocationResult) => void;
  onCityDetected: (city: string) => void;
  currentLocation?: LocationResult | null;
}> = ({ onLocationDetected, onCityDetected, currentLocation }) => {
  const [detecting, setDetecting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [permissionStatus, setPermissionStatus] = React.useState<'unknown' | 'granted' | 'denied'>('unknown');

  React.useEffect(() => {
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
      // Map PermissionState to allowed values
      const mappedState = result.state === 'granted'
        ? 'granted'
        : result.state === 'denied'
        ? 'denied'
        : 'unknown';
      setPermissionStatus(mappedState);
      
      result.addEventListener('change', () => {
        const mappedState = result.state === 'granted'
          ? 'granted'
          : result.state === 'denied'
          ? 'denied'
          : 'unknown';
        setPermissionStatus(mappedState);
      });
      
      return result.state;
    } catch (error) {
      setPermissionStatus('unknown');
      return 'unknown';
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<LocationResult> => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr&addressdetails=1`;
    
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'FitPlan/1.0 (fitness app)' }
      });
      
      if (!response.ok) throw new Error('Erreur de géocodage');
      
      const data = await response.json();
      
      if (!data || !data.address) throw new Error('Adresse non trouvée');
      
      const address = data.address;
      const city = address.city || address.town || address.village || address.municipality || 'Ville inconnue';
      
      return {
        lat,
        lng,
        city,
        country: address.country || 'France',
        formatted: data.display_name || `${lat}, ${lng}`,
        address: {
          street: [address.house_number, address.road].filter(Boolean).join(' '),
          postalCode: address.postcode,
          district: address.suburb || address.district
        }
      };
      
    } catch (error) {
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

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000
      };

      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  const detectLocation = async () => {
    setDetecting(true);
    setError('');

    try {
      const position = await getCurrentPosition();
      const locationResult = await reverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );
      
      locationResult.accuracy = position.coords.accuracy;
      
      onLocationDetected(locationResult);
      onCityDetected(locationResult.city);
      setPermissionStatus('granted');
      
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
        Votre position n'est utilisée que pour personnaliser vos recommandations d'activités près de chez vous.
      </div>
    </div>
  );
};

interface ProgressScreenProps {
  sessions: ActivitySession[];
  stats: UserStats | null;
  user: UserProfile;
  userId: string;
  userLocation: LocationResult | null;
  weightHistory: WeightEntry[];
  onWeightUpdate: (weight: number) => void;
  onLocationDetected: (location: LocationResult) => void;
  onCityDetected: (city: string) => void;
  onUserUpdate: (user: UserProfile) => void;
}

const ProgressScreen: React.FC<ProgressScreenProps> = ({
  sessions,
  stats,
  user,
  userId,
  userLocation,
  weightHistory,
  onWeightUpdate,
  onLocationDetected,
  onCityDetected,
  onUserUpdate
}) => {
  const getActivityColor = (activity: string): string => {
    const colors = {
      marche: 'bg-green-500',
      natation: 'bg-blue-500',
      course: 'bg-red-500',
      vélo: 'bg-yellow-500',
      'repos actif': 'bg-orange-500',
      repos: 'bg-gray-300'
    };
    return colors[activity as keyof typeof colors] || 'bg-gray-300';
  };

  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', { weekday: 'short' });
  };

  const formatWeightChange = (current: number, previous: number): { text: string; color: string; icon: string } => {
    const difference = current - previous;
    
    if (Math.abs(difference) < 0.1) {
      return { text: 'Stable', color: 'text-gray-500', icon: '➖' };
    }
    
    if (difference > 0) {
      return { text: `+${difference.toFixed(1)} kg`, color: 'text-orange-600', icon: '📈' };
    } else {
      return { text: `${difference.toFixed(1)} kg`, color: 'text-green-600', icon: '📉' };
    }
  };

  const getWeeklyActivityData = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      
      const dayActivity = sessions.find(s => {
        const sessionDate = new Date(s.date);
        return sessionDate.toDateString() === date.toDateString();
      });
      
      return {
        date,
        activity: dayActivity?.activity || 'repos',
        duration: dayActivity?.actualDuration || dayActivity?.duration || 0
      };
    });
  };

  const weeklyData = getWeeklyActivityData();
  const maxDuration = Math.max(...weeklyData.map(d => d.duration), 60);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Mes Progrès</h1>
      
      {/* Weekly Activity Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
          Activité des 7 derniers jours
        </h3>
        
        <div className="flex items-end justify-between h-32 mb-4 px-2">
          {weeklyData.map((day, i) => {
            const height = Math.max((day.duration / maxDuration) * 100, 8);
            
            return (
              <div key={i} className="flex flex-col items-center space-y-2 flex-1">
                <div 
                  className={`w-6 rounded-t-lg transition-all duration-500 ${getActivityColor(day.activity)} relative group cursor-pointer`}
                  style={{ height: `${height}%` }}
                  title={`${day.activity}: ${day.duration} min`}
                >
                  {day.duration > 0 && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {day.duration} min
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-600 text-center">
                  {getDayName(day.date)}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between text-sm flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Marche</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Natation</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Course</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>Repos actif</span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-6 text-white">
          <Heart className="w-8 h-8 mb-2" />
          <div className="text-2xl font-bold">{stats?.totalDuration || 0}</div>
          <div className="text-sm opacity-90">Minutes d'activité</div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white">
          <Zap className="w-8 h-8 mb-2" />
          <div className="text-2xl font-bold capitalize">
            {stats?.favoriteActivity || 'Marche'}
          </div>
          <div className="text-sm opacity-90">Activité favorite</div>
        </div>
      </div>

      {/* Location Detector */}
      {!userLocation && (
        <RealLocationDetector
          onLocationDetected={onLocationDetected}
          onCityDetected={(city: string) => {
            if (user && city !== user.city) {
              onUserUpdate({ ...user, city });
            }
            onCityDetected(city);
          }}
          currentLocation={userLocation}
        />
      )}

      {/* Weight History */}
      {weightHistory.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <TrendingDown className="w-5 h-5 mr-2 text-green-600" />
            Évolution du poids
          </h3>
          
          <div className="space-y-3">
            {weightHistory.slice(0, 5).map((entry, index) => {
              const isLatest = index === 0;
              const formatDate = (date: any) => {
                const weightDate = new Date(date.toDate ? date.toDate() : date);
                return weightDate.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: weightDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                });
              };

              return (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    isLatest ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {isLatest && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                    <div>
                      <div className="font-medium text-gray-800 flex items-center">
                        {entry.weight} kg
                        {isLatest && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            Actuel
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <div className="text-sm text-gray-600 mt-1">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {formatDate(entry.date)}
                    </div>
                    {index < weightHistory.length - 1 && (
                      <div className="text-xs mt-1">
                        <span className={formatWeightChange(entry.weight, weightHistory[index + 1].weight).color}>
                          {formatWeightChange(entry.weight, weightHistory[index + 1].weight).icon}
                          {formatWeightChange(entry.weight, weightHistory[index + 1].weight).text}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Weight Evolution Summary */}
          {weightHistory.length > 1 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 font-medium">Évolution totale</span>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">
                    {formatWeightChange(
                      weightHistory[0].weight, 
                      weightHistory[weightHistory.length - 1].weight
                    ).icon}
                  </span>
                  <span className={`font-bold ${
                    formatWeightChange(
                      weightHistory[0].weight, 
                      weightHistory[weightHistory.length - 1].weight
                    ).color
                  }`}>
                    {formatWeightChange(
                      weightHistory[0].weight, 
                      weightHistory[weightHistory.length - 1].weight
                    ).text}
                  </span>
                </div>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Sur {weightHistory.length} pesées
              </div>
            </div>
          )}
        </div>
      )}

      {/* Goal Progress */}
      {user.weeklyGoal && stats && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Objectifs de la semaine
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Séances réalisées
                </span>
                <span className="text-sm text-gray-600">
                  {Math.min(sessions.filter(s => {
                    const sessionDate = new Date(s.date);
                    const weekStart = new Date();
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                    return sessionDate >= weekStart && s.completed;
                  }).length, user.weeklyGoal)} / {user.weeklyGoal}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((sessions.filter(s => {
                      const sessionDate = new Date(s.date);
                      const weekStart = new Date();
                      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                      return sessionDate >= weekStart && s.completed;
                    }).length / user.weeklyGoal) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Motivation Message */}
      {sessions.length === 0 && (
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            Vos statistiques vous attendent !
          </h3>
          <p className="text-gray-600 text-sm">
            Commencez votre première activité pour voir vos progrès ici.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProgressScreen;