
import React, { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import {
  type User,
  onAuthStateChanged,
  signOut, // 1. Importar signOut
} from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>; // 2. Adicionar logout à interface
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Implementar a função de logout
  const logout = async () => {
    await signOut(auth);
  };

  const isAuthenticated = !!user;

  return (
    // 4. Disponibilizar o logout no contexto
    <AuthContext.Provider value={{ user, isAuthenticated, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
