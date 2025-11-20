import React, { useEffect, useState } from 'react';
import { Typography, Button, Paper, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack, CircularProgress } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
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
        const { error } = await supabase.from('Profiles').delete().eq('user_id', userId);
        if (!error) { showSuccess(`ลบ ${userName} แล้ว`); fetchPendingUsers(); } 
        else { showError("เกิดข้อผิดพลาด", error.message); }
    }
  };

  if (loading) return <Layout><CircularProgress /></Layout>;

  return (
    <Layout title="อนุมัติผู้ใช้">
        <Typography variant="h4" sx={{ mb: 3 }}>อนุมัติพนักงานใหม่</Typography>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#424242' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white' }}>Username</TableCell>
                  <TableCell sx={{ color: 'white' }}>ชื่อจริง</TableCell>
                  <TableCell sx={{ color: 'white' }}>แผนก</TableCell>
                  <TableCell sx={{ color: 'white' }}>สถานะ</TableCell>
                  <TableCell align="center" sx={{ color: 'white' }}>ดำเนินการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.user_id} hover>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.nickname}</TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell><Chip label="รออนุมัติ" size="small" sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 'bold' }} /></TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button variant="contained" color="success" size="small" startIcon={<CheckCircle />} onClick={() => handleApproval(user.user_id, user.username)}>อนุมัติ</Button>
                        <Button variant="outlined" color="error" size="small" startIcon={<Cancel />} onClick={() => handleRejection(user.user_id, user.username)}>ลบ</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingUsers.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>ไม่มีคำขอใหม่</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
    </Layout>
  );
}
export default AdminUserApprovalPage;