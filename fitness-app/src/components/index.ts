// components/index.ts
// Safe barrel exports with error handling

import React from "react";

// Create fallback components to prevent crashes
const FallbackComponent = ({ children, name }: { children?: any; name: string }) => (
  React.createElement('div', { 
    className: 'bg-red-50 border border-red-200 rounded-xl p-4 text-center' 
  }, `${name} component failed to load`)
);

// Core components with safe imports
let ActivityTimer: any, CitySearch: any, WeightTracker: any, 
    NearbyPlacesCard: any, LocationDetector: any, PlanCard: any;

try {
  ActivityTimer = require('./ActivityTimer').default;
} catch (error) {
  console.error('Failed to load ActivityTimer:', error);
  ActivityTimer = (props: any) => FallbackComponent({ name: 'ActivityTimer' });
}

try {
  CitySearch = require('./CitySearch').default;
} catch (error) {
  console.error('Failed to load CitySearch:', error);
  CitySearch = (props: any) => FallbackComponent({ name: 'CitySearch' });
}

try {
  WeightTracker = require('./WeightTracker').default;
} catch (error) {
  console.error('Failed to load WeightTracker:', error);
  WeightTracker = (props: any) => FallbackComponent({ name: 'WeightTracker' });
}

try {
  NearbyPlacesCard = require('./NearbyPlacesCard').default;
} catch (error) {
  console.error('Failed to load NearbyPlacesCard:', error);
  NearbyPlacesCard = (props: any) => FallbackComponent({ name: 'NearbyPlacesCard' });
}

try {
  LocationDetector = require('./LocationDetector').default;
} catch (error) {
  console.error('Failed to load LocationDetector:', error);
  LocationDetector = (props: any) => FallbackComponent({ name: 'LocationDetector' });
}

try {
  PlanCard = require('./PlanCard').default;
} catch (error) {
  console.error('Failed to load PlanCard:', error);
  PlanCard = (props: any) => FallbackComponent({ name: 'PlanCard' });
}

// Auth components with safe imports
let LoginScreen: any, RegisterScreen: any;

try {
  LoginScreen = require('./auth/LoginScreen').default;
} catch (error) {
  console.error('Failed to load LoginScreen:', error);
  LoginScreen = (props: any) => FallbackComponent({ name: 'LoginScreen' });
}

try {
  RegisterScreen = require('./auth/RegisterScreen').default;
} catch (error) {
  console.error('Failed to load RegisterScreen:', error);
  RegisterScreen = (props: any) => FallbackComponent({ name: 'RegisterScreen' });
}

// Screen components with safe imports
let HomeScreen: any, ProgressScreen: any, ProfileScreen: any;

try {
  HomeScreen = require('./screens/HomeScreen').default;
} catch (error) {
  console.error('Failed to load HomeScreen:', error);
  HomeScreen = (props: any) => FallbackComponent({ name: 'HomeScreen' });
}

try {
  ProgressScreen = require('./screens/ProgressScreen').default;
} catch (error) {
  console.error('Failed to load ProgressScreen:', error);
  ProgressScreen = (props: any) => FallbackComponent({ name: 'ProgressScreen' });
}

try {
  ProfileScreen = require('./screens/ProfileScreen').default;
} catch (error) {
  console.error('Failed to load ProfileScreen:', error);
  ProfileScreen = (props: any) => FallbackComponent({ name: 'ProfileScreen' });
}

// Export all components
export {
  ActivityTimer,
  CitySearch,
  WeightTracker,
  NearbyPlacesCard,
  LocationDetector,
  PlanCard,
  LoginScreen,
  RegisterScreen,
  HomeScreen,
  ProgressScreen,
  ProfileScreen
};

// Export fallback for any missing component
export const createFallback = (name: string) => (props: any) => FallbackComponent({ name });