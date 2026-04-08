import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

function AuthBootScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-jj-canvas dark:bg-jj-canvas-dark px-6">
      <div
        className="h-10 w-10 rounded-full border-2 border-jj-border/80 border-t-jj-accent dark:border-white/12 dark:border-t-teal-300 animate-spin"
        aria-hidden
      />
      <p className="mt-6 text-sm font-medium text-jj-muted dark:text-stone-400 text-center max-w-sm">
        Starting your session…
      </p>
      <p className="mt-3 text-xs text-jj-muted dark:text-stone-500 text-center max-w-md leading-relaxed">
        If this never finishes, a browser extension (for example a wallet or &quot;lockdown&quot; script) may be
        blocking auth storage. Try an incognito window with extensions turned off.
      </p>
    </div>
  );
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userNickname, setUserNickname] = useState('');

  const signup = async (email, password, nickname) => {
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update user profile with nickname
      await updateProfile(user, {
        displayName: nickname
      });
      
      // Create user profile document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        nickname: nickname,
        displayName: nickname,
        createdAt: new Date(),
        authProvider: 'email'
      });
      
      return userCredential;
    } catch (error) {
      console.error('Error during signup:', error);
      throw error;
    }
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user profile exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      // If user doesn't exist, create profile with Google display name as nickname
      if (!userDoc.exists()) {
        const nickname = user.displayName || user.email.split('@')[0]; // Fallback to email prefix if no display name
        
        await setDoc(userDocRef, {
          email: user.email,
          nickname: nickname,
          displayName: nickname,
          createdAt: new Date(),
          authProvider: 'google',
          photoURL: user.photoURL || null
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error during Google login:', error);
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  // Get user's nickname from Firestore
  const getUserNickname = async (userId = null) => {
    try {
      const uid = userId || currentUser?.uid;
      if (!uid) return 'User';
      
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const nickname = userDoc.data().nickname || userDoc.data().displayName || 'User';
        setUserNickname(nickname); // Update cached nickname
        return nickname;
      }
      return 'User';
    } catch (error) {
      console.error('Error getting user nickname:', error);
      return 'User';
    }
  };
  
  // Refresh nickname from Firestore (call this after updating nickname)
  const refreshNickname = async () => {
    if (currentUser) {
      await getUserNickname(currentUser.uid);
    }
  };

  useEffect(() => {
    let unsubscribe = () => {};
    let bootTimeoutId = window.setTimeout(() => {
      bootTimeoutId = null;
      setLoading(false);
    }, 15000);

    const clearBootTimeout = () => {
      if (bootTimeoutId != null) {
        window.clearTimeout(bootTimeoutId);
        bootTimeoutId = null;
      }
    };

    auth
      .authStateReady()
      .then(() => {
        unsubscribe = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user);
          if (user) {
            getUserNickname(user.uid);
          } else {
            setUserNickname('');
          }
          clearBootTimeout();
          setLoading(false);
        });
      })
      .catch(() => {
        clearBootTimeout();
        setLoading(false);
      });

    return () => {
      clearBootTimeout();
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    currentUser,
    userNickname,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    getUserNickname,
    refreshNickname,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <AuthBootScreen /> : children}
    </AuthContext.Provider>
  );
};
