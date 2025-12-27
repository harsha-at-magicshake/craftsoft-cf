
import React, { useState } from 'react';
import {
    AppBar, Toolbar, IconButton, Typography, Box, Avatar, Menu, MenuItem, Divider, ListItemIcon, Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

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

    const handleLogout = () => {
        handleClose();
        signOut();
        navigate('/signin');
    };

    const handleAddAccount = () => {
        handleClose();
        signOut();
        navigate('/signin?action=add_account');
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
                                minWidth: 200,
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
                        <MenuItem onClick={handleAddAccount} sx={{ py: 1.5 }}>
                            <ListItemIcon><PersonAddIcon fontSize="small" /></ListItemIcon>
                            Add another account
                        </MenuItem>
                        <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
                            <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                            Logout
                        </MenuItem>
                    </Menu>
                </Box>
            </Toolbar>
        </AppBar>
    );
}
