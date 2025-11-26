import React, { useEffect, useState } from 'react';
import { 
  Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Dialog, DialogTitle, DialogContent, Chip, Stack, IconButton, Avatar, Box, Select, MenuItem, FormControl, InputLabel, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Visibility, Delete as DeleteIcon, PersonAdd, ExpandMore, Star, StarBorder } from '@mui/icons-material';
import Layout from '../components/Layout';
import { confirmAction, showSuccess, showError } from '../utils/alertUtils';

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
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userJobs, setUserJobs] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState(0);

  useEffect(() => { 
      fetchData();
  }, []);

  const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);

      const { data: depts } = await supabase.from('Departments').select('*').order('id');
      setDepartments(depts || []);

      const { data: profiles } = await supabase
        .from('Profiles')
        .select('*, Departments(name)')
        .order('department_id', { ascending: true })
        .order('is_head', { ascending: false });
      setUsers(profiles || []);
  };

  const handleToggleHead = async (user: any) => {
      const isPromoting = !user.is_head;
      if (isPromoting) {
          const currentHead = users.find(u => u.department_id === user.department_id && u.is_head);
          if (currentHead) {
              if (!(await confirmAction('เปลี่ยนหัวหน้าฝ่าย?', `ฝ่ายนี้มี "${currentHead.nickname}" เป็นหัวหน้าอยู่แล้ว ต้องการเปลี่ยนให้ "${user.nickname}" เป็นแทนหรือไม่?`))) return;
              await supabase.from('Profiles').update({ is_head: false }).eq('user_id', currentHead.user_id);
          } else {
              if (!(await confirmAction('ยืนยันการแต่งตั้ง', `ต้องการแต่งตั้ง "${user.nickname}" เป็นหัวหน้าฝ่ายใช่หรือไม่?`))) return;
          }
      } else {
          if (!(await confirmAction('ยืนยันการปลด', `ต้องการปลด "${user.nickname}" จากตำแหน่งหัวหน้าฝ่ายใช่หรือไม่?`))) return;
      }

      const { error } = await supabase.from('Profiles').update({ is_head: isPromoting }).eq('user_id', user.user_id);
      if (!error) { showSuccess("บันทึกข้อมูลเรียบร้อย"); fetchData(); } else { showError("เกิดข้อผิดพลาด", error.message); }
  };

  const handleViewUser = async (user: any) => {
    setSelectedUser(user);
    const { data } = await supabase.from('Jobs').select('*').eq('assigned_to', user.user_id).order('id', { ascending: false });
    setUserJobs(data || []);
  };

  const handleDeleteUser = async (targetUser: any) => {
      if (targetUser.user_id === currentUser.id) { showError("ทำรายการไม่ได้", "คุณไม่สามารถลบบัญชีของตัวเองได้"); return; }
      if (await confirmAction(`ลบผู้ใช้ ${targetUser.nickname}?`, `ข้อมูลจะหายถาวร`, 'ยืนยันลบ', '#D32F2F')) {
          const { error } = await supabase.rpc('delete_user_account', { user_id_to_delete: targetUser.user_id });
          if (!error) { showSuccess("ลบเรียบร้อย"); fetchData(); } 
          else { 
              await supabase.from('Profiles').delete().eq('user_id', targetUser.user_id);
              fetchData();
          }
      }
  };

  const displayedDepartments = filterDept === 0 ? departments : departments.filter(d => d.id === filterDept);

  return (
    <Layout title="จัดการโครงสร้างองค์กร">
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={4} spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>โครงสร้างองค์กร</Typography>
            <Typography variant="body1" color="text.secondary">จัดการพนักงานและกำหนดหัวหน้าฝ่าย</Typography>
          </Box>
          <Stack direction="row" spacing={2}>
             <FormControl size="small" sx={{ minWidth: 220, bgcolor: 'white', borderRadius: 1 }}>
                <InputLabel>กรองตามฝ่าย</InputLabel>
                <Select value={filterDept} label="กรองตามฝ่าย" onChange={(e) => setFilterDept(Number(e.target.value))}>
                    <MenuItem value={0}>-- แสดงทุกฝ่าย --</MenuItem>
                    {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </Select>
             </FormControl>
             <Button variant="contained" color="success" startIcon={<PersonAdd />} onClick={() => navigate('/admin/approval')}>
                อนุมัติคนใหม่
             </Button>
          </Stack>
      </Stack>

      {displayedDepartments.map(dept => {
          const deptUsers = users.filter(u => u.department_id === dept.id);
          if (deptUsers.length === 0 && filterDept === 0) return null; 

          return (
              <Accordion key={dept.id} defaultExpanded sx={{ mb: 2, borderRadius: '12px !important', overflow: 'hidden', boxShadow: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#ECEFF1', borderBottom: '1px solid #e0e0e0' }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#37474F' }}>{dept.name}</Typography>
                        <Chip label={`${deptUsers.length} คน`} size="small" color="primary" variant="outlined" />
                      </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                      <TableContainer>
                          <Table>
                              <TableHead>
                                  <TableRow>
                                      <TableCell sx={{ width: '50px' }}></TableCell>
                                      <TableCell>พนักงาน</TableCell>
                                      <TableCell>ตำแหน่ง</TableCell>
                                      <TableCell>เบอร์โทร</TableCell>
                                      <TableCell align="center">จัดการ</TableCell>
                                  </TableRow>
                              </TableHead>
                              <TableBody>
                                  {deptUsers.map(user => (
                                      <TableRow key={user.user_id} sx={{ bgcolor: user.is_head ? '#FFF8E1' : 'inherit' }}>
                                          <TableCell>
                                              <IconButton onClick={() => handleToggleHead(user)} color={user.is_head ? "warning" : "default"} title={user.is_head ? "ปลดจากหัวหน้า" : "แต่งตั้งเป็นหัวหน้า"}>
                                                  {user.is_head ? <Star /> : <StarBorder />}
                                              </IconButton>
                                          </TableCell>
                                          <TableCell>
                                              <Stack direction="row" alignItems="center" spacing={2}>
                                                  <Avatar sx={{ bgcolor: user.is_head ? '#FBC02D' : (user.role === 'ADMIN' ? '#D32F2F' : '#90A4AE') }}>
                                                      {user.is_head ? <Star sx={{ color: 'white', fontSize: 16 }} /> : user.nickname?.[0]}
                                                  </Avatar>
                                                  <Box>
                                                      <Typography fontWeight={600}>{user.first_name} {user.last_name} ({user.nickname})</Typography>
                                                      <Typography variant="caption" color="text.secondary">ID: {user.employee_id}</Typography>
                                                  </Box>
                                              </Stack>
                                          </TableCell>
                                          <TableCell>
                                              <Chip label={user.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : (user.is_head ? 'หัวหน้าฝ่าย' : 'พนักงาน')} size="small" color={user.role === 'ADMIN' ? 'error' : (user.is_head ? 'warning' : 'default')} variant={user.is_head ? 'filled' : 'outlined'} />
                                          </TableCell>
                                          <TableCell>{user.phone_number || '-'}</TableCell>
                                          <TableCell align="center">
                                              <Stack direction="row" spacing={1} justifyContent="center">
                                                <IconButton color="primary" onClick={() => handleViewUser(user)} title="ดูงาน"><Visibility /></IconButton>
                                                <IconButton color="error" onClick={() => handleDeleteUser(user)} disabled={user.user_id === currentUser?.id} title="ลบผู้ใช้"><DeleteIcon /></IconButton>
                                              </Stack>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                                  {deptUsers.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>ยังไม่มีพนักงานในฝ่ายนี้</TableCell></TableRow>}
                              </TableBody>
                          </Table>
                      </TableContainer>
                  </AccordionDetails>
              </Accordion>
          );
      })}

      <Dialog open={!!selectedUser} onClose={() => setSelectedUser(null)} fullWidth maxWidth="md">
          <DialogTitle sx={{ bgcolor: '#455A64', color: 'white' }}>
              งานของ: {selectedUser?.nickname} ({selectedUser?.employee_id})
          </DialogTitle>
          <DialogContent sx={{ pt: 3, bgcolor: '#F5F5F5' }}>
              <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>รายการงานทั้งหมด ({userJobs.length})</Typography>
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