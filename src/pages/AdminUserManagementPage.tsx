import React, { useEffect, useState } from 'react';
import { 
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Stack, IconButton, Avatar, Box, Select, MenuItem,
  FormControl, InputLabel, Button, Grid, Divider, TextField, InputAdornment
} from '@mui/material';
import { supabase } from '../supabaseClient';
import { 
    Delete as DeleteIcon, Assignment as AssignmentIcon, Edit as EditIcon,
    Info as InfoIcon, Phone, Badge, Person, Work, Key, Save
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { confirmAction, showSuccess, showError } from '../utils/alertUtils';

// ฟังก์ชันช่วยเลือกสีสถานะงาน
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
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState(0);

  // Dialog States
  const [viewProfile, setViewProfile] = useState<any>(null); // ดูประวัติ
  const [selectedUserForJobs, setSelectedUserForJobs] = useState<any>(null); // ดูงาน
  const [userJobs, setUserJobs] = useState<any[]>([]);
  
  // --- [NEW] State สำหรับแก้ไขข้อมูล ---
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
      first_name: '', last_name: '', nickname: '', phone_number: '', employee_id: '',
      department_id: '', role: '', new_password: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    // 1. ดึงข้อมูลแผนก (เหมือนเดิม)
    const { data: depts } = await supabase.from('Departments').select('*');
    setDepartments(depts || []);

    // 2. ดึงข้อมูล User (Profiles) แบบมีเงื่อนไขใหม่ ✅
    const { data: userList, error } = await supabase
        .from('Profiles')
        .select('*')
        .eq('approval_status', 'APPROVED')   // <--- เพิ่มบรรทัดนี้: เอาเฉพาะคนที่อนุมัติแล้ว
        .neq('role', 'ADMIN')                // <--- เพิ่มบรรทัดนี้: ไม่เอาคนที่เป็น ADMIN
        .order('created_at', { ascending: true });

    if (!error) setUsers(userList || []);
  };

  const fetchUserJobs = async (userId: string) => {
      const { data } = await supabase.from('JobAssignments').select('job_id, Jobs(*)').eq('user_id', userId).order('id', { ascending: false });
      const jobs = data?.map((item: any) => item.Jobs).filter((j: any) => j !== null) || [];
      setUserJobs(jobs);
  };

  const handleOpenJobs = (user: any) => { setSelectedUserForJobs(user); fetchUserJobs(user.user_id); };

  const handleDeleteUser = async (userId: string) => {
      if (!(await confirmAction('ลบพนักงาน?', 'การลบนี้จะไม่สามารถกู้คืนได้'))) return;
      const { error } = await supabase.from('Profiles').delete().eq('user_id', userId);
      if (error) showError('ลบไม่สำเร็จ', error.message); else { showSuccess('ลบเรียบร้อย'); fetchData(); }
  };

  // --- [NEW] ฟังก์ชันเปิดหน้าต่างแก้ไข ---
  const handleOpenEdit = (user: any) => {
      setEditUser(user);
      setEditForm({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          nickname: user.nickname || '',
          phone_number: user.phone_number || '',
          employee_id: user.employee_id || '',
          department_id: user.department_id || '',
          role: user.role || 'USER',
          new_password: '' // เริ่มต้นเป็นค่าว่าง
      });
  };

  // --- [NEW] ฟังก์ชันบันทึกการแก้ไข ---
  const handleSaveEdit = async () => {
      if (!editUser) return;
      if (!(await confirmAction('ยืนยันการแก้ไข', 'ข้อมูลจะถูกบันทึกลงระบบ'))) return;

      try {
          // 1. อัปเดตข้อมูลทั่วไปในตาราง Profiles
          const updates = {
              first_name: editForm.first_name,
              last_name: editForm.last_name,
              nickname: editForm.nickname,
              phone_number: editForm.phone_number,
              employee_id: editForm.employee_id,
              department_id: Number(editForm.department_id),
              role: editForm.role
          };

          const { error } = await supabase.from('Profiles').update(updates).eq('user_id', editUser.user_id);
          if (error) throw error;

          // 2. ถ้ามีการกรอกรหัสผ่านใหม่ ให้เรียกฟังก์ชันรีเซ็ต (RPC)
          if (editForm.new_password.trim() !== '') {
              const { error: pwdError } = await supabase.rpc('admin_reset_password', {
                  target_user_id: editUser.user_id,
                  new_password: editForm.new_password
              });
              if (pwdError) {
                  console.error(pwdError);
                  showError("เปลี่ยนรหัสผ่านไม่สำเร็จ", "กรุณาตรวจสอบว่าได้สร้างฟังก์ชัน SQL แล้วหรือไม่");
                  return;
              }
          }

          showSuccess("บันทึกข้อมูลเรียบร้อย");
          setEditUser(null);
          fetchData(); // โหลดข้อมูลใหม่

      } catch (err: any) {
          showError("เกิดข้อผิดพลาด", err.message);
      }
  };

  const filteredUsers = users.filter(u => filterDept === 0 || u.department_id === filterDept);
  const InfoRow = ({ icon, label, value }: any) => (<Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}><Box sx={{ mr: 2, color: 'text.secondary', mt: 0.5 }}>{icon}</Box><Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body1" fontWeight={500}>{value || '-'}</Typography></Box></Box>);

  return (
    <Layout title="จัดการพนักงาน">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">รายชื่อพนักงาน</Typography>
          <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white' }}>
              <InputLabel>กรองตามฝ่าย</InputLabel>
              <Select value={filterDept} label="กรองตามฝ่าย" onChange={(e) => setFilterDept(Number(e.target.value))}>
                  <MenuItem value={0}>-- ดูทั้งหมด --</MenuItem>
                  {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
          </FormControl>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
          <Table>
              <TableHead sx={{ bgcolor: '#424242' }}>
                  <TableRow>
                      <TableCell sx={{ color: 'white', width: 60 }}></TableCell>
                      <TableCell sx={{ color: 'white' }}>ชื่อ-นามสกุล (ชื่อเล่น)</TableCell>
                      <TableCell sx={{ color: 'white' }}>แผนก/ตำแหน่ง</TableCell>
                      <TableCell align="center" sx={{ color: 'white' }}>ดูข้อมูล</TableCell>
                      <TableCell align="center" sx={{ color: 'white' }}>จัดการ</TableCell>
                  </TableRow>
              </TableHead>
              <TableBody>
                  {filteredUsers.map((user) => {
                      const deptName = departments.find(d => d.id === user.department_id)?.name || '-';
                      return (
                          <TableRow key={user.user_id} hover>
                              <TableCell><Avatar sx={{ bgcolor: user.role === 'ADMIN' ? '#D32F2F' : '#1976D2' }}>{user.nickname?.[0] || user.first_name?.[0]}</Avatar></TableCell>
                              <TableCell>
                                  <Typography fontWeight="bold">{user.first_name} {user.last_name}</Typography>
                                  <Typography variant="caption" color="text.secondary">ชื่อเล่น: {user.nickname}</Typography>
                              </TableCell>
                              <TableCell>
                                  <Chip label={deptName} size="small" sx={{ mr: 1 }} />
                                  {user.role === 'ADMIN' && <Chip label="ADMIN" color="error" size="small" />}
                              </TableCell>
                              <TableCell align="center">
                                  <Stack direction="row" spacing={1} justifyContent="center">
                                      <Button variant="outlined" size="small" startIcon={<InfoIcon />} onClick={() => setViewProfile(user)}>ประวัติ</Button>
                                      <Button variant="outlined" size="small" color="secondary" startIcon={<AssignmentIcon />} onClick={() => handleOpenJobs(user)}>งาน</Button>
                                  </Stack>
                              </TableCell>
                              <TableCell align="center">
                                  <Stack direction="row" spacing={1} justifyContent="center">
                                      {/* [NEW] ปุ่มแก้ไข */}
                                      <IconButton color="primary" size="small" onClick={() => handleOpenEdit(user)} sx={{ border: '1px solid #BBDEFB', bgcolor: '#E3F2FD' }}>
                                          <EditIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton color="error" size="small" onClick={() => handleDeleteUser(user.user_id)}>
                                          <DeleteIcon fontSize="small" />
                                      </IconButton>
                                  </Stack>
                              </TableCell>
                          </TableRow>
                      );
                  })}
                  {filteredUsers.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>ไม่พบข้อมูลพนักงาน</TableCell></TableRow>}
              </TableBody>
          </Table>
      </TableContainer>

      {/* --- Dialog 1: ดูประวัติ (Info) --- */}
      <Dialog open={!!viewProfile} onClose={() => setViewProfile(null)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ bgcolor: '#1976D2', color: 'white', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={viewProfile?.avatar_url} sx={{ width: 50, height: 50, bgcolor: 'white', color: '#1976D2' }}>{viewProfile?.nickname?.[0]}</Avatar>
              <Box><Typography variant="h6">ข้อมูลพนักงาน</Typography><Typography variant="body2" sx={{ opacity: 0.8 }}>รหัสพนักงาน: {viewProfile?.employee_id || '-'}</Typography></Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 4 }}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid size={12}><Divider textAlign="left"><Chip label="ข้อมูลส่วนตัว" /></Divider></Grid>
                  <Grid size={6}><InfoRow icon={<Person />} label="ชื่อ-นามสกุล" value={`${viewProfile?.first_name} ${viewProfile?.last_name}`} /></Grid>
                  <Grid size={6}><InfoRow icon={<Person />} label="ชื่อเล่น" value={viewProfile?.nickname} /></Grid>
                  <Grid size={6}><InfoRow icon={<Phone />} label="เบอร์โทรศัพท์" value={viewProfile?.phone_number} /></Grid>
                  <Grid size={6}><InfoRow icon={<Badge />} label="รหัสพนักงาน" value={viewProfile?.employee_id} /></Grid>
                  <Grid size={12} sx={{ mt: 2 }}><Divider textAlign="left"><Chip label="ข้อมูลระบบ" /></Divider></Grid>
                  <Grid size={6}><InfoRow icon={<Work />} label="Username" value={viewProfile?.username || '-'} /></Grid>
                  <Grid size={6}><InfoRow icon={<Work />} label="ตำแหน่ง/สิทธิ์" value={viewProfile?.role} /></Grid>
                  <Grid size={6}><InfoRow icon={<Work />} label="สังกัดฝ่าย" value={departments.find(d => d.id === viewProfile?.department_id)?.name} /></Grid>
                  <Grid size={6}><InfoRow icon={<Work />} label="สถานะบัญชี" value={viewProfile?.approval_status} /></Grid>
              </Grid>
          </DialogContent>
          <DialogActions><Button onClick={() => setViewProfile(null)} variant="contained">ปิด</Button></DialogActions>
      </Dialog>

      {/* --- [NEW] Dialog 3: แก้ไขข้อมูล (Edit & Reset Password) --- */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ bgcolor: '#ED6C02', color: 'white', display: 'flex', gap: 1, alignItems: 'center' }}>
             <EditIcon /> แก้ไขข้อมูลพนักงาน
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                  <Divider sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>ข้อมูลทั่วไป</Divider>
                  <Stack direction="row" spacing={2}>
                      <TextField label="ชื่อจริง" fullWidth value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} size="small" />
                      <TextField label="นามสกุล" fullWidth value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} size="small" />
                  </Stack>
                  <Stack direction="row" spacing={2}>
                      <TextField label="ชื่อเล่น" fullWidth value={editForm.nickname} onChange={e => setEditForm({...editForm, nickname: e.target.value})} size="small" />
                      <TextField label="รหัสพนักงาน" fullWidth value={editForm.employee_id} onChange={e => setEditForm({...editForm, employee_id: e.target.value})} size="small" />
                  </Stack>
                  <TextField label="เบอร์โทรศัพท์" fullWidth value={editForm.phone_number} onChange={e => setEditForm({...editForm, phone_number: e.target.value})} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment> }} />

                  {/* ✅ แก้ไขตรงนี้: เปลี่ยนหัวข้อ และลบตัวเลือกตำแหน่งออก เหลือแค่แผนก */}
                  <Divider sx={{ color: 'text.secondary', fontSize: '0.9rem', pt: 1 }}>สังกัดฝ่าย</Divider>
                  
                  <FormControl fullWidth size="small">
                      <InputLabel>แผนก</InputLabel>
                      <Select value={editForm.department_id} label="แผนก" onChange={(e) => setEditForm({...editForm, department_id: e.target.value})}>
                          {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                      </Select>
                  </FormControl>

                  {/* ส่วนรีเซ็ตรหัสผ่าน (คงไว้เหมือนเดิม) */}
                  <Box sx={{ bgcolor: '#FFF3E0', p: 2, borderRadius: 2, border: '1px dashed #FFB74D', mt: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                          <Key color="warning" />
                          <Typography variant="subtitle2" fontWeight="bold">เปลี่ยนรหัสผ่าน (Reset Password)</Typography>
                      </Stack>
                      <TextField 
                        label="รหัสผ่านใหม่ (ระบุเฉพาะตอนเปลี่ยน)" 
                        placeholder="ปล่อยว่างไว้ถ้าไม่ต้องการเปลี่ยน" 
                        fullWidth 
                        size="small" 
                        type="text" 
                        value={editForm.new_password} 
                        onChange={e => setEditForm({...editForm, new_password: e.target.value})}
                        sx={{ bgcolor: 'white' }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          * เมื่อกดบันทึก พนักงานจะต้องใช้รหัสผ่านใหม่นี้ในการเข้าสู่ระบบทันที
                      </Typography>
                  </Box>
              </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setEditUser(null)} color="inherit">ยกเลิก</Button>
              <Button onClick={handleSaveEdit} variant="contained" color="warning" startIcon={<Save />}>บันทึกการแก้ไข</Button>
          </DialogActions>
      </Dialog>

      {/* --- Dialog 2: ดูงาน (เหมือนเดิม) --- */}
      <Dialog open={!!selectedUserForJobs} onClose={() => setSelectedUserForJobs(null)} fullWidth maxWidth="md">
          <DialogTitle sx={{ bgcolor: '#424242', color: 'white' }}>ประวัติงาน: {selectedUserForJobs?.nickname}</DialogTitle>
          <DialogContent sx={{ pt: 3, bgcolor: '#F5F5F5' }}>
              <Stack spacing={2} sx={{ mt: 2 }}>
                  {userJobs.map(job => {
                      const statusConfig = getJobStatusConfig(job.status);
                      return (
                          <Paper key={job.id} sx={{ p: 2, borderLeft: `6px solid ${statusConfig.color}` }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Box><Typography fontWeight="bold">{job.title}</Typography><Typography variant="caption" color="text.secondary">{new Date(job.start_time).toLocaleDateString('th-TH')} | {job.customer_name}</Typography></Box>
                                  <Chip label={statusConfig.label} sx={{ bgcolor: statusConfig.bgcolor, color: statusConfig.color }} size="small" />
                              </Stack>
                          </Paper>
                      );
                  })}
                  {userJobs.length === 0 && <Typography align="center" py={4} color="text.secondary">- ยังไม่มีงาน -</Typography>}
              </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setSelectedUserForJobs(null)}>ปิด</Button></DialogActions>
      </Dialog>
    </Layout>
  );
}
export default AdminUserManagementPage;