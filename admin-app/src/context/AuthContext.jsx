
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [adminProfile, setAdminProfile] = useState(null);

    // 10 Min Timeout
    const TIMEOUT_DURATION = 10 * 60 * 1000;
    let idleTimer;

    const resetIdleTimer = () => {
        if (!session) return;
        clearTimeout(idleTimer);
        idleTimer = setTimeout(lockSession, TIMEOUT_DURATION);
    };

    const lockSession = async () => {
        await supabase.auth.signOut();
        // Use window.location to ensure full refresh/redirect logic
        // Or use router navigation if we had access here, but window is safer for hard logout
        if (window.location.pathname.indexOf('/signin') === -1) {
            window.location.replace('/admin/signin?reason=timeout');
        }
    };

    useEffect(() => {
        // Session setup
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) loadProfile(session.user.id);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                loadProfile(session.user.id);
                resetIdleTimer();
            } else {
                setAdminProfile(null);
            }
            setLoading(false);
        });

        // Activity listeners
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        const handleActivity = () => resetIdleTimer();

        events.forEach(e => document.addEventListener(e, handleActivity));

        return () => {
            subscription.unsubscribe();
            clearTimeout(idleTimer);
            events.forEach(e => document.removeEventListener(e, handleActivity));
        };
    }, [session]); // dependency on session to re-bind listeners? acts as reliable trigger

    const loadProfile = async (userId) => {
        const { data } = await supabase
            .from('admins')
            .select('*')
            .eq('id', userId)
            .single();
        setAdminProfile(data);
    };

    const [savedAdmins, setSavedAdmins] = useState(() => {
        try { return JSON.parse(localStorage.getItem('craftsoft_saved_admins') || '[]'); }
        catch { return []; }
    });

    const saveAdmin = (profile) => {
        if (!profile) return;
        setSavedAdmins(prev => {
            const newAccount = {
                id: profile.id,
                admin_id: profile.admin_id,
                full_name: profile.full_name,
                email: profile.email,
                avatar: profile.avatar || '',
                color: 'linear-gradient(135deg, #2896cd 0%, #6C5CE7 100%)'
            };
            const others = prev.filter(a => a.id !== newAccount.id);
            const updated = [newAccount, ...others];
            localStorage.setItem('craftsoft_saved_admins', JSON.stringify(updated));
            return updated;
        });
    };

    const removeAdmin = (adminId) => {
        setSavedAdmins(prev => {
            const updated = prev.filter(a => a.admin_id !== adminId);
            localStorage.setItem('craftsoft_saved_admins', JSON.stringify(updated));
            return updated;
        });
    };

    const clearAllAdmins = () => {
        setSavedAdmins([]);
        localStorage.removeItem('craftsoft_saved_admins');
    };

    const value = {
        session,
        adminProfile,
        signOut: () => supabase.auth.signOut(),
        loading,
        savedAdmins,
        saveAdmin,
        removeAdmin,
        clearAllAdmins
    };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
