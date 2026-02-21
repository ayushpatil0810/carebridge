// ============================================================
// Auth Context — Firebase Authentication + Role Management
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                // Fetch role from Firestore
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setRole(data.role || 'asha');
                        setUserName(data.name || firebaseUser.email);
                    } else {
                        setRole('asha');
                        setUserName(firebaseUser.email);
                    }
                } catch (err) {
                    console.error('Error fetching user role:', err);
                    setRole('asha');
                    setUserName(firebaseUser.email);
                }
            } else {
                setUser(null);
                setRole(null);
                setUserName('');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    };

    const register = async (email, password, name, userRole = 'asha') => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Create user document with role
        await setDoc(doc(db, 'users', result.user.uid), {
            email,
            name,
            role: userRole,
            createdAt: new Date(),
        });
        return result.user;
    };

    const logout = async () => {
        await signOut(auth);
    };

    const value = {
        user,
        role,
        userName,
        loading,
        login,
        register,
        logout,
        isAsha: role === 'asha',
        isPhc: role === 'phc',
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
