import React, { useEffect, useState } from 'react';
import { Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, Chip, Stack, IconButton, Avatar, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Visibility, Delete as DeleteIcon, PersonAdd } from '@mui/icons-material';
import Layout from '../components/Layout'; // ใช้ Layout ใหม่
import { confirmAction, showSuccess, showError } from '../utils/alertUtils';

function AdminUserManagementPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userJobs, setUserJobs] = useState<any[]>([]);

  useEffect(() => { 
      fetchCurrentUser();
      fetchUsers(); 
  }, []);

  const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('Profiles').select('*').order('nickname');
    setUsers(data || []);
  };

  const handleViewUser = async (user: any) => {
    setSelectedUser(user);
    const { data } = await supabase.from('Jobs').select('*').eq('assigned_to', user.user_id);
    setUserJobs(data || []);
  };

  const handleDeleteUser = async (targetUser: any) => {
      // ห้ามลบตัวเอง
      if (targetUser.user_id === currentUser.id) {
          showError("ทำรายการไม่ได้", "คุณไม่สามารถลบบัญชีของตัวเองได้");
          return;
      }

      if (await confirmAction(`ลบผู้ใช้ ${targetUser.nickname}?`, `คุณแน่ใจหรือไม่ที่จะลบ "${targetUser.first_name} ${targetUser.last_name}" ออกจากระบบ? (ข้อมูลจะหายถาวรและสมัครใหม่ชื่อเดิมได้)`, 'ลบผู้ใช้', '#D32F2F')) {
          
          // [แก้ตรงนี้] เปลี่ยนจาก .delete() ธรรมดา -> เป็นการเรียก .rpc() (Remote Procedure Call)
          const { error } = await supabase.rpc('delete_user_account', { 
            user_id_to_delete: targetUser.user_id 
          });

          if (!error) {
              showSuccess("ลบผู้ใช้เรียบร้อยแล้ว");
              fetchUsers(); // ดึงรายชื่อใหม่
          } else {
              showError("เกิดข้อผิดพลาด", error.message);
          }
      }
  };

  return (
    <Layout title="จัดการผู้ใช้">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>จัดการผู้ใช้</Typography>
            <Typography variant="body1" color="text.secondary">รายชื่อพนักงานและแอดมินทั้งหมดในระบบ</Typography>
          </Box>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<PersonAdd />} 
            onClick={() => navigate('/admin/approval')}
            sx={{ borderRadius: 20, px: 3 }}
          >
            อนุมัติผู้ใช้ใหม่
          </Button>
      </Stack>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#424242' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>พนักงาน</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ชื่อ - นามสกุล</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>แผนก</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ตำแหน่ง</TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.user_id} hover>
                  <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar sx={{ bgcolor: u.role === 'ADMIN' ? '#D32F2F' : '#757575' }}>{u.nickname[0]}</Avatar>
                          <Box>
                              <Typography fontWeight={600}>{u.nickname}</Typography>
                              <Typography variant="caption" color="text.secondary">{u.username}</Typography>
                          </Box>
                      </Stack>
                  </TableCell>
                  <TableCell>{u.first_name} {u.last_name}</TableCell>
                  <TableCell>{u.department}</TableCell>
                  <TableCell>
                      <Chip 
                          label={u.role === 'ADMIN' ? 'แอดมิน' : 'พนักงาน'} 
                          size="small" 
                          sx={{ 
                              bgcolor: u.role === 'ADMIN' ? '#FFEBEE' : '#F5F5F5', 
                              color: u.role === 'ADMIN' ? '#C62828' : '#616161', 
                              fontWeight: 'bold' 
                          }} 
                      />
                  </TableCell>
                  <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton color="primary" onClick={() => handleViewUser(u)} title="ดูงาน"><Visibility /></IconButton>
                        <IconButton 
                            color="error" 
                            onClick={() => handleDeleteUser(u)} 
                            disabled={u.user_id === currentUser?.id} // ปิดปุ่มถ้าเป็นตัวเอง
                            title="ลบผู้ใช้"
                        >
                            <DeleteIcon />
                        </IconButton>
                      </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog ดูงาน */}
      <Dialog open={!!selectedUser} onClose={() => setSelectedUser(null)} fullWidth maxWidth="md">
          <DialogTitle sx={{ bgcolor: '#424242', color: 'white' }}>
              งานของ: {selectedUser?.first_name} {selectedUser?.last_name} ({selectedUser?.nickname})
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
              <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>รายการงานทั้งหมด ({userJobs.length})</Typography>
              <Stack spacing={1}>
                  {userJobs.map(job => (
                      <Paper key={job.id} sx={{ p: 2, bgcolor: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #D32F2F' }}>
                          <Typography fontWeight={600}>{job.title}</Typography>
                          <Chip label={job.status} size="small" sx={{ borderRadius: 1 }} />
                      </Paper>
                  ))}
                  {userJobs.length === 0 && <Typography color="text.secondary" align="center" py={4}>- ยังไม่มีงานที่ได้รับมอบหมาย -</Typography>}
              </Stack>
          </DialogContent>
      </Dialog>
    </Layout>
  );
}
export default AdminUserManagementPage;