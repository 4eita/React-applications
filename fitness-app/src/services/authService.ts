import { 
  getAuth, 
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  AuthError
} from 'firebase/auth';
import { app } from './firebaseConfig';

interface AuthUser {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
  displayName: string | null;
}

class AuthService {
  private auth: any;
  private currentUser: AuthUser | null = null;
  private authStateListeners: ((user: AuthUser | null) => void)[] = [];

  constructor() {
    try {
      this.auth = getAuth(app);
      this.setupAuthStateListener();
    } catch (error) {
      console.error('Auth service initialization failed:', error);
    }
  }

  private setupAuthStateListener(): void {
    onAuthStateChanged(this.auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        this.currentUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          isAnonymous: firebaseUser.isAnonymous,
          displayName: firebaseUser.displayName
        };
      } else {
        this.currentUser = null;
      }
      
      this.authStateListeners.forEach(listener => listener(this.currentUser));
    });
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.authStateListeners.push(callback);
    callback(this.currentUser);
    
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  async signUpWithEmail(email: string, password: string, displayName?: string): Promise<AuthUser> {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      return {
        uid: result.user.uid,
        email: result.user.email,
        isAnonymous: false,
        displayName: displayName || null
      };
    } catch (error) {
      const authError = error as AuthError;
      const errorMessages: Record<string, string> = {
        'auth/email-already-in-use': 'Cette adresse email est déjà utilisée',
        'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
        'auth/invalid-email': 'Adresse email invalide'
      };
      throw new Error(errorMessages[authError.code] || authError.message);
    }
  }

  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      
      return {
        uid: result.user.uid,
        email: result.user.email,
        isAnonymous: false,
        displayName: result.user.displayName
      };
    } catch (error) {
      const authError = error as AuthError;
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'Aucun compte trouvé avec cette adresse email',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/invalid-email': 'Adresse email invalide'
      };
      throw new Error(errorMessages[authError.code] || authError.message);
    }
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}

export const authService = new AuthService();
export type { AuthUser };