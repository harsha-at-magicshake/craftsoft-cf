
import React, { useState, useEffect } from 'react';
import {
    Box, Card, Typography, TextField, Button, InputAdornment, IconButton, Alert
} from '@mui/material';
import { Visibility, VisibilityOff, ArrowBack } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import AccountPicker from '../components/auth/AccountPicker';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Logo = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4, justifyContent: 'center' }}>
        <Box sx={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, #2896cd 0%, #6C5CE7 100%)',
            borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
        }}>
            <span style={{ fontSize: '1.25rem' }}>🎓</span>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
            Craft<Box component="span" sx={{
                background: 'linear-gradient(135deg, #2896cd 0%, #6C5CE7 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>Soft</Box>
        </Typography>
    </Box>
);

export default function Signin() {
    const { session } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [savedAdmins, setSavedAdmins] = useState(() => {
        try { return JSON.parse(localStorage.getItem('craftsoft_saved_admins') || '[]'); }
        catch { return []; }
    });

    const [view, setView] = useState(savedAdmins.length > 0 ? 'picker' : 'form');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);

    useEffect(() => {
        const action = searchParams.get('action');

        if (session && action !== 'add_account') {
            navigate('/', { replace: true });
            return;
        }

        if (session && action === 'add_account') {
            supabase.auth.signOut();
        }

        if (searchParams.get('reason') === 'timeout') {
            setError('You were logged out due to inactivity.');
        }

        const selectAccount = searchParams.get('select_account');
        if (selectAccount) {
            setIdentifier(selectAccount);
            setView('form');
        }

        // Aggressive Back Button Block
        window.history.pushState(null, null, window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, null, window.location.href);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [session, navigate, searchParams]);

    const handleSelectAccount = (account) => {
        setIdentifier(account.admin_id);
        setView('form');
    };

    const handleSignin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let email = identifier;
            const isEmail = identifier.includes('@');

            if (!isEmail) {
                // Fetch email from admin_id
                // We need to query Supabase. Note: RLS must allow this or use edge function.
                // Assuming 'admins' table is readable to find email.
                const { data, error } = await supabase.from('admins')
                    .select('email')
                    .eq('admin_id', identifier.toUpperCase()) // Ensure uppercase
                    .single();

                if (error || !data) throw new Error('Invalid Admin ID');
                email = data.email;
            }

            const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            // SAVE ACCOUNT TO LOCAL STORAGE logic
            // We fetch profile to save details
            const { data: profile } = await supabase.from('admins').select('*').eq('id', authData.user.id).single();
            if (profile) {
                const newAccount = {
                    id: profile.id,
                    admin_id: profile.admin_id,
                    full_name: profile.full_name,
                    email: profile.email,
                    avatar: '', // add actual if exists
                    color: 'linear-gradient(135deg, #2896cd 0%, #6C5CE7 100%)'
                };

                const existing = savedAdmins.filter(a => a.id !== newAccount.id);
                const updated = [newAccount, ...existing];
                localStorage.setItem('craftsoft_saved_admins', JSON.stringify(updated));
                setSavedAdmins(updated);
            }

            // navigate('/') removed to allow useEffect to handle redirect on session change
        } catch (err) {
            console.error(err);
            setShake(true);
            setTimeout(() => setShake(false), 500);
            setError('Invalid credentials.');
            setLoading(false); // Only stop loading on error. On success, keep loading until redirect.
        }
    };

    const isReadOnly = view === 'form' && savedAdmins.some(a => a.admin_id === identifier);

    return (
        <Box sx={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #edf6fb 100%)', p: 2
        }}>
            <Card sx={{
                width: '100%', maxWidth: 480, p: 4, animation: shake ? 'shake 0.5s' : 'none',
                '@keyframes shake': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                    '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
                }
            }}>
                <Logo />

                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ mb: 1 }}>
                        {view === 'picker' ? 'Welcome Back' : 'Admin Sign In'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {view === 'picker' ? 'Choose an account to continue' : 'Sign in with your email or Admin ID'}
                    </Typography>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {view === 'picker' ? (
                    <AccountPicker
                        onSelect={handleSelectAccount}
                        onAddAccount={() => { setIdentifier(''); setView('form'); }}
                    />
                ) : (
                    <form onSubmit={handleSignin}>
                        <TextField
                            fullWidth label="Email or Admin ID" variant="outlined" margin="normal"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            disabled={isReadOnly}
                            // Important: Force readOnly attribute for true read-only behavior
                            InputProps={{
                                readOnly: isReadOnly,
                                sx: isReadOnly ? { bgcolor: 'grey.50', color: 'text.secondary' } : {}
                            }}
                            placeholder="Enter your Email or Admin ID"
                        />
                        <TextField
                            fullWidth label="Password" type={showPassword ? 'text' : 'password'}
                            variant="outlined" margin="normal"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                            placeholder="Enter your secure password"
                        />

                        <Button
                            fullWidth variant="contained" size="large" type="submit"
                            disabled={loading} sx={{ mt: 3, mb: 2 }}
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </Button>

                        <Box sx={{ textAlign: 'center' }}>
                            {(savedAdmins.length > 0 || isReadOnly) && (
                                <Button
                                    startIcon={<ArrowBack />}
                                    onClick={() => {
                                        setView('picker');
                                        setIdentifier(''); // Clear if going back
                                        setPassword('');
                                    }}
                                    sx={{ color: 'text.secondary', display: 'flex', width: '100%', justifyContent: 'center', mb: 1 }}
                                >
                                    Choose another account
                                </Button>
                            )}
                            <Box>
                                <Button href="https://craftsoft.co.in" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                    Back to Website
                                </Button>
                            </Box>
                        </Box>
                    </form>
                )}
            </Card>
        </Box>
    );
}
