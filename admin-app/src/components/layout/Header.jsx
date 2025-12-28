import React, { useState } from 'react';
import {
    AppBar, Toolbar, IconButton, Typography, Box, Avatar, Menu, MenuItem, Divider, ListItemIcon, Button, ListItemText,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Slide
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import LoginModal from '../auth/LoginModal';

const DRAWER_WIDTH = 260;

const PAGE_TITLES = {
    '/': 'Dashboard',
    '/students': 'Students',
    '/tutors': 'Tutors',
    '/inquiries': 'Inquiries',
    '/payments': 'Payments',
    '/services': 'Services',
    '/website': 'Website Configuration',
    '/settings': 'Settings'
};

export default function Header({ onMobileToggle }) {
    const { adminProfile, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);

    const title = PAGE_TITLES[location.pathname] || 'Dashboard';
    const initial = adminProfile?.full_name?.charAt(0) || 'A';

    const handleMenu = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const handleAddAccount = () => {
        handleClose();
        navigate('/signin?action=add_account');
    };

    const Transition = React.forwardRef(function Transition(props, ref) {
        return <Slide direction="up" ref={ref} {...props} />;
    });

    const [savedAdmins, setSavedAdmins] = useState(() =>
        JSON.parse(localStorage.getItem('craftsoft_saved_admins') || '[]')
    );

    const [logoutType, setLogoutType] = useState(null);
    const [switchTarget, setSwitchTarget] = useState(null);

    const confirmLogout = async () => {
        if (logoutType === 'all') {
            localStorage.removeItem('craftsoft_saved_admins');
        }
        setLogoutType(null);
        await signOut();
        navigate('/signin', { replace: true });
    };

    // Filter out the current logged-in user
    const otherAccounts = savedAdmins.filter(admin =>
        admin.admin_id !== adminProfile?.admin_id
    );

    const handleSwitchAccount = (account) => {
        handleClose();
        setSwitchTarget(account);
    };

    const handleLoginSuccess = () => {
        setSwitchTarget(null);
        window.location.reload();
    };

    const handleRemoveAccount = (e, adminId) => {
        e.stopPropagation();
        const updated = savedAdmins.filter(a => a.admin_id !== adminId);
        localStorage.setItem('craftsoft_saved_admins', JSON.stringify(updated));
        setSavedAdmins(updated);
    };

    const handleLogout = () => {
        handleClose();
        setLogoutType('single');
    };

    const handleSignOutAll = () => {
        handleClose();
        setLogoutType('all');
    };

    return (
        <AppBar
            position="fixed"
            sx={{
                width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                ml: { md: `${DRAWER_WIDTH}px` },
                boxShadow: 'none',
                bgcolor: 'background.default', // transparent effect
                borderBottom: '1px solid',
                borderColor: 'grey.200',
                backdropFilter: 'blur(8px)',
                background: 'rgba(248, 250, 252, 0.8)'
            }}
        >
            <Toolbar>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={onMobileToggle}
                    sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}
                >
                    <MenuIcon />
                </IconButton>

                <Typography variant="h6" noWrap component="div" sx={{ color: 'text.primary', fontWeight: 600, flexGrow: 1 }}>
                    {title}
                </Typography>

                <Box>
                    <Button
                        onClick={handleMenu}
                        endIcon={<KeyboardArrowDownIcon />}
                        sx={{
                            textTransform: 'none',
                            color: 'text.primary',
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'grey.200',
                            borderRadius: 3,
                            px: 2,
                            py: 0.75,
                            minWidth: 160,
                            justifyContent: 'space-between',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            '&:hover': {
                                bgcolor: 'grey.50',
                                borderColor: 'grey.300'
                            }
                        }}
                    >
                        <Box sx={{ textAlign: 'left', mr: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                {adminProfile?.full_name || 'Admin'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                {adminProfile?.admin_id || 'ID'}
                            </Typography>
                        </Box>
                    </Button>
                    <Menu
                        id="menu-appbar"
                        anchorEl={anchorEl}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        keepMounted
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                        PaperProps={{
                            elevation: 0,
                            sx: {
                                mt: 1.5,
                                overflow: 'visible',
                                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
                                borderRadius: 3,
                                minWidth: 260,
                                '&:before': { // Arrow
                                    content: '""',
                                    display: 'block',
                                    position: 'absolute',
                                    top: 0, right: 14, width: 10, height: 10,
                                    bgcolor: 'background.paper',
                                    transform: 'translateY(-50%) rotate(45deg)',
                                    zIndex: 0,
                                },
                            }
                        }}
                    >
                        <Box sx={{ px: 2, py: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{adminProfile?.full_name}</Typography>
                            <Typography variant="caption" color="text.secondary">{adminProfile?.admin_id}</Typography>
                        </Box>
                        <Divider />

                        {/* Other Accounts */}
                        {otherAccounts.map((account, index) => (
                            <MenuItem key={index} onClick={() => handleSwitchAccount(account)} sx={{ py: 1.5 }}>
                                <ListItemIcon>
                                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem', bgcolor: 'primary.light' }}>
                                        {account.full_name?.charAt(0) || 'A'}
                                    </Avatar>
                                </ListItemIcon>
                                <ListItemText
                                    primary={account.full_name}
                                    secondary={account.admin_id}
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                    secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                                />
                            </MenuItem>
                        ))}
                        {otherAccounts.length > 0 && <Divider />}

                        <MenuItem onClick={handleAddAccount} sx={{ py: 1.5 }}>
                            <ListItemIcon><PersonAddIcon fontSize="small" /></ListItemIcon>
                            Add another account
                        </MenuItem>

                        {savedAdmins.length > 1 && (
                            <MenuItem onClick={handleSignOutAll} sx={{ py: 1.5 }}>
                                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                                Sign out of all accounts
                            </MenuItem>
                        )}
                        <Divider />
                        <MenuItem onClick={handleLogout} sx={{ py: 1.5, bgcolor: 'grey.50' }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                color="inherit"
                                size="small"
                                onClick={handleLogout}
                            >
                                Sign out
                            </Button>
                        </MenuItem>
                    </Menu>

                    <LoginModal
                        open={Boolean(switchTarget)}
                        account={switchTarget}
                        onClose={() => setSwitchTarget(null)}
                        onSuccess={handleLoginSuccess}
                    />

                    <Dialog
                        open={Boolean(logoutType)}
                        TransitionComponent={Transition}
                        keepMounted
                        onClose={() => setLogoutType(null)}
                        aria-labelledby="logout-dialog-title"
                        aria-describedby="logout-dialog-description"
                        PaperProps={{
                            sx: {
                                borderRadius: 4,
                                padding: 1,
                                minWidth: 320,
                                background: 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(10px)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                            }
                        }}
                    >
                        <Box sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
                            <Box sx={{
                                width: 60, height: 60, borderRadius: '50%',
                                bgcolor: 'error.lighter', color: 'error.main',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px',
                                background: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)'
                            }}>
                                <LogoutIcon sx={{ fontSize: 32 }} />
                            </Box>
                            <DialogTitle id="logout-dialog-title" sx={{ p: 0, mb: 1, fontWeight: 700, fontFamily: 'Outfit' }}>
                                {logoutType === 'all' ? 'Sign Out All Accounts?' : 'Sign Out?'}
                            </DialogTitle>
                            <DialogContent>
                                <DialogContentText id="logout-dialog-description" sx={{ color: 'text.secondary' }}>
                                    {logoutType === 'all'
                                        ? 'This will remove all saved accounts from this device.'
                                        : <span>Are you sure you want to sign out of <b>{adminProfile?.full_name}</b>?</span>}
                                </DialogContentText>
                            </DialogContent>
                        </Box>
                        <DialogActions sx={{ p: 2, justifyContent: 'center', gap: 2 }}>
                            <Button
                                onClick={() => setLogoutType(null)}
                                sx={{
                                    color: 'text.secondary', fontWeight: 600, px: 3,
                                    '&:hover': { bgcolor: 'grey.100' }
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmLogout}
                                variant="contained"
                                color="error"
                                autoFocus
                                sx={{
                                    borderRadius: 3, px: 4, py: 1,
                                    boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)',
                                    textTransform: 'none',
                                    fontWeight: 600
                                }}
                            >
                                {logoutType === 'all' ? 'Sign Out All' : 'Sign Out'}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
