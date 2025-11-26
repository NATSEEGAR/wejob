import React, { useState, useEffect } from 'react';
import { 
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  AppBar, Toolbar, Typography, IconButton, Avatar, Divider, CssBaseline
} from '@mui/material';
import { 
  Dashboard as DashboardIcon, Work as WorkIcon, People as PeopleIcon, 
  PersonAdd as PersonAddIcon, Logout as LogoutIcon, Menu as MenuIcon,
  FactCheck as FactCheckIcon, Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { confirmAction } from '../utils/alertUtils';

const drawerWidth = 260;

interface LayoutProps { children: React.ReactNode; title?: string; }

export default function Layout({ children, title }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }
      const { data } = await supabase.from('Profiles').select('*').eq('user_id', user.id).single();
      setProfile(data);
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    if (await confirmAction('ออกจากระบบ?', 'ต้องการออกจากระบบใช่หรือไม่', 'ใช่, ออกจากระบบ', '#424242')) {
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  const menuItems = [
    { text: 'หน้าหลัก (Dashboard)', icon: <DashboardIcon />, path: '/dashboard' },
  ];

  if (profile) {
    if (profile.role === 'ADMIN') {
        menuItems.push({ text: 'งานรอตรวจสอบ', icon: <FactCheckIcon />, path: '/my-jobs' });
        menuItems.push({ text: 'จัดการผู้ใช้ (Admin)', icon: <PeopleIcon />, path: '/admin/users' });
        menuItems.push({ text: 'อนุมัติผู้ใช้ใหม่', icon: <PersonAddIcon />, path: '/admin/approval' });
        menuItems.push({ text: 'สรุปความพึงพอใจ', icon: <AssessmentIcon />, path: '/admin/feedback' });
    } else {
        menuItems.push({ text: 'งานของฉัน', icon: <WorkIcon />, path: '/my-jobs' });
    }
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#212121', color: 'white' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#D32F2F' }}>
         <Box sx={{ width: 40, height: 40, bgcolor: 'white', color: '#D32F2F', borderRadius: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', fontSize: '18px' }}>WJ</Box>
         <Typography variant="h6" fontWeight="bold" sx={{ letterSpacing: 1 }}>WeJob System</Typography>
      </Box>
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
      {profile && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
              <Avatar sx={{ width: 70, height: 70, margin: '0 auto', bgcolor: profile.role === 'ADMIN' ? '#FF5252' : '#607D8B', fontSize: 28 }}>{profile.nickname?.[0]}</Avatar>
              <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 'bold' }}>{profile.first_name} {profile.last_name}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>{profile.nickname} ({profile.role === 'ADMIN' ? 'แอดมิน' : 'พนักงาน'})</Typography>
          </Box>
      )}
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
      <List sx={{ flexGrow: 1, px: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
            <ListItemButton onClick={() => navigate(item.path)} selected={location.pathname === item.path} sx={{ borderRadius: 2, '&.Mui-selected': { bgcolor: '#D32F2F', '&:hover': { bgcolor: '#B71C1C' } }, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ p: 2 }}>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: '#C62828' } }}>
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}><LogoutIcon /></ListItemIcon>
              <ListItemText primary="ออกจากระบบ" />
          </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ display: { sm: 'none' }, bgcolor: '#D32F2F' }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)}><MenuIcon /></IconButton>
          <Typography variant="h6" noWrap component="div">{title || 'WeJob'}</Typography>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}>{drawer}</Drawer>
        <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' } }} open>{drawer}</Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, bgcolor: '#F5F7FA', minHeight: '100vh' }}>
        <Toolbar sx={{ display: { sm: 'none' } }} />
        {children}
      </Box>
    </Box>
  );
}