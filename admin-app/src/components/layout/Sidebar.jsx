
import React from 'react';
import {
    Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Dashboard as DashboardIcon,
    School as SchoolIcon,
    People as PeopleIcon,
    Message as MessageIcon,
    Payment as PaymentIcon,
    Build as BuildIcon,
    Settings as SettingsIcon,
    Language as WebIcon
} from '@mui/icons-material';

const DRAWER_WIDTH = 260;

const MENU_ITEMS = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { type: 'divider' },
    { text: 'Students', icon: <SchoolIcon />, path: '/students' },
    { text: 'Tutors', icon: <PeopleIcon />, path: '/tutors' },
    { text: 'Inquiries', icon: <MessageIcon />, path: '/inquiries' },
    { text: 'Payments', icon: <PaymentIcon />, path: '/payments' },
    { type: 'divider' },
    { text: 'Services', icon: <BuildIcon />, path: '/services' },
    { text: 'Website', icon: <WebIcon />, path: '/website' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

export default function Sidebar({ mobileOpen, onClose }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { adminProfile } = useAuth();

    const content = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>


            {/* User Info Block */}
            <Box sx={{ px: 3, mb: 1, mt: 3 }}>
                <Box sx={{
                    p: 1.5,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'grey.200',
                    borderRadius: 2,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {adminProfile?.full_name || 'Admin'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {adminProfile?.admin_id || 'ID'}
                    </Typography>
                </Box>
            </Box>

            <List sx={{ px: 2, flex: 1 }}>
                {MENU_ITEMS.map((item, index) => {
                    if (item.type === 'divider') {
                        return <Divider key={index} sx={{ my: 2, mx: 2 }} />;
                    }

                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

                    return (
                        <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                onClick={() => {
                                    navigate(item.path);
                                    if (mobileOpen) onClose();
                                }}
                                sx={{
                                    borderRadius: 2,
                                    bgcolor: isActive ? 'primary.50' : 'transparent',
                                    color: isActive ? 'primary.main' : 'text.secondary',
                                    '&:hover': {
                                        bgcolor: isActive ? 'primary.50' : 'grey.50',
                                        color: isActive ? 'primary.main' : 'text.primary',
                                    }
                                }}
                            >
                                <ListItemIcon sx={{
                                    minWidth: 40,
                                    color: isActive ? 'primary.main' : 'inherit'
                                }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontWeight: isActive ? 600 : 500,
                                        fontSize: '0.9375rem'
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            {/* Footer / Version */}
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="caption" color="text.disabled">
                    v2.0.0 • Admin Panel
                </Typography>
            </Box>
        </Box>
    );

    return (
        <>
            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={onClose}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH }
                }}
            >
                {content}
            </Drawer>

            {/* Desktop Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: DRAWER_WIDTH,
                        borderRight: '1px solid',
                        borderColor: 'grey.200'
                    },
                }}
                open
            >
                {content}
            </Drawer>
        </>
    );
}
