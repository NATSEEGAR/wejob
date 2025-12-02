import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material'; 
import theme from './theme';

import PublicFeedbackPage from './pages/PublicFeedbackPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import MyJobsPage from './pages/MyJobsPage';
import AdminUserApprovalPage from './pages/AdminUserApprovalPage';
import AdminUserManagementPage from './pages/AdminUserManagementPage';
import AdminFeedbackPage from './pages/AdminFeedbackPage'; // <--- เพิ่ม
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        {/* 👇 1. หน้าแรกสุด (ประตูบ้าน) ให้เป็น LandingPage */}
        <Route path="/" element={<LandingPage />} />

        {/* 👇 2. ย้ายหน้า Login เดิม มาไว้ที่ /login แทน */}
        <Route path="/login" element={<LoginPage />} />

        {/* --- ส่วนอื่นๆ เหมือนเดิม --- */}
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/my-jobs" element={<MyJobsPage />} />
        <Route path="/admin/approval" element={<AdminUserApprovalPage />} />
        <Route path="/admin/users" element={<AdminUserManagementPage />} />
        <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
        
        {/* เส้นทางสำหรับลูกค้า (ไม่ต้อง Login) */}
        <Route path="/feedback/:jobId" element={<PublicFeedbackPage />} />
      </Routes>
    </ThemeProvider>
  );
}
export default App;