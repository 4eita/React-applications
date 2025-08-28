// components/screens/HomeScreen.tsx
import React from 'react';
import { 
  Sun, Cloud, CloudRain, Thermometer, MapPin, RefreshCw, 
  Trophy, Flame, Medal, Clock 
} from 'lucide-react';
import { WeatherData, UserProfile, DailyPlan, ActivitySession, UserStats, LocationResult } from '../../types';
import exp from 'constants';
// Import with error handling
let PlanCard: any, NearbyPlacesCard: any, planGenerator: any;

try {
  PlanCard = require('../PlanCard').default;
  NearbyPlacesCard = require('../NearbyPlacesCard').default;
  planGenerator = require('../../services/planGenerator').planGenerator;
} catch (error) {
  console.error('Failed to load HomeScreen dependencies:', error);
  // Fallback components
  PlanCard = ({ plan, onStartActivity }: any) => (
    <div className="bg-gray-200 p-4 rounded-xl">Plan component failed to load</div>
  );
  NearbyPlacesCard = ({ userLocation }: any) => (
    <div className="bg-gray-200 p-4 rounded-xl">Nearby places component failed to load</div>
  );
  planGenerator = {
    generateDailyPlan: () => ({
      activity: 'repos',
      duration: 0,
      intensity: 'repos',
      reason: 'Service non disponible',
      icon: '⚠️',
      calories: 0
    })
  };
}



interface HomeScreenProps {
  user: UserProfile;
  weather: WeatherData;
  sessions: ActivitySession[];
  stats: UserStats | null;
  isOnline: boolean;
  userLocation: LocationResult | null;
  onActivityComplete: (plan: DailyPlan, actualDuration?: number, rating?: number, notes?: string) => void;
  onCityChange: (city: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  weather,
  sessions,
  stats,
  isOnline,
  userLocation,
  onActivityComplete,
  onCityChange
}) => {
  const dailyPlan = planGenerator.generateDailyPlan(weather, user);

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny': return <Sun className="w-8 h-8 text-yellow-300" />;
      case 'cloudy': return <Cloud className="w-8 h-8 text-gray-300" />;
      case 'rainy': return <CloudRain className="w-8 h-8 text-blue-300" />;
      default: return <Cloud className="w-8 h-8 text-gray-300" />;
    }
  };

  const getWeatherMessage = () => {
    if (weather.condition === 'rainy') {
      return "Idéal pour une séance de natation en piscine !";
    }
    if (weather.temp > 25) {
      return "Parfait pour une activité en extérieur, pensez à vous hydrater !";
    }
    if (weather.temp < 10) {
      return "Température fraîche, échauffez-vous bien avant l'effort !";
    }
    return "Conditions idéales pour votre activité !";
  };

  const getWeatherConditionText = () => {
    switch (weather.condition) {
      case 'sunny': return 'Ensoleillé';
      case 'cloudy': return 'Nuageux';
      case 'rainy': return 'Pluvieux';
      default: return 'Variable';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Bonjour {user.name} !
        </h1>
        <p className="text-gray-600">Votre programme d'aujourd'hui vous attend</p>
        {!isOnline && (
          <div className="mt-2 inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
            Mode offline - synchronisation en attente
          </div>
        )}
      </div>

      {/* Weather Card */}
      <div className="bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5" />
              <span className="font-medium">{user.city || 'Paris'}</span>
            </div>
            <div className="flex items-center space-x-2">
              {getWeatherIcon(weather.condition)}
              <button
                onClick={() => onCityChange(user.city || 'Paris')}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Actualiser la météo"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-4">
            <div className="text-3xl font-bold">{weather.temp}°C</div>
            <div className="text-sm opacity-90">
              {getWeatherConditionText()}
            </div>
          </div>

          <div className="flex justify-between text-sm opacity-90 mb-4">
            <div className="flex items-center space-x-1">
              <Thermometer className="w-4 h-4" />
              <span>{weather.humidity}% humidité</span>
            </div>
            <div>Vent: {weather.windSpeed} km/h</div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <p className="text-sm leading-relaxed">
              {getWeatherMessage()}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Plan Card */}
      <PlanCard plan={dailyPlan} onStartActivity={onActivityComplete} />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-lg text-center">
          <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <div className="text-lg font-bold text-gray-800">
            {stats?.totalSessions || 0}
          </div>
          <div className="text-sm text-gray-600">Séances total</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-lg text-center">
          <Flame className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <div className="text-lg font-bold text-gray-800">
            {stats?.totalCalories || 0}
          </div>
          <div className="text-sm text-gray-600">Calories brûlées</div>
        </div>
      </div>

      {/* Nearby Places */}
      <NearbyPlacesCard userLocation={userLocation} />

      {/* Performance Overview */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <Medal className="w-5 h-5 mr-2 text-purple-600" />
          Vos performances
        </h3>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl">
            <div className="text-2xl font-bold text-green-600">
              {stats?.streakDays || 0}
            </div>
            <div className="text-sm text-green-700">Jours consécutifs</div>
          </div>
          <div className="p-4 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl">
            <div className="text-2xl font-bold text-blue-600">
              {stats?.weeklyAverage || 0}
            </div>
            <div className="text-sm text-blue-700">Moy. hebdo</div>
          </div>
        </div>

        {stats?.monthlyProgress !== undefined && (
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm text-purple-700">Progrès ce mois</span>
              <span className="text-lg font-bold text-purple-600">
                {stats.monthlyProgress > 0 ? '+' : ''}{stats.monthlyProgress}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activities */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Dernières activités
          </h3>

          <div className="space-y-3">
            {sessions.slice(0, 3).map((session, index) => {
              const getActivityEmoji = (activity: string) => {
                switch (activity) {
                  case 'marche': return '🚶‍♀️';
                  case 'natation': return '🏊‍♀️';
                  case 'course': return '🏃‍♀️';
                  case 'vélo': return '🚴‍♀️';
                  case 'repos actif': return '🧘‍♀️';
                  default: return '💪';
                }
              };

              const formatDate = (date: any) => {
                const sessionDate = new Date(date);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                if (sessionDate.toDateString() === today.toDateString()) {
                  return "Aujourd'hui";
                } else if (sessionDate.toDateString() === yesterday.toDateString()) {
                  return "Hier";
                } else {
                  return sessionDate.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short'
                  });
                }
              };

              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getActivityEmoji(session.activity)}
                    </div>
                    <div>
                      <div className="font-medium capitalize text-gray-800">
                        {session.activity}
                      </div>
                      <div className="text-sm text-gray-600">
                        {session.actualDuration || session.duration} min
                        {session.calories && (
                          <span className="ml-2">• {session.calories} cal</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex text-yellow-500">
                      {[...Array(session.rating || 5)].map((_, i) => (
                        <span key={i} className="text-sm">⭐</span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(session.date)}
                    </div>
                  </div>
                </div>
            )
            
            })}
          </div>

          {sessions.length > 3 && (
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-500">
                +{sessions.length - 3} autres activités
              </p>
            </div>
          )}
        </div>
      )}

      {/* Motivation Section */}
      {(!sessions.length || sessions.length === 0) && (
        <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">🌟</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            Prêt à commencer votre parcours fitness ?
          </h3>
          <p className="text-gray-600 text-sm">
            Votre première séance vous attend. Chaque petit pas compte !
          </p>
        </div>
      )}
      </div>
    );
  };
  
  export default HomeScreen;