// components/WeightTracker.tsx
import React, { useState } from 'react';
import { TrendingDown, Loader2, Save } from 'lucide-react';
import { firestoreService } from '../services/firestore';
import { notificationService } from '../services/notificationService';

interface WeightTrackerProps {
  userId: string;
  currentWeight: number;
  onWeightUpdate: (weight: number) => void;
}

const WeightTracker: React.FC<WeightTrackerProps> = ({
  userId,
  currentWeight,
  onWeightUpdate
}) => {
  const [newWeight, setNewWeight] = useState(currentWeight.toString());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{weight?: string; general?: string}>({});

  const validateWeight = (weight: string): boolean => {
    const weightNumber = parseFloat(weight);
    
    if (!weight.trim()) {
      setErrors(prev => ({ ...prev, weight: 'Le poids est requis' }));
      return false;
    }
    
    if (isNaN(weightNumber) || weightNumber <= 0) {
      setErrors(prev => ({ ...prev, weight: 'Veuillez entrer un poids valide' }));
      return false;
    }
    
    if (weightNumber < 30 || weightNumber > 300) {
      setErrors(prev => ({ ...prev, weight: 'Le poids doit être entre 30 et 300 kg' }));
      return false;
    }
    
    return true;
  };

  const handleWeightChange = (value: string) => {
    setNewWeight(value);
    setErrors(prev => ({ ...prev, weight: undefined }));
  };

  const handleSubmit = async () => {
    if (!validateWeight(newWeight)) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const weight = parseFloat(newWeight);
      
      // Mettre à jour le profil utilisateur
      await firestoreService.updateUserWeight(userId, weight);
      
      // Ajouter une entrée dans l'historique si des notes sont fournies ou si le poids a changé significativement
      const significantChange = Math.abs(weight - currentWeight) >= 0.1;
      if (notes.trim() || significantChange) {
        const entryNotes = notes.trim() || `Poids mis à jour: ${weight} kg`;
        await firestoreService.addWeightEntry(userId, weight, entryNotes);
      }
      
      // Mettre à jour l'état local
      onWeightUpdate(weight);
      
      // Réinitialiser les notes
      setNotes('');
      
      // Afficher une notification de succès
      await notificationService.showInAppNotification(
        'Poids enregistré avec succès !',
        `Nouveau poids: ${weight} kg`,
        'success'
      );
      
      // Calculer et afficher la différence si significative
      const difference = weight - currentWeight;
      if (Math.abs(difference) >= 0.1) {
        const changeText = difference > 0 ? `+${difference.toFixed(1)}` : difference.toFixed(1);
        setTimeout(() => {
          notificationService.showInAppNotification(
            'Évolution',
            `${changeText} kg depuis la dernière pesée`,
            difference < 0 ? 'success' : 'info'
          );
        }, 1000);
      }
      
    } catch (error: any) {
      console.error('Erreur enregistrement poids:', error);
      setErrors({ general: 'Erreur lors de l\'enregistrement. Veuillez réessayer.' });
      
      await notificationService.showInAppNotification(
        'Erreur d\'enregistrement',
        'Veuillez réessayer dans quelques instants',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWeightChangeIcon = () => {
    const current = parseFloat(newWeight);
    const difference = current - currentWeight;
    
    if (Math.abs(difference) < 0.1) return '➖';
    return difference > 0 ? '📈' : '📉';
  };

  const getWeightChangeColor = () => {
    const current = parseFloat(newWeight);
    const difference = current - currentWeight;
    
    if (Math.abs(difference) < 0.1) return 'text-gray-500';
    return difference > 0 ? 'text-orange-600' : 'text-green-600';
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <TrendingDown className="w-5 h-5 mr-2 text-blue-600" />
        Suivi du poids
      </h3>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{errors.general}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nouveau poids (kg)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="30"
              max="300"
              value={newWeight}
              onChange={(e) => handleWeightChange(e.target.value)}
              className={`w-full p-3 pr-12 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                errors.weight ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
              }`}
              placeholder="ex: 68.5"
              disabled={isSubmitting}
            />
            {newWeight && !errors.weight && (
              <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-lg ${getWeightChangeColor()}`}>
                {getWeightChangeIcon()}
              </div>
            )}
          </div>
          {errors.weight && (
            <p className="mt-1 text-sm text-red-600">{errors.weight}</p>
          )}
          {newWeight && !errors.weight && parseFloat(newWeight) !== currentWeight && (
            <p className={`mt-1 text-sm ${getWeightChangeColor()}`}>
              Différence: {parseFloat(newWeight) > currentWeight ? '+' : ''}
              {(parseFloat(newWeight) - currentWeight).toFixed(1)} kg
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Comment vous sentez-vous aujourd'hui ? Contexte de la pesée..."
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all duration-200"
            rows={3}
            disabled={isSubmitting}
            maxLength={200}
          />
          <div className="mt-1 text-xs text-gray-500 text-right">
            {notes.length}/200 caractères
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">Poids actuel:</span>
            <span className="font-medium text-blue-800">{currentWeight} kg</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !newWeight || !!errors.weight}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold py-3 rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Enregistrement...
            </div>
          ) : (
            <div className="flex items-center">
              <Save className="w-4 h-4 mr-2" />
              Enregistrer le poids
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default WeightTracker;