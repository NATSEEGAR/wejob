import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage'; // <--- เพิ่มบรรทัดนี้

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      
      {/* เรียกใช้ DashboardPage ของจริง */}
      <Route path="/dashboard" element={<DashboardPage />} /> 
    </Routes>
  );
}

export default App;