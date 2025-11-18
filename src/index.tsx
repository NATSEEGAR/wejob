import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // นี่คือแอปหลักของเรา
import './index.css'; // <-- Import ไฟล์ CSS ที่เราเพิ่งสร้าง
import { BrowserRouter } from 'react-router-dom'; // ตัวจัดการหน้า

// MUI Imports (สำหรับคุม Theme หน้าตา)
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// สร้าง Theme โดยบอกให้ใช้ฟอนต์ไทยเป็นหลัก
const theme = createTheme({
  typography: {
    fontFamily: [
      'IBM Plex Sans Thai', // <-- ฟอนต์ที่เรา import
      'sans-serif',
    ].join(','),
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    {/* หุ้ม 1: ให้แอปนี้ใช้ Theme ของ MUI */}
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* ช่วยปรับ CSS ให้เหมือนกันทุก Browser */}

      {/* หุ้ม 2: ให้แอปนี้ใช้ระบบเปลี่ยนหน้า (Routing) */}
      <BrowserRouter>
        <App /> {/* เรียกแอปหลักของเรา */}
      </BrowserRouter>

    </ThemeProvider>
  </React.StrictMode>
);