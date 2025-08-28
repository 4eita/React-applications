// components/PlanCard.tsx
import React, { useState } from 'react';
import { Play, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import ActivityTimer from './ActivityTimer';
import { DailyPlan } from '../types';

interface PlanCardProps {
  plan: DailyPlan;
  onStartActivity: (plan: DailyPlan, actualDuration?: number, rating?: number, notes?: string) => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, onStartActivity }) => {
  const [showTimer, setShowTimer] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const getActivityColor = (activity: string): string => {
    const colors = {
      marche: 'from-green-400 to-emerald-500',
      natation: 'from-blue-400 to-cyan-500',
      course: 'from-red-400 to-pink-500',
      vélo: 'from-yellow-400 to-orange-500',
      repos: 'from-purple-400 to-pink-500',
      'repos actif': 'from-orange-400 to-red-500',
    };
    return colors[activity as keyof typeof colors] || 'from-gray-400 to-gray-500';
  };

  const getIntensityColor = (intensity: string): string => {
    const colors = {
      'très léger': 'bg-green-100 text-green-700',
      léger: 'bg-blue-100 text-blue-700',
      modéré: 'bg-yellow-100 text-yellow-700',
      intense: 'bg-red-100 text-red-700',
      repos: 'bg-purple-100 text-purple-700',
    };
    return colors[intensity as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const handleTimerComplete = (actualDuration: number, rating: number, notes: string) => {
    onStartActivity(plan, Math.floor(actualDuration / 60), rating, notes);
    setShowTimer(false);
  };

  const handleQuickComplete = () => {
    onStartActivity(plan, plan.duration, 5, 'Séance marquée comme terminée');
  };

  if (showTimer) {
    return (
      <ActivityTimer
        plannedDuration={plan.duration}
        activity={plan.activity}
        onComplete={handleTimerComplete}
      />
    );
  }

  return (
    <div className={`bg-gradient-to-r ${getActivityColor(plan.activity)} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-3xl" role="img" aria-label={`Icône ${plan.activity}`}>
              {plan.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold capitalize">{plan.activity}</h3>
              <div className="flex items-center space-x-3 text-sm opacity-90">
                <span>{plan.duration} minutes</span>
                {plan.calories && (
                  <span className="flex items-center">
                    <span className="mr-1">🔥</span>
                    ~{plan.calories} cal
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm opacity-90 mb-1">Intensité</div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getIntensityColor(plan.intensity)} bg-white/20 text-white`}>
              {plan.intensity}
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-4">
          <p className="text-sm leading-relaxed">{plan.reason}</p>
        </div>

        {/* Tips Section */}
        {plan.tips && plan.tips.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowTips(!showTips)}
              className="text-sm underline opacity-90 hover:opacity-100 transition-opacity flex items-center"
            >
              <span>{showTips ? 'Masquer les conseils' : 'Voir les conseils'}</span>
              {showTips ? (
                <ChevronUp className="w-4 h-4 ml-1" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-1" />
              )}
            </button>
            
            {showTips && (
              <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-xl p-3 opacity-0 animate-pulse">
                <ul className="text-sm space-y-2">
                  {plan.tips.map((tip, index) => (
                    <li key={index} className="flex items-start opacity-100">
                      <span className="mr-2 flex-shrink-0">💡</span>
                      <span className="leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => setShowTimer(true)}
            className="flex-1 bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-200 rounded-xl py-3 font-semibold flex items-center justify-center space-x-2 transform hover:scale-105"
            disabled={plan.activity === 'repos'}
          >
            <Play className="w-5 h-5" />
            <span>
              {plan.activity === 'repos' ? 'Jour de repos' : 'Commencer avec timer'}
            </span>
          </button>
          
          {plan.activity !== 'repos' && (
            <button
              onClick={handleQuickComplete}
              className="px-4 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-200 rounded-xl group"
              title="Marquer comme terminé sans timer"
            >
              <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>

        {/* Rest Day Message */}
        {plan.activity === 'repos' && (
          <div className="mt-4 text-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl py-2 px-4">
              <p className="text-sm font-medium">
                Profitez de votre jour de repos ! 😴
              </p>
            </div>
          </div>
        )}

        {/* Motivation Quote for Active Days */}
        {plan.activity !== 'repos' && (
          <div className="mt-4 text-center">
            <p className="text-xs opacity-75 italic">
              "Chaque minute d'effort compte pour votre bien-être"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanCard;