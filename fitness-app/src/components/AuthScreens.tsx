import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  UserPlus,
  LogIn,
  Loader2,
  CheckCircle,
  AlertCircle,
  MapPin,
  Target,
  Activity,
  Calendar,
  Save,
  X
} from 'lucide-react';

// Types pour l'authentification
interface AuthScreenProps {
  onLogin: (user: any) => void;
  onSignup: (user: any) => void;
  onSkip: () => void;
  authService: any;
  locationService: any;
}

// Écran de choix d'authentification
const AuthChoiceScreen = ({ onLogin, onSignup, onSkip }: {
  onLogin: () => void;
  onSignup: () => void;
  onSkip: () => void;
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Bienvenue sur FitPlan</h1>
          <p className="text-gray-600">Votre coach personnel pour rester en forme</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={onSignup}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors flex items-center justify-center space-x-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>Créer un compte</span>
          </button>

          <button
            onClick={onLogin}
            className="w-full bg-white border-2 border-purple-500 text-purple-500 font-semibold py-3 rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center space-x-2"
          >
            <LogIn className="w-5 h-5" />
            <span>Se connecter</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ou</span>
            </div>
          </div>

          <button
            onClick={onSkip}
            className="w-full text-gray-500 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Continuer en mode invité
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>En créant un compte, vos données seront sauvegardées et synchronisées sur tous vos appareils.</p>
        </div>
      </div>
    </div>
  );
};

// Écran de connexion
const LoginScreen = ({ onBack, onLogin, onForgotPassword, authService }: {
  onBack: () => void;
  onLogin: (user: any) => void;
  onForgotPassword: () => void;
  authService: any;
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await authService.signInWithEmail(email.trim(), password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-3"
          >
            <X className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Connexion</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="votre@email.com"
                required
              />
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Votre mot de passe"
                required
              />
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Mot de passe oublié ?
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Se connecter</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// Écran de création de compte
const SignupScreen = ({ onBack, onSignup, authService }: {
  onBack: () => void;
  onSignup: (user: any) => void;
  authService: any;
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('Le nom est requis');
      return false;
    }
    if (!formData.email.trim()) {
      setError('L\'email est requis');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Email invalide');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSignup = async (profileData: any) => {
    setLoading(true);
    setError('');

    try {
      const user = await authService.signUpWithEmail(
        formData.email.trim(),
        formData.password,
        formData.name.trim()
      );
      
      // Passer les données de profil avec l'utilisateur
      onSignup({ ...user, profileData });
    } catch (err: any) {
      setError(err.message || 'Erreur de création de compte');
      setStep(1); // Retourner à l'étape 1 en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <OnboardingScreen
        userName={formData.name}
        onComplete={handleSignup}
        onBack={() => setStep(1)}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-3"
          >
            <X className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Créer un compte</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom complet
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Votre nom"
                required
              />
              <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse email
            </label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="votre@email.com"
                required
              />
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Au moins 6 caractères"
                required
                minLength={6}
              />
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Répétez votre mot de passe"
                required
              />
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors flex items-center justify-center space-x-2"
          >
            <span>Suivant</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.</p>
        </div>
      </div>
    </div>
  );
};

// Écran d'onboarding pour les informations fitness
const OnboardingScreen = ({ userName, onComplete, onBack, loading, error }: {
  userName: string;
  onComplete: (profileData: any) => void;
  onBack: () => void;
  loading: boolean;
  error: string;
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] = useState({
    weight: '',
    height: '',
    age: '',
    goal: 'Améliorer ma forme',
    fitnessLevel: 'débutant',
    preferredActivity: 'marche',
    maxDuration: 60,
    weeklyGoal: 5,
    restDays: ['dimanche'],
    city: '',
    notifications: true
  });

  const handleInputChange = (field: string, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleRestDayToggle = (day: string) => {
    setProfileData(prev => ({
      ...prev,
      restDays: prev.restDays.includes(day)
        ? prev.restDays.filter(d => d !== day)
        : [...prev.restDays, day]
    }));
  };

  const handleComplete = () => {
    const completeProfile = {
      name: userName,
      weight: parseFloat(profileData.weight) || 70,
      height: parseInt(profileData.height) || 170,
      age: parseInt(profileData.age) || 30,
      goal: profileData.goal,
      fitnessLevel: profileData.fitnessLevel,
      preferredActivity: profileData.preferredActivity,
      maxDuration: profileData.maxDuration,
      weeklyGoal: profileData.weeklyGoal,
      restDays: profileData.restDays,
      city: profileData.city || 'Paris',
      notifications: profileData.notifications
    };
    
    onComplete(completeProfile);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Parlez-nous de vous, {userName} !
              </h2>
              <p className="text-gray-600">Ces informations nous aideront à personnaliser votre programme</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poids (kg)
                </label>
                <input
                  type="number"
                  value={profileData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="70"
                  min="30"
                  max="200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taille (cm)
                </label>
                <input
                  type="number"
                  value={profileData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="170"
                  min="100"
                  max="250"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Âge
                </label>
                <input
                  type="number"
                  value={profileData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="30"
                  min="10"
                  max="100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre objectif principal
              </label>
              <select
                value={profileData.goal}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre niveau de fitness
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['débutant', 'intermédiaire', 'avancé'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleInputChange('fitnessLevel', level)}
                    className={`p-3 rounded-xl border-2 font-medium transition-colors capitalize ${
                      profileData.fitnessLevel === level
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Vos préférences d'activité</h2>
              <p className="text-gray-600">Personnalisez votre programme d'entraînement</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activité préférée
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'marche', label: 'Marche', icon: '🚶‍♀️' },
                  { value: 'natation', label: 'Natation', icon: '🏊‍♀️' },
                  { value: 'course', label: 'Course', icon: '🏃‍♀️' },
                  { value: 'vélo', label: 'Vélo', icon: '🚴‍♀️' }
                ].map((activity) => (
                  <button
                    key={activity.value}
                    type="button"
                    onClick={() => handleInputChange('preferredActivity', activity.value)}
                    className={`p-4 rounded-xl border-2 font-medium transition-colors ${
                      profileData.preferredActivity === activity.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{activity.icon}</div>
                    <div>{activity.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée max/jour (min)
                </label>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="15"
                  value={profileData.maxDuration}
                  onChange={(e) => handleInputChange('maxDuration', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">
                  {profileData.maxDuration} minutes
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objectif hebdomadaire
                </label>
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={profileData.weeklyGoal}
                  onChange={(e) => handleInputChange('weeklyGoal', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600 mt-1">
                  {profileData.weeklyGoal} séances/semaine
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Jours de repos préférés
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((day) => (
                  <label key={day} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileData.restDays.includes(day)}
                      onChange={() => handleRestDayToggle(day)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm capitalize">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Dernières préférences</h2>
              <p className="text-gray-600">Presque terminé !</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre ville (pour la météo)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={profileData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Paris"
                />
                <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Laissez vide pour détecter automatiquement</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <div className="font-medium text-gray-800">Notifications de rappel</div>
                  <div className="text-sm text-gray-600">Recevez des rappels pour vos séances</div>
                </div>
                <input
                  type="checkbox"
                  checked={profileData.notifications}
                  onChange={(e) => handleInputChange('notifications', e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-green-700 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Tout est prêt !</span>
              </div>
              <p className="text-sm text-green-600">
                Votre profil sera créé et vos données seront synchronisées sur tous vos appareils.
              </p>
            </div>
          </div>
        );
    }
  };

  const canContinue = () => {
    if (currentStep === 1) {
      return profileData.weight && profileData.height && profileData.age;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={currentStep === 1 ? onBack : () => setCurrentStep(currentStep - 1)}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex space-x-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full ${
                  step <= currentStep ? 'bg-purple-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {renderStep()}

        <div className="mt-8 flex space-x-3">
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canContinue()}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <span>Suivant</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Créer mon compte</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Export des composants
export {
  AuthChoiceScreen,
  LoginScreen,
  SignupScreen,
  OnboardingScreen
};