import React from 'react';
import { Box, Typography, Container, Card, CardContent, Stack, Button, Divider } from '@mui/material';
import { Engineering, AccessTime, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGoWeJob = () => {
    navigate('/login');
  };

  const handleGoHR = () => {
    window.open('https://numchai.infinityfreeapp.com/login.php', '_blank');
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#F8FAFC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2
    }}>
      <Container maxWidth="md">

        {/* โลโก้ + หัวเรื่อง */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>

          {/* โลโก้บริษัท */}
          <Box
            component="img"
            src="/logo_numchai.png"
            alt="Numchai Logo"
            sx={{
              width: 450,
              height: 150,
              objectFit: "contain",
              borderRadius: "12px",
              margin: "0 auto",
              mb: 2,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
            }}
          />

          <Typography variant="h6" sx={{ color: '#000000ff', fontWeight: 600 }}>
            กรุณาเลือกระบบที่ต้องการเข้าใช้งาน
          </Typography>
        </Box>

        {/* การ์ดตัวเลือก */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="center">

          {/* 🌟 ระบบ WeJob */}
          <Card
            onClick={handleGoWeJob}
            sx={{
              flex: 1,
              cursor: 'pointer',
              transition: 'all 0.3s',
              border: '1px solid #E2E8F0',
              borderRadius: 3,
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 10px 30px rgba(211, 47, 47, 0.15)',
                borderColor: '#EF5350'
              }
            }}
          >
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Box sx={{
                bgcolor: '#FFEBEE',
                color: '#D32F2F',
                width: 60,
                height: 60,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                mb: 2
              }}>
                <Engineering sx={{ fontSize: 32 }} />
              </Box>

              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Numchai Service Wejob
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                สำหรับแจ้งตารางงาน , ดูสถานะงาน และจัดการงานพนักงาน
              </Typography>

              <Button variant="contained" color="error" fullWidth endIcon={<ArrowForward />}>
                เข้าสู่ระบบ Numchai Service Wejob
              </Button>
            </CardContent>
          </Card>

          {/* 🌟 ระบบ HR */}
          <Card
            onClick={handleGoHR}
            sx={{
              flex: 1,
              cursor: 'pointer',
              transition: 'all 0.3s',
              border: '1px solid #E2E8F0',
              borderRadius: 3,
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 10px 30px rgba(30, 41, 59, 0.15)',
                borderColor: '#1E293B'
              }
            }}
          >
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Box sx={{
                bgcolor: '#E3F2FD',
                color: '#1565C0',
                width: 60,
                height: 60,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                mb: 2
              }}>
                <AccessTime sx={{ fontSize: 32 }} />
              </Box>

              <Typography variant="h6" fontWeight="bold" gutterBottom>
                ระบบลางาน / ลงเวลา
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                สำหรับลงเวลาเข้า-ออกงาน, แจ้งลางาน และตรวจสอบวันลา
              </Typography>

              <Button variant="outlined" sx={{ color: '#1E293B', borderColor: '#1E293B' }} fullWidth endIcon={<ArrowForward />}>
                เข้าสู่ระบบ HR
              </Button>
            </CardContent>
          </Card>

        </Stack>

        {/* Footer */}
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Divider sx={{ mb: 3, width: '50%', mx: 'auto', opacity: 0.5 }} />
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            © 2024 Numchai Service. All rights reserved.
          </Typography>
        </Box>

      </Container>
    </Box>
  );
};

export default LandingPage;
