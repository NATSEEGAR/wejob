import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material'; 
import theme from './theme';

// Import หน้าต่างๆ ที่เราสร้างไว้
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import MyJobsPage from './pages/MyJobsPage'; // หน้างานของฉัน
import AdminUserApprovalPage from './pages/AdminUserApprovalPage'; // หน้าอนุมัติ (อันเดิม)
import AdminUserManagementPage from './pages/AdminUserManagementPage'; // หน้าจัดการผู้ใช้ (อันใหม่)

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        {/* หน้าแรก (Login) */}
        <Route path="/" element={<LoginPage />} />
        
        {/* หน้าสมัครสมาชิก */}
        <Route path="/signup" element={<SignUpPage />} />
        
        {/* หน้า Dashboard หลัก (ปฏิทินงานรวม) */}
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* หน้า "งานของฉัน" (สำหรับพนักงานดูงานตัวเอง) */}
        <Route path="/my-jobs" element={<MyJobsPage />} />

        {/* --- ส่วนของ Admin --- */}
        
        {/* หน้าอนุมัติผู้ใช้ใหม่ (ที่มีปุ่มติ๊กถูก/ผิด) */}
        <Route path="/admin/approval" element={<AdminUserApprovalPage />} />
        
        {/* หน้าจัดการผู้ใช้ทั้งหมด (ดูรายชื่อและงานของแต่ละคน) */}
        <Route path="/admin/users" element={<AdminUserManagementPage />} />

      </Routes>
    </ThemeProvider>
  );
}

export default App;