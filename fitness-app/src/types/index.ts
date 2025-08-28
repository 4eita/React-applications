// types/index.ts
// Types centralisés pour l'application FitPlan

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}

export interface UserProfile {
  name: string;
  weight: number;
  height: number;
  age: number;
  goal: string;
  maxDuration: number;
  preferredActivity: string;
  restDays: string[];
  city?: string;
  notifications?: boolean;
  weeklyGoal?: number;
  fitnessLevel?: 'débutant' | 'intermédiaire' | 'avancé';
}

export interface DailyPlan {
  activity: string;
  duration: number;
  intensity: string;
  reason: string;
  icon: string;
  calories?: number;
  tips?: string[];
}

export interface ActivitySession {
  id?: string;
  userId: string;
  activity: string;
  duration: number;
  actualDuration?: number;
  intensity: string;
  weather: {
    temp: number;
    condition: string;
  };
  completed: boolean;
  date: any;
  calories?: number;
  notes?: string;
  rating?: number;
}

export interface WeightEntry {
  id?: string;
  userId: string;
  weight: number;
  date: any;
  notes?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
  displayName: string | null;
}

export interface UserStats {
  totalSessions: number;
  totalCalories: number;
  streakDays: number;
  weeklyAverage: number;
  favoriteActivity: string;
  monthlyProgress: number;
  totalDuration?: number;
}

export interface LocationResult {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  city: string;
  country: string;
  address?: string;
  timestamp: number;
}

export interface PlaceData {
  name: string;
  lat: number;
  lon: number;
  formatted: string;
  categories: string[];
  distance?: number;
}