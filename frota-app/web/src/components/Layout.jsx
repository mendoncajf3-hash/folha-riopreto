import React, { useState } from 'react';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, AppBar, Typography, IconButton, Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PeopleIcon from '@mui/icons-material/People';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LARGURA = 220;

const MENU = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { label: 'Relatório', icon: <AssessmentIcon />, path: '/relatorio' },
  { label: 'Veículos', icon: <DirectionsCarIcon />, path: '/veiculos' },
  { label: 'Colaboradores', icon: <PeopleIcon />, path: '/colaboradores' },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const [mobileAberto, setMobileAberto] = useState(false);

  function sair() {
    logout();
  }

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ backgroundColor: '#1565C0' }}>
        <Typography variant="h6" color="white" fontWeight="bold">Frota App</Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {MENU.map(({ label, icon, path }) => (
          <ListItem key={path} disablePadding>
            <ListItemButton
              selected={pathname === path || (path !== '/' && pathname.startsWith(path))}
              onClick={() => { navigate(path); setMobileAberto(false); }}
              sx={{ '&.Mui-selected': { backgroundColor: '#e3f2fd', borderRight: '3px solid #1565C0' } }}
            >
              <ListItemIcon sx={{ color: (pathname === path || (path !== '/' && pathname.startsWith(path))) ? '#1565C0' : 'inherit' }}>
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{ fontWeight: (pathname === path || (path !== '/' && pathname.startsWith(path))) ? 'bold' : 'normal' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={sair}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Sair" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, backgroundColor: '#1565C0', display: { sm: 'none' } }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => setMobileAberto(true)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>Frota App</Typography>
          <IconButton color="inherit" onClick={sair}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, width: LARGURA, flexShrink: 0, '& .MuiDrawer-paper': { width: LARGURA, boxSizing: 'border-box' } }}>
        {drawer}
      </Drawer>

      <Drawer variant="temporary" open={mobileAberto} onClose={() => setMobileAberto(false)}
        sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: LARGURA } }}>
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: '#f5f5f5', mt: { xs: 7, sm: 0 } }}>
        {children}
      </Box>
    </Box>
  );
}
