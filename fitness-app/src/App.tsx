// App.tsx
import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { 
  Activity, Home, BarChart3, User, Bell, UserCheck, Loader2 
} from 'lucide-react';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md mx-auto text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Oops! Une erreur est survenue</h1>
            <p className="text-gray-600 mb-6">L'application a rencontré une erreur inattendue.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Recharger l'application
            </button>
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">Détails techniques</summary>
              <pre className="text-xs text-red-600 mt-2 overflow-auto">
                {this.state.error?.toString()}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Import components with error handling
let LoginScreen: any, RegisterScreen: any, HomeScreen: any, ProgressScreen: any, ProfileScreen: any;

try {
  const components = require('./components');
  LoginScreen = components.LoginScreen;
  RegisterScreen = components.RegisterScreen;
  HomeScreen = components.HomeScreen;
  ProgressScreen = components.ProgressScreen;
  ProfileScreen = components.ProfileScreen;
} catch (error) {
  console.error('Failed to load components:', error);
  // Fallback components
  LoginScreen = () => <div>Login component failed to load</div>;
  RegisterScreen = () => <div>Register component failed to load</div>;
  HomeScreen = () => <div>Home component failed to load</div>;
  ProgressScreen = () => <div>Progress component failed to load</div>;
  ProfileScreen = () => <div>Profile component failed to load</div>;
}

// Import services with error handling
let weatherService: any, firestoreService: any, authService: any, locationService: any, 
    notificationService: any, storageService: any;

try {
  weatherService = require('./services/weatherAPI').weatherService;
  firestoreService = require('./services/firestore').firestoreService;
  authService = require('./services/authService').authService;
  locationService = require('./services/locationService').locationService;
  notificationService = require('./services/notificationService').notificationService;
  storageService = require('./services/storageService').storageService;
} catch (error) {
  console.error('Failed to load services:', error);
  // Create mock services to prevent crashes
  const mockService = {
    getCurrentUser: () => null,
    onAuthStateChange: () => () => {},
    signInWithEmail: () => Promise.reject('Service not available'),
    signUpWithEmail: () => Promise.reject('Service not available'),
    signOut: () => Promise.resolve(),
    getCurrentWeather: () => Promise.resolve({ temp: 20, condition: 'sunny', humidity: 60, windSpeed: 10 }),
    getUserProfile: () => Promise.resolve(null),
    getUserSessions: () => Promise.resolve([]),
    getWeightHistory: () => Promise.resolve([]),
    getUserStats: () => Promise.resolve(null),
    saveUserProfile: () => Promise.resolve(),
    addActivitySession: () => Promise.resolve(),
    updateUserWeight: () => Promise.resolve(),
    addWeightEntry: () => Promise.resolve(),
    getQuickCity: () => Promise.resolve('Paris'),
    getCurrentPosition: () => Promise.resolve(null),
    getNearbyPlaces: () => Promise.resolve([]),
    showInAppNotification: () => Promise.resolve(),
    requestPermission: () => Promise.resolve(),
    scheduleDailyReminder: () => {},
    getCachedUserProfile: () => null,
    getCachedSessions: () => [],
    getCachedStats: () => null,
    getCachedWeatherData: () => null,
    cacheUserProfile: () => {},
    cacheSessions: () => {},
    cacheStats: () => {},
    cacheWeatherData: () => {},
    setupConnectivityListener: () => {},
    syncPendingData: () => Promise.resolve(0),
    enableAutoBackup: () => {},
    addToSyncQueue: () => {},
    clear: () => {},
    exportUserData: () => null,
    getStorageInfo: () => ({ appDataSize: '0 KB' })
  };
  
  weatherService = mockService;
  firestoreService = mockService;
  authService = mockService;
  locationService = mockService;
  notificationService = mockService;
  storageService = mockService;
}

// Import types
import {
  WeatherData,
  UserProfile,
  ActivitySession,
  WeightEntry,
  AuthUser,
  UserStats,
  DailyPlan,
  LocationResult
} from './types';

const FitnessApp: React.FC = () => {
  // Auth state
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');

  // App state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [userLocation, setUserLocation] = useState<LocationResult | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize app
  useEffect(() => {
    initializeApp();
    
    // Setup connectivity listener
    storageService.setupConnectivityListener((online: boolean | ((prevState: boolean) => boolean)) => {
      setIsOnline(online);
      if (online && authUser) {
        storageService.syncPendingData(firestoreService).then((synced: number) => {
          if (synced > 0) {
            notificationService.showInAppNotification(
              'Données synchronisées',
              `${synced} éléments synchronisés`,
              'success'
            );
          }
        });
      }
    });

    return () => {
      if (authUser) {
        storageService.enableAutoBackup(authUser.uid);
      }
    };
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user: AuthUser | null) => {
      if (user) {
        setAuthUser(user);
        loadUserData(user.uid);
      } else {
        setAuthUser(null);
        setUser(null);
        setSessions([]);
        setStats(null);
        setWeightHistory([]);
      }
    });
    return unsubscribe;
  }, []);

  // Location detection
  useEffect(() => {
    detectUserLocation();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setAuthUser(currentUser);
        await loadUserData(currentUser.uid);
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setError('Erreur lors de l\'initialisation');
    } finally {
      setLoading(false);
    }
  };

  const detectUserLocation = async () => {
    try {
      const location = await locationService.getQuickCity();
      if (location) {
        const locationData = await locationService.getCurrentPosition(5000);
        setUserLocation(locationData);
      }
    } catch (error) {
      console.log('Géolocalisation non disponible ou refusée');
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      setLoading(true);
      
      let userData = storageService.getCachedUserProfile(userId);
      let userSessions = storageService.getCachedSessions(userId);
      let userStats = storageService.getCachedStats(userId);

      if (isOnline) {
        const freshData = await Promise.all([
          firestoreService.getUserProfile(userId),
          firestoreService.getUserSessions(userId, 20),
          firestoreService.getWeightHistory(userId, 10),
          firestoreService.getUserStats(userId)
        ]);

        userData = freshData[0] || userData;
        userSessions = freshData[1] || userSessions || [];
        const userWeights = freshData[2] || [];
        userStats = freshData[3] || userStats;

        if (userData) storageService.cacheUserProfile(userId, userData);
        if (userSessions) storageService.cacheSessions(userId, userSessions);
        if (userStats) storageService.cacheStats(userId, userStats);
        
        setWeightHistory(userWeights);
      }

      if (!userData) {
        userData = {
          name: 'Utilisateur',
          weight: 70,
          height: 170,
          age: 30,
          goal: 'Améliorer ma forme',
          maxDuration: 60,
          preferredActivity: 'marche',
          restDays: ['dimanche'],
          city: 'Paris',
          notifications: true,
          weeklyGoal: 5,
          fitnessLevel: 'débutant'
        };
        
        if (isOnline) {
          await firestoreService.saveUserProfile(userId, userData);
        }
        storageService.cacheUserProfile(userId, userData);
      }
      
      setUser(userData);
      setSessions(userSessions || []);
      setStats(userStats);
      
      // Load weather
      const cachedWeather = storageService.getCachedWeatherData(userData.city || 'Paris');
      if (cachedWeather) {
        setWeather(cachedWeather);
      }
      
      if (isOnline) {
        try {
          const weatherData = await weatherService.getCurrentWeather(userData.city || 'Paris');
          setWeather(weatherData);
          storageService.cacheWeatherData(userData.city || 'Paris', weatherData);
        } catch (weatherError) {
          console.warn('Erreur météo, utilisation du cache');
        }
      }
      
    } catch (err) {
      console.error('Erreur chargement données utilisateur:', err);
      
      const cachedProfile = storageService.getCachedUserProfile(userId);
      const cachedSessions = storageService.getCachedSessions(userId);
      const cachedStats = storageService.getCachedStats(userId);
      
      if (cachedProfile) setUser(cachedProfile);
      if (cachedSessions) setSessions(cachedSessions);
      if (cachedStats) setStats(cachedStats);
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (user: AuthUser) => {
    setAuthUser(user);
    await loadUserData(user.uid);
    
    notificationService.showInAppNotification(
      'Connexion réussie !',
      `Bienvenue ${user.email}`,
      'success'
    );
  };

  const handleRegister = async (userData: { user: AuthUser; profileData: UserProfile }) => {
    try {
      setAuthUser(userData.user);
      setUser(userData.profileData);
      
      if (isOnline) {
        await firestoreService.saveUserProfile(userData.user.uid, {
          ...userData.profileData,
          notifications: userData.profileData.notifications !== undefined ? userData.profileData.notifications : true,
        });
      } else {
        storageService.addToSyncQueue('create', 'users', {
          userId: userData.user.uid,
          profile: userData.profileData
        });
      }
      
      storageService.cacheUserProfile(userData.user.uid, userData.profileData);
      
      try {
        const weatherData = await weatherService.getCurrentWeather(userData.profileData.city || 'Paris');
        setWeather(weatherData);
        storageService.cacheWeatherData(userData.profileData.city || 'Paris', weatherData);
      } catch (weatherError) {
        setWeather({
          temp: 20,
          condition: 'sunny',
          humidity: 60,
          windSpeed: 10
        });
      }
      
      setStats({
        totalSessions: 0,
        totalCalories: 0,
        streakDays: 0,
        weeklyAverage: 0,
        favoriteActivity: 'marche',
        monthlyProgress: 0
      });
      
      notificationService.showInAppNotification(
        'Compte créé avec succès !',
        'Bienvenue dans FitPlan !',
        'success'
      );
      
      if (userData.profileData.notifications) {
        notificationService.scheduleDailyReminder(userData.user.uid, { hour: 18, minute: 0 });
      }
    } catch (error) {
      console.error('Registration error:', error);
      notificationService.showInAppNotification(
        'Erreur de création',
        'Veuillez réessayer',
        'error'
      );
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setAuthUser(null);
      setUser(null);
      setSessions([]);
      setStats(null);
      setWeather(null);
      setWeightHistory([]);
      storageService.clear();
      
      notificationService.showInAppNotification(
        'Déconnexion réussie',
        'À bientôt !',
        'info'
      );
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleUserUpdate = async (updatedUser: UserProfile) => {
    if (!authUser) return;

    try {
      setUser(updatedUser);
      storageService.cacheUserProfile(authUser.uid, updatedUser);
      
      if (isOnline) {
        await firestoreService.saveUserProfile(authUser.uid, {
          ...updatedUser,
          notifications: updatedUser.notifications !== undefined ? updatedUser.notifications : true,
        });
      } else {
        storageService.addToSyncQueue('update', 'users', {
          userId: authUser.uid,
          profile: updatedUser
        });
      }
      
      if (updatedUser.city !== user?.city && updatedUser.city) {
        try {
          const newWeather = await weatherService.getCurrentWeather(updatedUser.city);
          setWeather(newWeather);
          storageService.cacheWeatherData(updatedUser.city, newWeather);
        } catch (error) {
          console.warn('Error reloading weather');
        }
      }
    } catch (err) {
      console.error('Error updating user:', err);
      notificationService.showInAppNotification(
        'Erreur de sauvegarde',
        'Vos modifications seront synchronisées plus tard',
        'warning'
      );
    }
  };

  const handleCityChange = async (newCity: string) => {
    if (!user || !authUser) return;

    try {
      const updatedUser = { ...user, city: newCity };
      await handleUserUpdate(updatedUser);
      
      const newWeather = await weatherService.getCurrentWeather(newCity);
      setWeather(newWeather);
      storageService.cacheWeatherData(newCity, newWeather);
      
    } catch (error) {
      console.error('Erreur changement de ville:', error);
    }
  };

  const handleActivityComplete = async (plan: DailyPlan, actualDuration?: number, rating?: number, notes?: string) => {
    if (!authUser || !weather) return;

    try {
      const session: ActivitySession = {
        userId: authUser.uid,
        activity: plan.activity,
        duration: plan.duration,
        actualDuration: actualDuration || plan.duration,
        intensity: plan.intensity,
        weather: {
          temp: weather.temp,
          condition: weather.condition
        },
        completed: true,
        date: new Date(),
        calories: plan.calories,
        notes: notes || '',
        rating: rating || 5
      };

      setSessions(prev => [session, ...prev]);
      
      if (isOnline) {
        await firestoreService.addActivitySession({ ...session, id: session.id ?? '' });
      } else {
        storageService.addToSyncQueue('create', 'sessions', session);
      }
      
      await loadUserData(authUser.uid);
      
      notificationService.showInAppNotification(
        'Séance terminée !',
        `Bravo pour cette séance de ${plan.activity} !`,
        'success'
      );

      if (stats && sessions.length + 1 >= (user?.weeklyGoal || 5)) {
        await notificationService.notifyGoalAchieved('weekly', sessions.length + 1);
      }
    } catch (error) {
      console.error('Error completing activity:', error);
      notificationService.showInAppNotification(
        'Erreur d\'enregistrement',
        'La séance sera synchronisée plus tard',
        'warning'
      );
    }
  };

  const handleWeightUpdate = async (weight: number) => {
    if (user && authUser) {
      setUser({ ...user, weight });
      try {
        const history = await firestoreService.getWeightHistory(authUser.uid, 10);
        setWeightHistory(history);
      } catch (error) {
        console.error('Error refreshing weight history:', error);
      }
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            {authUser ? 'Chargement de votre espace fitness...' : 'Chargement...'}
          </p>
          {authUser && (
            <>
              <p className="text-sm text-gray-500">Connecté: {authUser.email}</p>
              {!isOnline && (
                <p className="text-sm text-orange-600">Mode offline - données locales utilisées</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Auth screens
  if (!authUser) {
    return authScreen === 'login' ? (
      <LoginScreen 
        onLogin={handleLogin}
        onSwitchToRegister={() => setAuthScreen('register')}
      />
    ) : (
      <RegisterScreen 
        onRegister={handleRegister}
        onSwitchToLogin={() => setAuthScreen('login')}
      />
    );
  }

  // Error screen
  if (!user || !weather) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <p className="text-red-600 mb-4">
            {error || 'Erreur de chargement des données'}
          </p>
          <button 
            onClick={initializeApp}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors mb-4"
          >
            Réessayer
          </button>
          <p className="text-xs text-gray-500">
            En cas de problème persistant, vérifiez votre connexion internet
          </p>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen
            user={user}
            weather={weather}
            sessions={sessions}
            stats={stats}
            isOnline={isOnline}
            userLocation={userLocation}
            onActivityComplete={handleActivityComplete}
            onCityChange={handleCityChange}
          />
        );
      
      case 'progress':
        return (
          <ProgressScreen
            sessions={sessions}
            stats={stats}
            user={user}
            userId={authUser.uid}
            userLocation={userLocation}
            weightHistory={weightHistory}
            onWeightUpdate={handleWeightUpdate}
            onLocationDetected={setUserLocation}
            onCityDetected={(city: string | undefined) => {
              if (user && city !== user.city) {
                handleUserUpdate({ ...user, city });
              }
            }}
            onUserUpdate={handleUserUpdate}
          />
        );
      
      case 'profile':
        return (
          <ProfileScreen
            user={user}
            authUser={authUser}
            isOnline={isOnline}
            onUserUpdate={handleUserUpdate}
            onLogout={handleLogout}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        {/* Header */}
        <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="w-8 h-8 text-purple-600" />
            <div>
              <span className="text-xl font-bold text-gray-800">FitPlan</span>
              <div className="text-xs text-gray-500">Votre coach personnel</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-xs text-gray-500 text-right">
              <div className="flex items-center space-x-1">
                <UserCheck className="w-3 h-3" />
                <span>{authUser.email}</span>
              </div>
              {stats && (
                <div className="text-purple-600 font-medium">
                  {stats.streakDays} jours de suite
                </div>
              )}
            </div>
            
            <button className="relative p-2 text-gray-600 hover:text-purple-600 transition-colors">
              <Bell className="w-6 h-6" />
              {user?.notifications && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              )}
            </button>
            
            {!isOnline && (
              <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                Offline
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="px-6 py-6 pb-24">
          {renderScreen()}
        </div>
        
        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 shadow-lg">
          <div className="flex justify-around">
            <button
              onClick={() => setCurrentScreen('home')}
              className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
                currentScreen === 'home' ? 'text-purple-600 bg-purple-50 scale-105' : 'text-gray-600 hover:text-purple-500'
              }`}
            >
              <Home className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Accueil</span>
              {currentScreen === 'home' && (
                <div className="w-1 h-1 bg-purple-600 rounded-full mt-1"></div>
              )}
            </button>
            
            <button
              onClick={() => setCurrentScreen('progress')}
              className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
                currentScreen === 'progress' ? 'text-purple-600 bg-purple-50 scale-105' : 'text-gray-600 hover:text-purple-500'
              }`}
            >
              <BarChart3 className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Progrès</span>
              {currentScreen === 'progress' && (
                <div className="w-1 h-1 bg-purple-600 rounded-full mt-1"></div>
              )}
            </button>
            
            <button
              onClick={() => setCurrentScreen('profile')}
              className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
                currentScreen === 'profile' ? 'text-purple-600 bg-purple-50 scale-105' : 'text-gray-600 hover:text-purple-500'
              }`}
            >
              <User className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Profil</span>
              {currentScreen === 'profile' && (
                <div className="w-1 h-1 bg-purple-600 rounded-full mt-1"></div>
              )}
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default FitnessApp;