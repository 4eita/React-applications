// services/notificationService.ts
// Service pour gérer les notifications et rappels - VERSION CORRIGÉE

interface NotificationSchedule {
  id: string;
  userId: string;
  type: 'daily_reminder' | 'weight_check' | 'streak_celebration' | 'goal_achieved';
  title: string;
  message: string;
  scheduledTime: Date;
  isActive: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
}

class NotificationService {
  private notifications: NotificationSchedule[] = [];
  private permission: NotificationPermission = 'default';
  private isClient: boolean;

  constructor() {
    // FIXED: Check if running in browser environment
    this.isClient = typeof window !== 'undefined' && typeof document !== 'undefined';
    
    if (this.isClient) {
      this.checkPermission();
    }
  }

  // ========== ENVIRONMENT CHECKS ==========
  
  private checkBrowserSupport(): boolean {
    return this.isClient && 'Notification' in window;
  }

  private checkDOMAvailability(): boolean {
    return this.isClient && document.readyState !== 'loading';
  }

  // ========== GESTION DES PERMISSIONS ==========
  
  async checkPermission(): Promise<boolean> {
    if (!this.checkBrowserSupport()) {
      console.warn('Notifications non supportées dans cet environnement');
      return false;
    }

    try {
      this.permission = Notification.permission;
      console.log('Notification permission status:', this.permission);
      return this.permission === 'granted';
    } catch (error) {
      console.error('Erreur vérification permissions notifications:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.checkBrowserSupport()) {
      console.warn('Impossible de demander les permissions: environnement non supporté');
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      console.log('Permission result:', this.permission);
      return this.permission === 'granted';
    } catch (error) {
      console.error('Erreur demande permission notifications:', error);
      return false;
    }
  }

  // ========== NOTIFICATIONS SYSTÈME ==========
  
  async showNotification(title: string, options: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
  } = {}): Promise<boolean> {
    
    if (!await this.checkPermission()) {
      console.log('Permissions notifications non accordées, utilisation fallback');
      await this.showInAppNotification(title, options.body || '', 'info');
      return false;
    }

    try {
      const notification = new Notification(title, {
        body: options.body || '',
        icon: options.icon || '/fitness-icon.png',
        badge: options.badge || '/fitness-badge.png',
        tag: options.tag || 'fitness-app',
        requireInteraction: options.requireInteraction || false,
        silent: false
      });

      setTimeout(() => {
        try {
          notification.close();
        } catch (error) {
          // Ignore error if notification already closed
        }
      }, 5000);

      console.log('Notification système envoyée:', title);
      return true;

    } catch (error) {
      console.error('Erreur envoi notification système:', error);
      // Fallback to in-app notification
      await this.showInAppNotification(title, options.body || '', 'info');
      return false;
    }
  }

  // ========== NOTIFICATIONS CONTEXTUELLES ==========
  
  async notifyWorkoutReminder(activityType: string, duration: number): Promise<void> {
    const messages = {
      marche: `Il est temps pour votre marche de ${duration} minutes !`,
      natation: `Votre séance de natation de ${duration} minutes vous attend !`,
      course: `Prêt pour ${duration} minutes de course ?`,
      repos: `Moment détente : ${duration} minutes d'étirement vous feront du bien !`
    };

    const activityEmojis = {
      marche: '🚶‍♀️',
      natation: '🏊‍♀️', 
      course: '🏃‍♀️',
      repos: '🧘‍♀️'
    };

    const message = messages[activityType as keyof typeof messages] || 
                   `Temps pour votre activité de ${duration} minutes !`;
    const emoji = activityEmojis[activityType as keyof typeof activityEmojis] || '💪';

    await this.showNotification('Votre activité vous attend !', {
      body: `${emoji} ${message}`,
      tag: 'workout-reminder',
      requireInteraction: true
    });
  }

  async notifyStreakAchievement(streakDays: number): Promise<void> {
    const celebrations = {
      3: { emoji: '🔥', message: 'Vous êtes en feu !' },
      7: { emoji: '⭐', message: 'Une semaine complète, bravo !' },
      14: { emoji: '🏆', message: 'Deux semaines d\'excellence !' },
      30: { emoji: '👑', message: 'Un mois de régularité, vous êtes un champion !' }
    };

    const celebration = celebrations[streakDays as keyof typeof celebrations];
    
    if (celebration) {
      await this.showNotification(`${celebration.emoji} ${streakDays} jours consécutifs !`, {
        body: celebration.message,
        tag: 'streak-achievement',
        requireInteraction: true
      });
    }
  }

  async notifyGoalAchieved(goalType: string, value: number): Promise<void> {
    const goalMessages = {
      weekly: `Objectif hebdomadaire atteint ! ${value} séances cette semaine !`,
      weight: `Objectif de poids atteint ! Félicitations !`,
      duration: `${value} minutes d'activité accomplies aujourd'hui !`,
      calories: `${value} calories brûlées, excellent travail !`
    };

    const goalEmojis = {
      weekly: '🎯',
      weight: '⚖️',
      duration: '⏱️',
      calories: '🔥'
    };

    const message = goalMessages[goalType as keyof typeof goalMessages] || 'Félicitations pour votre performance !';
    const emoji = goalEmojis[goalType as keyof typeof goalEmojis] || '🎉';

    await this.showNotification('Objectif atteint !', {
      body: `${emoji} ${message}`,
      tag: 'goal-achieved',
      requireInteraction: true
    });
  }

  async notifyWeatherAlert(weather: { temp: number; condition: string; city: string }): Promise<void> {
    let message = '';
    let emoji = '';
    
    if (weather.condition === 'rainy') {
      message = `Il pleut à ${weather.city}. Parfait pour une séance de natation !`;
      emoji = '☂️';
    } else if (weather.temp > 30) {
      message = `Il fait ${weather.temp}°C à ${weather.city}. Hydratez-vous bien !`;
      emoji = '🌡️';
    } else if (weather.temp < 5) {
      message = `Il fait ${weather.temp}°C à ${weather.city}. Échauffez-vous bien !`;
      emoji = '❄️';
    } else if (weather.condition === 'sunny' && weather.temp >= 15 && weather.temp <= 25) {
      message = `Temps idéal à ${weather.city} (${weather.temp}°C) pour votre activité !`;
      emoji = '☀️';
    }

    if (message) {
      await this.showNotification('Alerte météo', {
        body: `${emoji} ${message}`,
        tag: 'weather-alert'
      });
    }
  }

  // ========== NOTIFICATIONS IN-APP (FALLBACK ET PRINCIPAL) ==========
  
  async showInAppNotification(
    title: string, 
    message: string, 
    type: 'success' | 'info' | 'warning' | 'error' = 'info',
    duration: number = 3000
  ): Promise<void> {
    
    // FIXED: Check DOM availability
    if (!this.checkDOMAvailability()) {
      console.log('DOM non disponible, notification reportée');
      return;
    }

    try {
      const notification = this.createNotificationElement(title, message, type);
      document.body.appendChild(notification);

      // Animate entrance
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
      }, 100);

      // Auto-remove
      setTimeout(() => {
        this.removeNotification(notification);
      }, duration);

    } catch (error) {
      console.error('Erreur création notification in-app:', error);
    }
  }

  private createNotificationElement(title: string, message: string, type: string): HTMLElement {
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300
      ${type === 'success' ? 'bg-green-500 text-white' : ''}
      ${type === 'info' ? 'bg-blue-500 text-white' : ''}
      ${type === 'warning' ? 'bg-yellow-500 text-black' : ''}
      ${type === 'error' ? 'bg-red-500 text-white' : ''}
    `;
    
    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          ${this.getTypeIcon(type)}
        </div>
        <div class="ml-3 flex-1">
          <p class="font-medium">${this.escapeHtml(title)}</p>
          <p class="text-sm opacity-90">${this.escapeHtml(message)}</p>
        </div>
        <button class="ml-3 flex-shrink-0 opacity-70 hover:opacity-100" onclick="this.parentElement.parentElement.remove()">
          ✕
        </button>
      </div>
    `;

    return notification;
  }

  private removeNotification(notification: HTMLElement): void {
    try {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentElement) {
          notification.parentElement.removeChild(notification);
        }
      }, 300);
    } catch (error) {
      console.error('Erreur suppression notification:', error);
    }
  }

  private getTypeIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info':
      default: return 'ℹ️';
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== NOTIFICATIONS PROGRAMMÉES ==========
  
  scheduleDailyReminder(userId: string, time: { hour: number; minute: number }): void {
    if (!this.isClient) {
      console.warn('Programmation impossible: environnement serveur');
      return;
    }

    try {
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(time.hour, time.minute, 0, 0);

      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const notification: NotificationSchedule = {
        id: `daily_${userId}_${Date.now()}`,
        userId,
        type: 'daily_reminder',
        title: 'Votre séance vous attend !',
        message: 'Il est temps de bouger et de prendre soin de votre santé !',
        scheduledTime,
        isActive: true,
        frequency: 'daily'
      };

      this.notifications.push(notification);
      this.scheduleNotification(notification);
      
      console.log('Rappel quotidien programmé pour', time.hour + ':' + time.minute.toString().padStart(2, '0'));
    } catch (error) {
      console.error('Erreur programmation rappel quotidien:', error);
    }
  }

  private scheduleNotification(notification: NotificationSchedule): void {
    const now = Date.now();
    const scheduledTime = notification.scheduledTime.getTime();
    const delay = scheduledTime - now;

    if (delay > 0 && delay <= 2147483647) { // Max setTimeout delay
      setTimeout(async () => {
        if (notification.isActive) {
          await this.showNotification(notification.title, {
            body: notification.message,
            tag: notification.type,
            requireInteraction: true
          });

          if (notification.frequency === 'daily') {
            notification.scheduledTime.setDate(notification.scheduledTime.getDate() + 1);
            this.scheduleNotification(notification);
          }
        }
      }, delay);
    }
  }

  // ========== GESTION DES NOTIFICATIONS ==========
  
  cancelNotification(notificationId: string): void {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index > -1) {
      this.notifications[index].isActive = false;
      this.notifications.splice(index, 1);
      console.log('Notification annulée:', notificationId);
    }
  }

  cancelAllNotifications(userId: string): void {
    const cancelled = this.notifications.filter(n => n.userId === userId).length;
    this.notifications = this.notifications.filter(n => {
      if (n.userId === userId) {
        n.isActive = false;
        return false;
      }
      return true;
    });
    console.log(`${cancelled} notifications annulées pour l'utilisateur ${userId}`);
  }

  getScheduledNotifications(userId: string): NotificationSchedule[] {
    return this.notifications.filter(n => n.userId === userId && n.isActive);
  }

  // ========== UTILITAIRES ==========
  
  isSupported(): boolean {
    return this.checkBrowserSupport();
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  async sendMotivationalNotification(): Promise<void> {
    const messages = [
      "Chaque pas compte !",
      "Votre corps vous remerciera !",
      "Transformez votre énergie en résultats !",
      "Aujourd'hui est le bon jour pour commencer !",
      "Votre santé est votre plus beau cadeau !",
      "Une séance de plus vers vos objectifs !",
      "Bougez, respirez, vivez !",
      "La régularité est la clé du succès !"
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    await this.showNotification('Motivation du jour', {
      body: `💫 ${randomMessage}`,
      tag: 'motivation'
    });
  }
}

export const notificationService = new NotificationService();
export type { NotificationSchedule };