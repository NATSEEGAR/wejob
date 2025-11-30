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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/my-jobs" element={<MyJobsPage />} />
        <Route path="/admin/approval" element={<AdminUserApprovalPage />} />
        <Route path="/admin/users" element={<AdminUserManagementPage />} />
        <Route path="/admin/feedback" element={<AdminFeedbackPage />} /> {/* <--- เพิ่ม */}
        {/* เพิ่มบรรทัดนี้ครับ: เส้นทางสำหรับลูกค้า (ไม่ต้อง Login) */}
        <Route path="/feedback/:jobId" element={<PublicFeedbackPage />} />
      </Routes>
    </ThemeProvider>
  );
}
export default App;