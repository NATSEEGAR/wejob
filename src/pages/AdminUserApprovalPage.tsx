import React, { useEffect, useState } from 'react';
import { Typography, Button, Paper, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack, CircularProgress, Avatar, Box } from '@mui/material';
import { CheckCircle, Cancel, Badge, Phone } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { confirmAction, showSuccess, showError } from '../utils/alertUtils';
import Layout from '../components/Layout';

function AdminUserApprovalPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/'); return; }
        const { data: profileData } = await supabase.from('Profiles').select('role').eq('user_id', user.id).single();
        if (profileData?.role !== 'ADMIN') { navigate('/dashboard'); return; }
        fetchPendingUsers();
    };
    checkAuth();
  }, [navigate]);

  const fetchPendingUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('Profiles').select('*').eq('approval_status', 'PENDING');
    setPendingUsers(data || []);
    setLoading(false);
  };
  
  const handleApproval = async (userId: string, userName: string) => {
    if (await confirmAction(`อนุมัติ ${userName}?`, "ผู้ใช้นี้จะสามารถเข้าใช้งานระบบได้ทันที")) {
        const { error } = await supabase.from('Profiles').update({ approval_status: 'APPROVED', role: 'STAFF' }).eq('user_id', userId);
        if (!error) { showSuccess(`อนุมัติ ${userName} แล้ว`); fetchPendingUsers(); } 
        else { showError("เกิดข้อผิดพลาด", error.message); }
    }
  };

  const handleRejection = async (userId: string, userName: string) => {
    if (await confirmAction(`ปฏิเสธและลบ ${userName}?`, "ข้อมูลจะถูกลบถาวร", "ลบเลย")) {
        const { error } = await supabase.rpc('delete_user_account', { user_id_to_delete: userId });
        if (!error) { 
             showSuccess(`ลบ ${userName} แล้ว`); 
             fetchPendingUsers(); 
        } else { 
             // Fallback delete
             await supabase.from('Profiles').delete().eq('user_id', userId);
             fetchPendingUsers();
        }
    }
  };

  if (loading) return <Layout><Box sx={{ display: 'flex', justifyContent: 'center', height: '50vh', alignItems: 'center' }}><CircularProgress /></Box></Layout>;

  return (
    <Layout title="อนุมัติผู้ใช้">
        <Typography variant="h4" sx={{ mb: 3 }}>อนุมัติพนักงานใหม่</Typography>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#424242' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>พนักงาน (ID)</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ชื่อ - นามสกุล</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>เบอร์โทร</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>แผนก</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>สถานะ</TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>ดำเนินการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.user_id} hover>
                    <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{ bgcolor: '#FF5722' }}>{user.nickname?.[0]}</Avatar>
                            <Box>
                                <Typography fontWeight={600}>{user.username}</Typography>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Badge fontSize="small" color="action" sx={{ fontSize: 14 }} />
                                    <Typography variant="caption" color="text.secondary">{user.employee_id || '-'}</Typography>
                                </Stack>
                            </Box>
                        </Stack>
                    </TableCell>
                    <TableCell>{user.first_name} {user.last_name}</TableCell>
                    <TableCell>
                        {user.phone_number ? (
                             <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Phone fontSize="small" color="action" />
                                <Typography variant="body2">{user.phone_number}</Typography>
                             </Stack>
                        ) : "-"}
                    </TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell><Chip label="รออนุมัติ" size="small" sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 'bold' }} /></TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button variant="contained" color="success" size="small" startIcon={<CheckCircle />} onClick={() => handleApproval(user.user_id, user.username)}>อนุมัติ</Button>
                        <Button variant="outlined" color="error" size="small" startIcon={<Cancel />} onClick={() => handleRejection(user.user_id, user.username)}>ปฏิเสธ</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingUsers.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>ไม่มีคำขอใหม่</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
    </Layout>
  );
}
export default AdminUserApprovalPage;