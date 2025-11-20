import { createTheme } from '@mui/material/styles';

// ธีม Red & Grey Modern (Red 70% / Grey 30%)
const theme = createTheme({
  palette: {
    primary: {
      main: '#D32F2F', // สีแดงหลัก (แดงเข้ม)
      light: '#FFCDD2', // สีแดงอ่อน
      dark: '#B71C1C', // สีแดงมืด
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#455A64', // สีเทาอมฟ้า (Blue Grey)
      light: '#CFD8DC',
      dark: '#263238',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F5F7FA', // พื้นหลังแอป: สีเทาอ่อนมาก
      paper: '#FFFFFF',   // พื้นหลังการ์ด: สีขาวล้วน
    },
    text: {
      primary: '#1F2937', // สีตัวหนังสือหลัก: เทาเข้มเกือบดำ
      secondary: '#6B7280', // สีตัวหนังสือรอง: เทากลาง
    },
    success: { main: '#059669' },
    warning: { main: '#D97706' },
    error: { main: '#DC2626' },
    info: { main: '#2563EB' }
  },
  typography: {
    fontFamily: '"IBM Plex Sans Thai", "Prompt", "Roboto", sans-serif',
    h4: { fontWeight: 800, color: '#1F2937', letterSpacing: '-0.5px' },
    h5: { fontWeight: 700, color: '#374151' },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600, borderRadius: '8px' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#D32F2F', // แถบเมนูสีแดงสด
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          boxShadow: 'none',
          padding: '8px 20px',
          '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
          border: '1px solid #E5E7EB',
        },
      },
    },
  },
});

export default theme;