
import React, { useState } from 'react';
import {
    Box, Typography, List, ListItem, ListItemAvatar, ListItemText,
    Avatar, IconButton, Button, Fade, Dialog, DialogTitle, DialogContent,
    DialogContentText, DialogActions, Slide
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useTheme } from '@mui/material/styles';

const SAVED_ADMINS_KEY = 'craftsoft_saved_admins';

export default function AccountPicker({ onSelect, onAddAccount, savedAdmins, removeAdmin }) {
    const theme = useTheme();
    // Removed local savedAdmins state
    const [isEditing, setIsEditing] = useState(false);

    // Keyboard Nav Logic (Simplified for React)
    // We can add it back later if needed, but standard Tab nav works well in React/MUI usually.

    const [removeId, setRemoveId] = useState(null);

    const handleDeleteClick = (id) => {
        setRemoveId(id);
    };

    const confirmRemove = () => {
        if (removeId) {
            // Find the admin to get the admin_id, as removeAdmin expects admin_id (or we can change to id)
            // In Header we pass admin_id. In Context removeAdmin(adminId).
            // Let's check the objects in savedAdmins. They have 'id' (uuid) and 'admin_id' (string code).
            const target = savedAdmins.find(a => a.id === removeId);
            if (target) {
                removeAdmin(target.admin_id);
            }
            // Check length after removal logic is done via updated prop
            if (savedAdmins.length <= 1) onAddAccount();
        }
        setRemoveId(null);
    };

    const Transition = React.forwardRef(function Transition(props, ref) {
        return <Slide direction="up" ref={ref} {...props} />;
    });

    const getAvatarColor = (name) => {
        return 'linear-gradient(135deg, #2896cd 0%, #6C5CE7 100%)';
    };

    if (savedAdmins.length === 0) {
        return null;
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button
                    onClick={() => setIsEditing(!isEditing)}
                    size="small"
                    sx={{ fontWeight: 600, color: 'primary.main', textTransform: 'uppercase' }}
                >
                    {isEditing ? 'Done' : 'Manage'}
                </Button>
            </Box>

            <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {savedAdmins.map((admin) => (
                    <ListItem
                        key={admin.id}
                        sx={{
                            bgcolor: isEditing ? 'background.paper' : 'grey.50',
                            border: '1px solid',
                            borderColor: 'grey.200',
                            borderRadius: 3,
                            cursor: isEditing ? 'default' : 'pointer',
                            pr: isEditing ? 8 : 2,
                            transition: 'all 0.2s',
                            '&:hover': {
                                bgcolor: isEditing ? 'background.paper' : 'background.paper',
                                borderColor: isEditing ? 'grey.200' : 'primary.300',
                                boxShadow: isEditing ? 'none' : theme.shadows[2],
                                transform: isEditing ? 'none' : 'translateY(-2px)'
                            }
                        }}
                        onClick={() => !isEditing && onSelect(admin)}
                    >
                        <ListItemAvatar>
                            <Avatar
                                sx={{
                                    background: admin.color || getAvatarColor(admin.full_name),
                                    borderRadius: 2,
                                    fontWeight: 700
                                }}
                            >
                                {admin.full_name?.charAt(0) || 'A'}
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                            primary={
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    {admin.full_name}
                                </Typography>
                            }
                            secondary={
                                <Box component="span" sx={{
                                    bgcolor: 'grey.200', color: 'grey.600',
                                    px: 1, py: 0.25, borderRadius: 1, fontSize: '0.75rem', fontWeight: 600
                                }}>
                                    {admin.admin_id}
                                </Box>
                            }
                        />
                        {isEditing ? (
                            <Fade in={isEditing}>
                                <IconButton
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(admin.id); }}
                                    sx={{
                                        position: 'absolute', right: 16,
                                        color: 'error.main',
                                        bgcolor: 'error.lighter',
                                        '&:hover': { bgcolor: 'error.light', color: 'white' }
                                    }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Fade>
                        ) : (
                            <ChevronRightIcon sx={{ color: 'grey.400' }} />
                        )}
                    </ListItem>
                ))}
            </List>

            <Button
                fullWidth
                startIcon={<PersonAddIcon />}
                onClick={onAddAccount}
                sx={{
                    mt: 3,
                    border: '2px dashed',
                    borderColor: 'grey.300',
                    color: 'grey.600',
                    py: 1.5,
                    borderRadius: 3,
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50', color: 'primary.main' }
                }}
            >
                Use another account
            </Button>

            <Dialog
                open={Boolean(removeId)}
                TransitionComponent={Transition}
                keepMounted
                onClose={() => setRemoveId(null)}
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        padding: 1,
                        minWidth: 300,
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                    }
                }}
            >
                <Box sx={{ textAlign: 'center', pt: 3 }}>
                    <Box sx={{
                        width: 50, height: 50, borderRadius: '50%',
                        bgcolor: 'error.lighter', color: 'error.main',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        background: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)'
                    }}>
                        <DeleteIcon />
                    </Box>
                    <DialogTitle sx={{ p: 0, mb: 1, fontWeight: 700, fontFamily: 'Outfit' }}>
                        Remove account?
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            You will need to sign in again to use this account.
                        </DialogContentText>
                    </DialogContent>
                </Box>
                <DialogActions sx={{ p: 2, justifyContent: 'center', gap: 1 }}>
                    <Button onClick={() => setRemoveId(null)} sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmRemove}
                        variant="contained"
                        color="error"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
                    >
                        Yes, Remove
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
