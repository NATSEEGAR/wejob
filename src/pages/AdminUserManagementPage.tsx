import React, { useEffect, useState } from 'react';
import { 
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Dialog, DialogTitle, DialogContent, Chip, Stack, IconButton, Avatar, Box, Select, MenuItem,
  FormControl, InputLabel, Accordion, AccordionSummary, AccordionDetails, Button       // ✅ เพิ่มตรงนี้
} from '@mui/material';
import { supabase } from '../supabaseClient';
import { Visibility, Delete as DeleteIcon, ExpandMore, Star, StarBorder } from '@mui/icons-material';
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
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userJobs, setUserJobs] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState(0);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);
      const { data: depts } = await supabase.from('Departments').select('*').order('id');
      setDepartments(depts || []);
      const { data: profiles } = await supabase.from('Profiles').select('*, Departments(name)').eq('approval_status', 'APPROVED').order('department_id', { ascending: true }).order('is_head', { ascending: false });
      setUsers(profiles || []);
  };

  const handleToggleHead = async (user: any) => {
      const isPromoting = !user.is_head;
      if (isPromoting) {
          const currentHead = users.find(u => u.department_id === user.department_id && u.is_head);
          if (currentHead) {
              if (!(await confirmAction('เปลี่ยนหัวหน้าฝ่าย?', `ฝ่ายนี้มีหัวหน้าแล้ว`))) return;
              await supabase.from('Profiles').update({ is_head: false }).eq('user_id', currentHead.user_id);
          } else {
              if (!(await confirmAction('ยืนยันการแต่งตั้ง', `แต่งตั้ง ${user.nickname} เป็นหัวหน้า?`))) return;
          }
      } else {
          if (!(await confirmAction('ยืนยันการปลด', `ปลด ${user.nickname}?`))) return;
      }
      const { error } = await supabase.from('Profiles').update({ is_head: isPromoting }).eq('user_id', user.user_id);
      if (!error) { showSuccess("บันทึกเรียบร้อย"); fetchData(); } else { showError("Error", error.message); }
  };

  const handleViewUser = async (user: any) => {
    setSelectedUser(user);
    // [FIX] ดึงงานจาก JobAssignments เพื่อให้เห็นงานทั้งหมดที่คนนี้รับผิดชอบ
    const { data } = await supabase
      .from('JobAssignments')
      .select('job_id, Jobs:job_id(*)')
      .eq('user_id', user.user_id)
      .order('id', { ascending: false });
      
    const jobs = data?.map((item: any) => item.Jobs).filter((j: any) => j !== null) || [];
    // เรียงตาม ID ล่าสุด
    jobs.sort((a:any, b:any) => b.id - a.id);
    setUserJobs(jobs);
  };

  const handleDeleteUser = async (targetUser: any) => {
      if (targetUser.user_id === currentUser.id) { showError("Error", "ลบตัวเองไม่ได้"); return; }
      if (await confirmAction(`ลบ ${targetUser.nickname}?`, `ข้อมูลหายถาวร`, 'ลบเลย', '#D32F2F')) {
          const { error } = await supabase.rpc('delete_user_account', { user_id_to_delete: targetUser.user_id });
          if (!error) { showSuccess("ลบเรียบร้อย"); fetchData(); } else { 
              await supabase.from('Profiles').delete().eq('user_id', targetUser.user_id); fetchData();
          }
      }
  };

  const displayedDepartments = filterDept === 0 ? departments : departments.filter(d => d.id === filterDept);

  return (
    <Layout title="จัดการโครงสร้างองค์กร">
      {/* ... (Header, Filter, Accordion Code เหมือนเดิม - ละไว้เพื่อความกระชับ แต่ในไฟล์จริงต้องมี) ... */}
      {/* ผมขอใส่โค้ด Accordion เต็มๆ ให้เพื่อให้คุณก๊อปไปใช้ได้เลย */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <FormControl fullWidth size="small">
            <InputLabel>กรองตามฝ่าย</InputLabel>
            <Select value={filterDept} label="กรองตามฝ่าย" onChange={(e) => setFilterDept(Number(e.target.value))}>
                <MenuItem value={0}>-- ทุกฝ่าย --</MenuItem>
                {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </Select>
        </FormControl>
      </Paper>

      {displayedDepartments.map(dept => {
          const deptUsers = users.filter(u => u.department_id === dept.id);
          if (deptUsers.length === 0 && filterDept === 0) return null; 
          return (
              <Accordion key={dept.id} defaultExpanded sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#ECEFF1' }}>
                      <Typography fontWeight="bold">{dept.name} ({deptUsers.length})</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                      <TableContainer>
                          <Table>
                              <TableHead><TableRow><TableCell></TableCell><TableCell>ชื่อ</TableCell><TableCell>ตำแหน่ง</TableCell><TableCell align="center">จัดการ</TableCell></TableRow></TableHead>
                              <TableBody>
                                  {deptUsers.map(user => (
                                      <TableRow key={user.user_id} sx={{ bgcolor: user.is_head ? '#FFF8E1' : 'inherit' }}>
                                          <TableCell><IconButton onClick={() => handleToggleHead(user)} color={user.is_head ? "warning" : "default"}>{user.is_head ? <Star /> : <StarBorder />}</IconButton></TableCell>
                                          <TableCell><Stack direction="row" spacing={2} alignItems="center"><Avatar>{user.nickname?.[0]}</Avatar><Box><Typography fontWeight={600}>{user.nickname}</Typography><Typography variant="caption">{user.employee_id}</Typography></Box></Stack></TableCell>
                                          <TableCell><Chip label={user.role === 'ADMIN' ? 'แอดมิน' : (user.is_head ? 'หัวหน้า' : 'พนักงาน')} size="small" color={user.role === 'ADMIN' ? 'error' : 'default'} /></TableCell>
                                          <TableCell align="center"><IconButton color="primary" onClick={() => handleViewUser(user)}><Visibility /></IconButton><IconButton color="error" onClick={() => handleDeleteUser(user)} disabled={user.user_id === currentUser?.id}><DeleteIcon /></IconButton></TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </TableContainer>
                  </AccordionDetails>
              </Accordion>
          );
      })}

      <Dialog open={!!selectedUser} onClose={() => setSelectedUser(null)} fullWidth maxWidth="md">
          <DialogTitle>งานของ: {selectedUser?.nickname}</DialogTitle>
          <DialogContent sx={{ pt: 3, bgcolor: '#F5F5F5' }}>
              <Stack spacing={2}>
                  {userJobs.map(job => {
                      const statusConfig = getJobStatusConfig(job.status);
                      return (
                          <Paper key={job.id} sx={{ p: 2, borderLeft: `6px solid ${statusConfig.color}` }}>
                              <Stack direction="row" justifyContent="space-between">
                                  <Box><Typography fontWeight="bold">{job.title}</Typography><Typography variant="caption">{new Date(job.start_time).toLocaleDateString('th-TH')}</Typography></Box>
                                  <Chip label={statusConfig.label} sx={{ bgcolor: statusConfig.bgcolor, color: statusConfig.color }} />
                              </Stack>
                          </Paper>
                      );
                  })}
                  {userJobs.length === 0 && <Typography align="center" py={4} color="text.secondary">- ไม่มีงาน -</Typography>}
              </Stack>
          </DialogContent>
          <Box p={2} display="flex" justifyContent="flex-end"><Button onClick={() => setSelectedUser(null)}>ปิด</Button></Box>
      </Dialog>
    </Layout>
  );
}
export default AdminUserManagementPage;