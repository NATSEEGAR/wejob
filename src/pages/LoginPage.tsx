import React, { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Link, Paper, Stack, InputAdornment } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { showError } from '../utils/alertUtils';
import { Person, Lock } from '@mui/icons-material';

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fakeEmail = `${username}@example.com`;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: fakeEmail, password: password,
      });

      if (authError) throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");

      if (authData.user) {
        const { data: profile, error: profileError } = await supabase.from('Profiles').select('*').eq('user_id', authData.user.id).single();
        if (profileError) throw profileError;
        if (profile.approval_status !== 'APPROVED') {
           await supabase.auth.signOut();
           showError("เข้าใช้งานไม่ได้", "บัญชีของคุณยังรอการอนุมัติจากแอดมิน");
           setLoading(false); return; 
        }
        navigate('/dashboard');
      }
    } catch (error: any) {
      showError("เข้าสู่ระบบล้มเหลว", error.message);
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #D32F2F 0%, #D32F2F 55%, #455A64 55%, #455A64 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Container maxWidth="xs">
        <Paper elevation={24} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 4, bgcolor: '#FFFFFF' }}>
          <Box sx={{ width: 80, height: 80, bgcolor: '#D32F2F', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2, color: 'white', fontSize: '32px', fontWeight: 'bold', border: '4px solid #FFCDD2' }}>WJ</Box>
          <Typography variant="h4" sx={{ mb: 1, color: '#D32F2F' }}>WE JOB</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>เข้าสู่ระบบเพื่อเริ่มงาน</Typography>
          <Box component="form" onSubmit={handleLogin} noValidate sx={{ width: '100%' }}>
            <Stack spacing={3}>
              <TextField label="Username" fullWidth value={username} onChange={(e) => setUsername(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><Person color="action"/></InputAdornment>) }} />
              <TextField label="Password" type="password" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><Lock color="action"/></InputAdornment>) }} />
            </Stack>
            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 4, mb: 2, py: 1.5, fontSize: '1.1rem', bgcolor: '#D32F2F', '&:hover': { bgcolor: '#B71C1C' } }}>
              {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
            </Button>
            <Stack direction="row" justifyContent="center">
              <Link href="/signup" variant="body2" underline="hover" sx={{ color: '#455A64' }}>สมัครสมาชิกพนักงานใหม่</Link>
            </Stack>
          </Box>
        </Paper>
        <Typography variant="caption" display="block" align="center" sx={{ color: 'rgba(255,255,255,0.8)', mt: 3 }}>© 2025 WeJob Management System</Typography>
      </Container>
    </Box>
  );
}
export default LoginPage;