// components/auth/RegisterScreen.tsx
import React, { useState } from 'react';
import { Activity, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';
import { AuthUser, UserProfile } from '../../types';

interface RegisterScreenProps {
  onRegister: (userData: { user: AuthUser; profileData: UserProfile }) => void;
  onSwitchToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    age: '',
    weight: '',
    height: '',
    goal: 'Améliorer ma forme',
    preferredActivity: 'marche',
    maxDuration: '60',
    weeklyGoal: '5',
    fitnessLevel: 'débutant' as const,
    city: 'Paris',
    restDays: [] as string[]
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'L\'adresse email est requise';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'La confirmation est requise';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.age) {
      newErrors.age = 'L\'âge est requis';
    } else {
      const age = parseInt(formData.age);
      if (age < 13 || age > 100) {
        newErrors.age = 'L\'âge doit être entre 13 et 100 ans';
      }
    }

    if (!formData.weight) {
      newErrors.weight = 'Le poids est requis';
    } else {
      const weight = parseFloat(formData.weight);
      if (weight < 30 || weight > 300) {
        newErrors.weight = 'Le poids doit être entre 30 et 300 kg';
      }
    }

    if (!formData.height) {
      newErrors.height = 'La taille est requise';
    } else {
      const height = parseInt(formData.height);
      if (height < 100 || height > 250) {
        newErrors.height = 'La taille doit être entre 100 et 250 cm';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    setErrors({});

    try {
      const user = await authService.signUpWithEmail(
        formData.email.trim(),
        formData.password,
        formData.name.trim()
      );

      const profileData: UserProfile = {
        name: formData.name.trim(),
        age: parseInt(formData.age),
        weight: parseFloat(formData.weight),
        height: parseInt(formData.height),
        goal: formData.goal,
        preferredActivity: formData.preferredActivity,
        maxDuration: parseInt(formData.maxDuration),
        weeklyGoal: parseInt(formData.weeklyGoal),
        fitnessLevel: formData.fitnessLevel,
        city: formData.city.trim(),
        restDays: formData.restDays,
        notifications: true
      };

      onRegister({ user, profileData });
    } catch (err: any) {
      setErrors({ general: err.message || 'Erreur lors de la création du compte' });
      setCurrentStep(1); // Retour à l'étape 1 en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Créer votre compte</h2>
        <p className="text-gray-600 text-sm">Étape 1/2 : Informations de connexion</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Adresse email *
        </label>
        <div className="relative">
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full p-3 pl-10 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="votre@email.com"
            autoComplete="email"
            disabled={loading}
          />
          <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mot de passe *
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`w-full p-3 pl-10 pr-10 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
              errors.password ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Au moins 6 caractères"
            autoComplete="new-password"
            disabled={loading}
          />
          <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Confirmer le mot de passe *
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            className={`w-full p-3 pl-10 pr-10 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
              errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Répétez votre mot de passe"
            autoComplete="new-password"
            disabled={loading}
          />
          <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
      </div>

      <button
        onClick={handleNext}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors"
        disabled={loading}
      >
        Suivant
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Votre profil fitness</h2>
        <p className="text-gray-600 text-sm">Étape 2/2 : Informations personnelles</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nom complet *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
            errors.name ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Votre nom"
          disabled={loading}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Âge *
          </label>
          <input
            type="number"
            value={formData.age}
            onChange={(e) => handleInputChange('age', e.target.value)}
            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
              errors.age ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="25"
            min="13"
            max="100"
            disabled={loading}
          />
          {errors.age && <p className="mt-1 text-sm text-red-600">{errors.age}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Poids (kg) *
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.weight}
            onChange={(e) => handleInputChange('weight', e.target.value)}
            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
              errors.weight ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="70"
            min="30"
            max="300"
            disabled={loading}
          />
          {errors.weight && <p className="mt-1 text-sm text-red-600">{errors.weight}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Taille (cm) *
          </label>
          <input
            type="number"
            value={formData.height}
            onChange={(e) => handleInputChange('height', e.target.value)}
            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
              errors.height ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="170"
            min="100"
            max="250"
            disabled={loading}
          />
          {errors.height && <p className="mt-1 text-sm text-red-600">{errors.height}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Objectif principal
        </label>
        <select
          value={formData.goal}
          onChange={(e) => handleInputChange('goal', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={loading}
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
            value={formData.preferredActivity}
            onChange={(e) => handleInputChange('preferredActivity', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={loading}
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
            value={formData.fitnessLevel}
            onChange={(e) => handleInputChange('fitnessLevel', e.target.value as 'débutant' | 'intermédiaire' | 'avancé')}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={loading}
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
            value={formData.maxDuration}
            onChange={(e) => handleInputChange('maxDuration', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            min="15"
            max="180"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Objectif hebdo (séances)
          </label>
          <input
            type="number"
            value={formData.weeklyGoal}
            onChange={(e) => handleInputChange('weeklyGoal', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            min="1"
            max="7"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ville
        </label>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => handleInputChange('city', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Paris"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Jours de repos préférés
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((day) => (
            <label key={day} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.restDays.includes(day)}
                onChange={(e) => {
                  const newRestDays = e.target.checked
                    ? [...formData.restDays, day]
                    : formData.restDays.filter(d => d !== day);
                  handleInputChange('restDays', newRestDays);
                }}
                className="rounded text-purple-600 focus:ring-purple-500"
                disabled={loading}
              />
              <span className="text-sm capitalize">{day}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setCurrentStep(1)}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          Retour
        </button>
        <button
          onClick={handleRegister}
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Créer mon compte'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Activity className="w-12 h-12 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">FitPlan</h1>
          </div>

          <div className="flex justify-center mb-6">
            <div className="flex space-x-2">
              <div className={`w-3 h-3 rounded-full ${currentStep >= 1 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
              <div className={`w-3 h-3 rounded-full ${currentStep >= 2 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
            </div>
          </div>

          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          {currentStep === 1 ? renderStep1() : renderStep2()}

          <div className="text-center mt-6">
            <p className="text-gray-600 text-sm">
              Déjà un compte ?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
                disabled={loading}
              >
                Se connecter
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;