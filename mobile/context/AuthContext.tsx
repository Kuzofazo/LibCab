import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../utils/apiClient';

const AuthContext = createContext<any>(null);

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                console.error("Failed to load user", e);
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            const res = await apiClient('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
                skipOfflineQueue: true,
            });
            const data = await res.json();
            if (res.ok) {
                setUser(data.user);
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                await AsyncStorage.setItem('token', data.token);
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (e) {
            return { success: false, error: "Connection failed" };
        }
    };

    const signUp = async (email: string, password: string, name: string, role: 'RIDER' | 'DRIVER') => {
        try {
            const res = await apiClient('/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ email, password, name, role }),
                skipOfflineQueue: true,
            });
            const data = await res.json();
            if (res.ok) {
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (e) {
            return { success: false, error: "Connection failed" };
        }
    };

    const signOut = async () => {
        setUser(null);
        try {
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('token');
        } catch (e) {
            console.error("Failed to remove user", e);
        }
    };

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(app)';

        if (!user && inAuthGroup) {
            router.replace('/login');
        } else if (user && !inAuthGroup) {
            if (user.role === 'DRIVER') router.replace('/(app)/driver');
            else router.replace('/(app)/rider');
        }
    }, [user, segments, loading]);

    return (
        <AuthContext.Provider value={{ user, signIn, signUp, signOut, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
