import React from 'react';
import { 
  Settings, UserCheck, Target, Activity, Calendar, 
  MapPin, Save, LogOut, Search, Navigation, X, Loader2 
} from 'lucide-react';
import { UserProfile, AuthUser } from '../../types';

// Integrated Real French Address Search Component
const RealCitySearch: React.FC<{
  defaultValue: string;
  onCitySelect: (city: string, locationData?: any) => void;
}> = ({ defaultValue, onCitySelect }) => {
  const [query, setQuery] = React.useState(defaultValue);
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const searchFrenchAddresses = async (searchQuery: string) => {
    if (searchQuery.length < 2) return [];
    
    try {
      // French Government API
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
              lat: coords[1],
              lng: coords[0],
              confidence: props.score || 0.5,
              postcode: props.postcode
            };
          });
        }
      }
      
      // Fallback to Nominatim
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=6&countrycodes=fr&accept-language=fr`;
      const nominatimResponse = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'FitPlan/1.0' }
      });
      
      if (nominatimResponse.ok) {
        const nominatimData = await nominatimResponse.json();
        return nominatimData.map((item: any) => {
          const address = item.address || {};
          const city = address.city || address.town || address.village || 'Ville inconnue';
          
          return {
            formatted: item.display_name,
            city,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            confidence: parseFloat(item.importance) || 0.5,
            postcode: address.postcode
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('Address search failed:', error);
      return [];
    }
  };

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchFrenchAddresses(searchQuery);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
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

  const handleSuggestionSelect = (suggestion: any) => {
    setQuery(suggestion.city);
    setSuggestions([]);
    setShowSuggestions(false);
    onCitySelect(suggestion.city, suggestion);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          className="w-full p-3 pl-10 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Rechercher votre ville..."
          autoComplete="off"
        />
        
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        
        {isSearching && (
          <Loader2 className="w-4 h-4 text-purple-500 animate-spin absolute right-3 top-1/2 transform -translate-y-1/2" />
        )}
        
        {query && !isSearching && (
          <button
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setShowSuggestions(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionSelect(suggestion)}
              className="w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{suggestion.city}</div>
                  {suggestion.postcode && (
                    <div className="text-sm text-gray-500">{suggestion.postcode}</div>
                  )}
                </div>
                <div className="text-xs text-green-600 font-medium">
                  {Math.round((suggestion.confidence || 0.5) * 100)}%
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-1 text-xs text-gray-500">
        Ex: Argenteuil, Boulogne-Billancourt, Saint-Denis...
      </div>
    </div>
  );
};

interface ProfileScreenProps {
  user: UserProfile;
  authUser: AuthUser;
  isOnline: boolean;
  onUserUpdate: (user: UserProfile) => void;
  onLogout: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  authUser,
  isOnline,
  onUserUpdate,
  onLogout
}) => {
  const handleInputChange = (field: keyof UserProfile, value: any) => {
    try {
      if (field === 'age' && (value < 10 || value > 100)) {
        console.warn('Age must be between 10 and 100');
        return;
      }
      if (field === 'weight' && (value < 30 || value > 300)) {
        console.warn('Weight must be between 30 and 300 kg');
        return;
      }
      if (field === 'height' && (value < 100 || value > 250)) {
        console.warn('Height must be between 100 and 250 cm');
        return;
      }
      
      const updatedUser = { ...user, [field]: value };
      onUserUpdate(updatedUser);
    } catch (error) {
      console.error('Error updating user field:', field, error);
    }
  };

  const handleCitySelect = (city: string, locationData?: any) => {
    // Update user city and optionally store location data
    const updatedUser = { ...user, city };
    
    // If we have location coordinates, we could store them for more precise location
    if (locationData?.lat && locationData?.lng) {
      // You could extend UserProfile type to include coordinates
      (updatedUser as any).coordinates = {
        lat: locationData.lat,
        lng: locationData.lng
      };
    }
    
    onUserUpdate(updatedUser);
  };

  const handleRestDayToggle = (day: string) => {
    const newRestDays = user.restDays.includes(day)
      ? user.restDays.filter(d => d !== day)
      : [...user.restDays, day];
    handleInputChange('restDays', newRestDays);
  };

  const exportUserData = () => {
    // Create exportable user data
    const exportData = {
      user,
      authUser: {
        uid: authUser.uid,
        email: authUser.email,
        isAnonymous: authUser.isAnonymous
      },
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitplan-data-${authUser.uid}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const calculateBMI = (): { value: number; category: string; color: string } => {
    const heightInM = user.height / 100;
    const bmi = user.weight / (heightInM * heightInM);
    
    let category = '';
    let color = '';
    
    if (bmi < 18.5) {
      category = 'Insuffisance pondérale';
      color = 'text-blue-600';
    } else if (bmi < 25) {
      category = 'Poids normal';
      color = 'text-green-600';
    } else if (bmi < 30) {
      category = 'Surpoids';
      color = 'text-orange-600';
    } else {
      category = 'Obésité';
      color = 'text-red-600';
    }
    
    return { value: Math.round(bmi * 10) / 10, category, color };
  };

  const bmi = calculateBMI();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Mon Profil</h1>
      
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
            <UserCheck className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
            <p className="text-gray-600">{user.goal}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>Niveau: {user.fitnessLevel || 'débutant'}</span>
              <span>•</span>
              <span className={bmi.color}>IMC: {bmi.value}</span>
            </div>
          </div>
        </div>
        
        {/* Basic Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-xl font-bold text-purple-600">{user.weight}</div>
            <div className="text-sm text-gray-600">kg</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-xl font-bold text-purple-600">{user.height}</div>
            <div className="text-sm text-gray-600">cm</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-xl font-bold text-purple-600">{user.age}</div>
            <div className="text-sm text-gray-600">ans</div>
          </div>
        </div>

        {/* BMI Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">Indice de Masse Corporelle (IMC)</span>
            <span className={`font-medium ${bmi.color}`}>{bmi.category}</span>
          </div>
        </div>
        
        {/* Quick Info */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center space-x-1">
            <Target className="w-4 h-4" />
            <span>Max: {user.maxDuration}min/jour</span>
          </div>
          <div className="flex items-center space-x-1">
            <Activity className="w-4 h-4" />
            <span className="capitalize">{user.preferredActivity}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />q
            <span>Objectif: {user.weeklyGoal || 5} séances/semaine</span>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="w-4 h-4" />
            <span>{user.city}</span>
          </div>
        </div>
      </div>
      
      {/* Settings */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Paramètres
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom
            </label>
            <input
              type="text"
              value={user.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Votre nom"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Âge
              </label>
              <input
                type="number"
                value={user.age}
                onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="10"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poids (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={user.weight}
                onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="30"
                max="300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taille (cm)
            </label>
            <input
              type="number"
              value={user.height}
              onChange={(e) => handleInputChange('height', parseInt(e.target.value) || 0)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              min="100"
              max="250"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objectif principal
            </label>
            <select
              value={user.goal}
              onChange={(e) => handleInputChange('goal', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="Perte de poids">Perte de poids</option>
              <option value="Prise de muscle">Prise de muscle</option>
              <option value="Améliorer ma forme">Améliorer ma forme</option>
              <option value="Maintenir ma forme">Maintenir ma forme</option>
              <option value="Récupération">Récupération</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activité préférée
              </label>
              <select
                value={user.preferredActivity}
                onChange={(e) => handleInputChange('preferredActivity', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="marche">Marche</option>
                <option value="natation">Natation</option>
                <option value="course">Course à pied</option>
                <option value="vélo">Vélo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niveau de fitness
              </label>
              <select
                value={user.fitnessLevel || 'débutant'}
                onChange={(e) => handleInputChange('fitnessLevel', e.target.value as 'débutant' | 'intermédiaire' | 'avancé')}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="débutant">Débutant</option>
                <option value="intermédiaire">Intermédiaire</option>
                <option value="avancé">Avancé</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durée max/jour (min)
              </label>
              <input
                type="number"
                value={user.maxDuration}
                onChange={(e) => handleInputChange('maxDuration', parseInt(e.target.value) || 60)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="15"
                max="180"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objectif hebdo (séances)
              </label>
              <input
                type="number"
                value={user.weeklyGoal || 5}
                onChange={(e) => handleInputChange('weeklyGoal', parseInt(e.target.value) || 5)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="1"
                max="7"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ville / Adresse
            </label>
            <RealCitySearch 
              defaultValue={user.city ?? ''}
              onCitySelect={handleCitySelect}
            />
            <p className="text-xs text-gray-500 mt-1">
              Utilisée pour trouver des activités et la météo près de chez vous
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jours de repos
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((day) => (
                <label key={day} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={user.restDays.includes(day)}
                    onChange={() => handleRestDayToggle(day)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm capitalize">{day}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Notifications</h4>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Rappels d'activité</span>
                <input
                  type="checkbox"
                  checked={user.notifications !== false}
                  onChange={(e) => handleInputChange('notifications', e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Informations de compte</h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium">{authUser.email}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Statut:</span>
            <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-orange-600'}`}>
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Type de compte:</span>
            <span className="font-medium">
              {authUser.isAnonymous ? 'Invité' : 'Enregistré'}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button 
            onClick={exportUserData}
            className="w-full text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 py-2 rounded-lg transition-colors"
          >
            Exporter mes données
          </button>
          
          <button 
            onClick={onLogout}
            className="w-full text-sm text-red-600 border border-red-200 hover:bg-red-50 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </div>

      {/* Data Privacy Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h4 className="font-semibold text-gray-800 mb-2">Confidentialité des données</h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          Vos données sont stockées de manière sécurisée et ne sont jamais partagées avec des tiers. 
          Vous pouvez exporter ou supprimer vos données à tout moment.
        </p>
      </div>
    </div>
  );
};

export default ProfileScreen;