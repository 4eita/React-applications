// components/ActivityTimer.tsx
import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Loader2 } from 'lucide-react';

interface ActivityTimerProps {
  plannedDuration: number;
  onComplete: (actualDuration: number, rating: number, notes: string) => void;
  activity: string;
}

const ActivityTimer: React.FC<ActivityTimerProps> = ({ 
  plannedDuration, 
  onComplete, 
  activity 
}) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = () => {
    onComplete(timeElapsed, rating, notes);
    setShowComplete(false);
    // Reset timer state
    setTimeElapsed(0);
    setIsRunning(false);
    setIsPaused(false);
    setRating(3);
    setNotes('');
  };

  if (showComplete) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Séance terminée !</h3>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-2">Durée réelle: {formatTime(timeElapsed)}</p>
          <p className="text-gray-600">Comment s'est passée votre séance ?</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Note (1-5 étoiles)
          </label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-2xl transition-colors ${
                  star <= rating ? 'text-yellow-500' : 'text-gray-300'
                } hover:text-yellow-400`}
                aria-label={`Note ${star} étoiles`}
              >
                ⭐
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Comment vous êtes-vous senti ?"
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleComplete}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center justify-center"
          >
            Sauvegarder la séance
          </button>
          <button
            onClick={() => setShowComplete(false)}
            className="px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold mb-2">
          {activity.charAt(0).toUpperCase() + activity.slice(1)} en cours
        </h3>
        <div className="text-4xl font-mono font-bold mb-2">
          {formatTime(timeElapsed)}
        </div>
        <div className="text-sm opacity-90">
          Objectif: {plannedDuration} min
        </div>
        {timeElapsed > 0 && (
          <div className="text-xs opacity-75 mt-1">
            {((timeElapsed / (plannedDuration * 60)) * 100).toFixed(0)}% accompli
          </div>
        )}
      </div>

      <div className="flex justify-center space-x-4">
        {!isRunning ? (
          <button
            onClick={() => { setIsRunning(true); setIsPaused(false); }}
            className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105"
          >
            <Play className="w-5 h-5" />
            <span>Commencer</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl transition-all duration-200"
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              <span>{isPaused ? 'Reprendre' : 'Pause'}</span>
            </button>
            <button
              onClick={() => { setIsRunning(false); setShowComplete(true); }}
              className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl transition-all duration-200"
            >
              <Square className="w-5 h-5" />
              <span>Terminer</span>
            </button>
          </>
        )}
      </div>

      <div className="mt-4 text-center">
        {timeElapsed >= plannedDuration * 60 && (
          <div className="bg-white/20 rounded-xl p-2 animate-pulse">
            <span className="text-sm font-medium">🎉 Objectif atteint !</span>
          </div>
        )}
        {isPaused && (
          <div className="text-sm opacity-75 mt-2">
            ⏸️ En pause
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityTimer;