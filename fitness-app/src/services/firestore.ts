import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { app } from './firebaseConfig';

class FirestoreService {
  private db: any;

  constructor() {
    try {
      this.db = getFirestore(app);
    } catch (error) {
      console.error('Firestore initialization failed:', error);
    }
  }

  async getUserProfile(userId: string): Promise<any | null> {
    try {
      const docRef = doc(this.db, 'users', userId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async saveUserProfile(userId: string, profile: any): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', userId);
      await setDoc(userRef, {
        ...profile,
        updatedAt: Timestamp.now(),
        createdAt: profile.createdAt || Timestamp.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }

  async updateUserWeight(userId: string, weight: number): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, { 
        weight: weight,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating weight:', error);
      throw error;
    }
  }

  async addActivitySession(session: any): Promise<string> {
    try {
      const sessionsRef = collection(this.db, 'sessions');
      const docRef = await addDoc(sessionsRef, {
        ...session,
        date: session.date || Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding session:', error);
      throw error;
    }
  }

  async getUserSessions(userId: string, limitCount: number = 10): Promise<any[]> {
    try {
      const sessionsRef = collection(this.db, 'sessions');
      const q = query(
        sessionsRef,
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const sessions: any[] = [];
      
      querySnapshot.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() });
      });
      
      return sessions;
    } catch (error) {
      console.error('Error getting sessions:', error);
      return [];
    }
  }

  async addWeightEntry(userId: string, weight: number, notes?: string): Promise<void> {
    try {
      const weightsRef = collection(this.db, 'weights');
      await addDoc(weightsRef, {
        userId,
        weight,
        notes,
        date: Timestamp.now()
      });
    } catch (error) {
      console.error('Error adding weight entry:', error);
      throw error;
    }
  }

  async getWeightHistory(userId: string, limitCount: number = 30): Promise<any[]> {
    try {
      const weightsRef = collection(this.db, 'weights');
      const q = query(
        weightsRef,
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const weights: any[] = [];
      
      querySnapshot.forEach((doc) => {
        weights.push({ id: doc.id, ...doc.data() });
      });
      
      return weights;
    } catch (error) {
      console.error('Error getting weight history:', error);
      return [];
    }
  }

  async getUserStats(userId: string): Promise<any> {
    try {
      const sessions = await this.getUserSessions(userId, 100);
      const completedSessions = sessions.filter(s => s.completed);
      
      return {
        totalSessions: completedSessions.length,
        totalCalories: completedSessions.reduce((sum, s) => sum + (s.calories || 0), 0),
        totalDuration: completedSessions.reduce((sum, s) => sum + s.duration, 0),
        streakDays: this.calculateStreak(sessions),
        weeklyAverage: Math.round((completedSessions.length / Math.max(1, Math.ceil(completedSessions.length / 7))) * 10) / 10,
        favoriteActivity: this.getFavoriteActivity(completedSessions),
        monthlyProgress: this.calculateMonthlyProgress(sessions)
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  private calculateStreak(sessions: any[]): number {
    // Simple streak calculation
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < sessions.length; i++) {
      const sessionDate = sessions[i].date.toDate ? sessions[i].date.toDate() : new Date(sessions[i].date);
      const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak && sessions[i].completed) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  private getFavoriteActivity(sessions: any[]): string {
    const counts: Record<string, number> = {};
    sessions.forEach(s => {
      counts[s.activity] = (counts[s.activity] || 0) + 1;
    });
    
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) || 'marche';
  }

  private calculateMonthlyProgress(sessions: any[]): number {
    const now = new Date();
    const thisMonth = sessions.filter(s => {
      const date = s.date.toDate ? s.date.toDate() : new Date(s.date);
      return date.getMonth() === now.getMonth() && s.completed;
    }).length;
    
    const lastMonth = sessions.filter(s => {
      const date = s.date.toDate ? s.date.toDate() : new Date(s.date);
      return date.getMonth() === (now.getMonth() - 1) && s.completed;
    }).length;
    
    return lastMonth === 0 ? (thisMonth > 0 ? 100 : 0) : Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  }
}

export const firestoreService = new FirestoreService();