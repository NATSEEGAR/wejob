import React, { useEffect, useState } from 'react';
import { 
  Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Dialog, DialogTitle, DialogContent, Chip, Stack, IconButton, Avatar, Box
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Visibility, Delete as DeleteIcon, PersonAdd, Phone } from '@mui/icons-material';
import Layout from '../components/Layout';
import { confirmAction, showSuccess, showError } from '../utils/alertUtils';

// ฟังก์ชันแปลงสถานะงานเป็นภาษาไทยและสีที่กำหนด
const getJobStatusConfig = (status: string) => {
  switch (status) {
    case 'PENDING': return { label: 'รอดำเนินการ', color: '#D32F2F', bgcolor: '#FFEBEE' };
    case 'IN_PROGRESS': return { label: 'กำลังดำเนินการ', color: '#E65100', bgcolor: '#FFF3E0' };
    case 'WAITING_REVIEW': return { label: 'รอตรวจงาน', color: '#2E7D32', bgcolor: '#C8E6C9' };
    case 'APPROVED': return { label: 'ตรวจเรียบร้อย', color: '#1B5E20', bgcolor: '#A5D6A7' };
    default: return { label: status, color: '#757575', bgcolor: '#EEEEEE' };
  }
};

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
    const { data } = await supabase
      .from('Jobs')
      .select('*')
      .eq('assigned_to', user.user_id)
      .order('id', { ascending: false });
    setUserJobs(data || []);
  };

  const handleDeleteUser = async (targetUser: any) => {
      if (targetUser.user_id === currentUser.id) {
          showError("ทำรายการไม่ได้", "คุณไม่สามารถลบบัญชีของตัวเองได้");
          return;
      }

      if (await confirmAction(`ลบผู้ใช้ ${targetUser.nickname}?`, `คุณแน่ใจหรือไม่ที่จะลบ "${targetUser.first_name} ${targetUser.last_name}" ออกจากระบบถาวร?`, 'ยืนยันลบ', '#D32F2F')) {
          const { error } = await supabase.rpc('delete_user_account', { user_id_to_delete: targetUser.user_id });
          
          if (!error) {
              showSuccess("ลบผู้ใช้เรียบร้อยแล้ว");
              fetchUsers();
          } else {
              const { error: delError } = await supabase.from('Profiles').delete().eq('user_id', targetUser.user_id);
              if (!delError) {
                  showSuccess("ลบข้อมูลผู้ใช้แล้ว");
                  fetchUsers();
              } else {
                  showError("เกิดข้อผิดพลาด", error.message);
              }
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
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>พนักงาน (ID)</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ชื่อ - นามสกุล</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>เบอร์โทร</TableCell>
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
                          <Avatar sx={{ bgcolor: u.role === 'ADMIN' ? '#D32F2F' : '#757575' }}>{u.nickname?.[0]}</Avatar>
                          <Box>
                              <Typography fontWeight={600}>{u.nickname}</Typography>
                              <Typography variant="caption" color="text.secondary">ID: {u.employee_id || '-'}</Typography>
                          </Box>
                      </Stack>
                  </TableCell>
                  <TableCell>{u.first_name} {u.last_name}</TableCell>
                  <TableCell>
                      {u.phone_number ? (
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Phone fontSize="small" color="action" />
                              <Typography variant="body2">{u.phone_number}</Typography>
                          </Stack>
                      ) : "-"}
                  </TableCell>
                  <TableCell>{u.department || '-'}</TableCell>
                  <TableCell>
                      <Chip 
                          label={u.role === 'ADMIN' ? 'แอดมิน' : 'พนักงาน'} 
                          size="small" 
                          sx={{ 
                              bgcolor: u.role === 'ADMIN' ? '#FFEBEE' : '#F5F5F5', 
                              color: u.role === 'ADMIN' ? '#C62828' : '#616161', 
                              fontWeight: 'bold',
                              border: '1px solid',
                              borderColor: u.role === 'ADMIN' ? '#FFCDD2' : '#E0E0E0'
                          }} 
                      />
                  </TableCell>
                  <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton color="primary" onClick={() => handleViewUser(u)} title="ดูงานที่มอบหมาย">
                            <Visibility />
                        </IconButton>
                        <IconButton 
                            color="error" 
                            onClick={() => handleDeleteUser(u)} 
                            disabled={u.user_id === currentUser?.id}
                            title="ลบผู้ใช้งาน"
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

      <Dialog open={!!selectedUser} onClose={() => setSelectedUser(null)} fullWidth maxWidth="md">
          <DialogTitle sx={{ bgcolor: '#424242', color: 'white' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    งานของ: {selectedUser?.first_name} {selectedUser?.last_name}
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        ID: {selectedUser?.employee_id} | โทร: {selectedUser?.phone_number}
                    </Typography>
                  </Box>
              </Stack>
          </DialogTitle>
          <DialogContent sx={{ pt: 3, bgcolor: '#F5F5F5' }}>
              <Typography variant="h6" sx={{ mt: 2, mb: 2, fontWeight: 'bold' }}>
                  รายการงานทั้งหมด ({userJobs.length})
              </Typography>
              <Stack spacing={2}>
                  {userJobs.map(job => {
                      const statusConfig = getJobStatusConfig(job.status);
                      return (
                          <Paper key={job.id} sx={{ p: 2, borderLeft: `6px solid ${statusConfig.color}`, borderRadius: 2 }}>
                              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
                                  <Box>
                                      <Typography variant="h6" fontWeight="bold">{job.title}</Typography>
                                      <Typography variant="body2" color="text.secondary">{job.location || 'ไม่ระบุสถานที่'}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                          {new Date(job.start_time).toLocaleDateString('th-TH')}
                                      </Typography>
                                  </Box>
                                  <Box sx={{ textAlign: 'right' }}>
                                      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>สถานะงาน:</Typography>
                                      <Chip label={statusConfig.label} sx={{ bgcolor: statusConfig.bgcolor, color: statusConfig.color, fontWeight: 'bold' }} />
                                  </Box>
                              </Stack>
                          </Paper>
                      );
                  })}
                  {userJobs.length === 0 && <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}><Typography variant="h6">- ยังไม่มีงานที่ได้รับมอบหมาย -</Typography></Box>}
              </Stack>
          </DialogContent>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', bgcolor: 'white' }}>
              <Button onClick={() => setSelectedUser(null)} variant="outlined" color="inherit">ปิดหน้าต่าง</Button>
          </Box>
      </Dialog>
    </Layout>
  );
}
export default AdminUserManagementPage;