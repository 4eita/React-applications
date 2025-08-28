class PlanGenerator {
  generateDailyPlan(weather: any, user: any): any {
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' });
    
    // Check rest days
    if (user.restDays.includes(today)) {
      return {
        activity: 'repos',
        duration: 0,
        intensity: 'repos',
        reason: 'Jour de repos programmé',
        icon: '😴',
        calories: 0,
        tips: ['Profitez de votre jour de repos', 'Hydratez-vous bien', 'Planifiez votre prochaine séance']
      };
    }

    // Weather-based activity selection
    let activity = user.preferredActivity;
    let duration = Math.min(user.maxDuration, 45);
    let intensity = 'modéré';
    let reason = `Conditions météo normales (${weather.temp}°C)`;
    
    if (weather.condition === 'rainy') {
      activity = 'natation';
      reason = `Temps pluvieux (${weather.temp}°C) - Activité en intérieur recommandée`;
    } else if (weather.temp > 30) {
      intensity = 'léger';
      duration = Math.min(duration, 30);
      reason = `Forte chaleur (${weather.temp}°C) - Réduisez l'intensité`;
    } else if (weather.temp < 5) {
      intensity = 'modéré';
      reason = `Temps froid (${weather.temp}°C) - Échauffez-vous bien`;
    }

    // Activity-specific settings
    const activitySettings: Record<string, any> = {
      marche: { icon: '🚶‍♀️', calorieRate: 4, tips: ['Maintenez un rythme régulier', 'Portez des chaussures confortables'] },
      natation: { icon: '🏊‍♀️', calorieRate: 7, tips: ['Échauffez-vous avant de nager', 'Variez les nages'] },
      course: { icon: '🏃‍♀️', calorieRate: 8, tips: ['Commencez doucement', 'Respectez votre rythme'] },
      vélo: { icon: '🚴‍♀️', calorieRate: 6, tips: ['Vérifiez vos freins', 'Portez un casque'] },
      'repos actif': { icon: '🧘‍♀️', calorieRate: 2, tips: ['Concentrez-vous sur les étirements', 'Respirez profondément'] }
    };

    const settings = activitySettings[activity] || activitySettings.marche;
    
    const calories = Math.round(settings.calorieRate * duration * (user.weight / 70));

    return {
      activity,
      duration,
      intensity,
      reason,
      icon: settings.icon,
      calories,
      tips: settings.tips
    };
  }
}

export const planGenerator = new PlanGenerator();
