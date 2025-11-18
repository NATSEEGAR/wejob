import React, { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom'; // ตัวเปลี่ยนหน้า
import { supabase } from '../supabaseClient'; // ตัวเชื่อม Supabase

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(''); // เปลี่ยนชื่อตัวแปรให้ตรงความจริง
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. แปลง Username เป็น Email (เหมือนตอนสมัคร)
      const fakeEmail = `${username}@example.com`;

      // 2. ล็อกอินกับ Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: password,
      });

      if (authError) throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");

      // 3. ดึงข้อมูล Profile มาเช็กสถานะ
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from('Profiles')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();

        if (profileError) throw profileError;

        // 4. ตรวจสอบสถานะอนุมัติ
        if (profile.approval_status !== 'APPROVED') {
           // ถ้ายังไม่อนุมัติ -> สั่ง Logout ทันที แล้วแจ้งเตือน
           await supabase.auth.signOut();
           alert("บัญชีของคุณยังรอการอนุมัติจากแอดมิน กรุณาติดต่อฝ่ายบุคคล");
           setLoading(false);
           return; 
        }

        // 5. ถ้าผ่านทุกด่าน -> ไปหน้า Dashboard
        // (ส่งข้อมูล role ไปด้วย เผื่อใช้เช็กว่าเป็น admin หรือ staff)
        navigate('/dashboard', { state: { role: profile.role } });
      }

    } catch (error: any) {
      console.error(error);
      alert(error.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          WeJob - เข้าสู่ระบบ
        </Typography>
        <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="รหัสผ่าน"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
          </Button>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Link href="/signup" variant="body2">
              {"ยังไม่มีบัญชี? ลงทะเบียน (สำหรับพนักงาน)"}
            </Link>
          </Box>

        </Box>
      </Box>
    </Container>
  );
}

export default LoginPage;