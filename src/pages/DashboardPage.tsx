import React, { useEffect, useState } from 'react';
import { 
  Typography, Button, Box, Paper, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack,
  ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  MenuItem, Select, InputLabel, FormControl, IconButton, Avatar
} from '@mui/material';
import { 
  CalendarMonth as CalendarIcon, List as ListIcon, CheckCircle as CheckIcon, 
  Cancel as CancelIcon, PlayArrow as PlayIcon, Done as DoneIcon,
  Edit as EditIcon, Delete as DeleteIcon,
  Add as AddIcon, LocationOn as LocationIcon, Image as ImageIcon,
  Person as PersonIcon, Phone as PhoneIcon
} from '@mui/icons-material'; 
import { supabase } from '../supabaseClient';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { confirmAction, showSuccess, showError } from '../utils/alertUtils';
import Layout from '../components/Layout';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return '#D32F2F';
    case 'IN_PROGRESS': return '#ED6C02';
    case 'WAITING_REVIEW': return '#0288D1';
    case 'APPROVED': return '#2E7D32';
    default: return '#9E9E9E';
  }
};

const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'รอดำเนินการ';
      case 'IN_PROGRESS': return 'กำลังดำเนินการ';
      case 'WAITING_REVIEW': return 'รอตรวจงาน';
      case 'APPROVED': return 'เสร็จสมบูรณ์';
      default: return status;
    }
};

function DashboardPage() {
  // ลบ navigate ออก เพราะ Layout จัดการเรื่อง redirect ให้แล้ว
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]); 
  const [users, setUsers] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('table'); 

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', location: '', description: '', start_time: '', end_time: '', assigned_to: '', customer_name: '', customer_phone: '' });
  
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editJob, setEditJob] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from('Profiles').select('*').eq('user_id', user.id).single();
      setProfile(profileData);

      fetchJobs();
      fetchUsers();
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchJobs = async () => {
    const { data, error } = await supabase
        .from('Jobs').select('*, Profiles:assigned_to (nickname)').order('id', { ascending: false });
    if (error) console.error(error); else setJobs(data || []);
  };

  const fetchUsers = async () => {
      const { data } = await supabase.from('Profiles').select('*').eq('approval_status', 'APPROVED');
      setUsers(data || []);
  };

  const handleCreateJob = async () => {
    if (!newJob.title || !newJob.start_time || !newJob.end_time || !newJob.location) {
      showError("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน"); return;
    }
    if (!(await confirmAction('ยืนยันการมอบหมาย', `สร้างงาน "${newJob.title}"?`))) return;

    const { error } = await supabase.from('Jobs').insert([{
        title: newJob.title, 
        location: newJob.location, 
        description: newJob.description,
        start_time: new Date(newJob.start_time).toISOString(),
        end_time: new Date(newJob.end_time).toISOString(),
        status: 'PENDING', 
        assigned_to: newJob.assigned_to || null,
        customer_name: newJob.customer_name,
        customer_phone: newJob.customer_phone
    }]);

    if (!error) {
      showSuccess("สร้างงานสำเร็จ"); setOpenCreateDialog(false); fetchJobs();
      setNewJob({ title: '', location: '', description: '', start_time: '', end_time: '', assigned_to: '', customer_name: '', customer_phone: '' });
    } else { showError("เกิดข้อผิดพลาด", error.message); }
  };

  const handleUpdateJob = async () => {
      if (!(await confirmAction('บันทึกการแก้ไข?', 'ข้อมูลเดิมจะถูกเปลี่ยนแปลง'))) return;
      const { error } = await supabase.from('Jobs').update({
            title: editJob.title, 
            location: editJob.location, 
            description: editJob.description,
            start_time: new Date(editJob.start_time).toISOString(),
            end_time: new Date(editJob.end_time).toISOString(),
            assigned_to: editJob.assigned_to || null,
            customer_name: editJob.customer_name,
            customer_phone: editJob.customer_phone
        }).eq('id', editJob.id);
      if (!error) {
          showSuccess("แก้ไขสำเร็จ"); setOpenEditDialog(false); setOpenDetailDialog(false); fetchJobs();
      } else { showError("เกิดข้อผิดพลาด", error.message); }
  };

  const handleDeleteJob = async () => { 
      if(!selectedJob) return; 
      if(!(await confirmAction('ลบงานถาวร?', `ลบงาน "${selectedJob.title}"?`, 'ลบเลย', '#D32F2F'))) return; 
      const { error } = await supabase.from('Jobs').delete().eq('id', selectedJob.id); 
      if (!error) { showSuccess("ลบงานเรียบร้อย"); setOpenDetailDialog(false); fetchJobs(); } else { showError("ลบไม่ได้", error.message); }
  };
  
  const updateJobStatus = async (id:any, status:any, msg: string) => { 
      if (!(await confirmAction('เปลี่ยนสถานะ', msg))) return;
      const { error } = await supabase.from('Jobs').update({status}).eq('id', id); 
      if (!error) { showSuccess("อัปเดตสถานะแล้ว"); fetchJobs(); setOpenDetailDialog(false); }
  };

  const calendarEvents = jobs.map((job: any) => ({ id: job.id, title: job.title, start: job.start_time, end: job.end_time, color: getStatusColor(job.status), extendedProps: { ...job } }));
  const handleEventClick = (info: any) => { 
    openJobDetail(info.event.extendedProps); 
  };
  const openJobDetail = (job: any) => { 
    setSelectedJob({ 
        ...job, 
        start_formatted: new Date(job.start_time).toLocaleString('th-TH'), 
        end_formatted: new Date(job.end_time).toLocaleString('th-TH') 
    }); 
    setOpenDetailDialog(true); 
  }
  const openEditForm = () => { 
      setEditJob({ 
          ...selectedJob, 
          start_time: selectedJob.start_time.substring(0, 16), 
          end_time: selectedJob.end_time.substring(0, 16) 
      }); 
      setOpenEditDialog(true); 
  };

  return (
    <Layout title="หน้าหลัก">
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', md: 'center' }} mb={4} spacing={2}>
        <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>ตารางงานรวม</Typography>
            <Typography variant="subtitle1" color="text.secondary">ภาพรวมการดำเนินงานทั้งหมด</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
            <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)}>
                <ToggleButton value="table"><ListIcon /> ตาราง</ToggleButton>
                <ToggleButton value="calendar"><CalendarIcon /> ปฏิทิน</ToggleButton>
            </ToggleButtonGroup>
            {profile?.role === 'ADMIN' && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreateDialog(true)} sx={{ px: 3, bgcolor: '#D32F2F' }}>สร้างงานใหม่</Button>
            )}
        </Box>
      </Stack>

      <Paper sx={{ p: 0, borderRadius: 3, overflow: 'hidden' }}>
        {viewMode === 'calendar' ? (
            <Box sx={{ p: 3 }}>
                <FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" events={calendarEvents} eventClick={handleEventClick} height="auto" />
            </Box>
        ) : (
            <TableContainer>
                <Table>
                    <TableHead sx={{ bgcolor: '#FAFAFA' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>ชื่องาน</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>ลูกค้า</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>สถานที่</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>ผู้รับผิดชอบ</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>สถานะ</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>เวลา</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>จัดการ</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {jobs.map((job) => (
                            <TableRow key={job.id} hover>
                                <TableCell sx={{ fontWeight: 600 }}>{job.title}</TableCell>
                                <TableCell>
                                    {job.customer_name ? (
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">{job.customer_name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{job.customer_phone}</Typography>
                                        </Box>
                                    ) : "-"}
                                </TableCell>
                                <TableCell><Stack direction="row" alignItems="center" spacing={0.5}><LocationIcon fontSize="small" color="action" /><Typography variant="body2">{job.location || '-'}</Typography></Stack></TableCell>
                                <TableCell>{job.Profiles ? (<Chip avatar={<Avatar sx={{ width: 24, height: 24 }}>{job.Profiles.nickname[0]}</Avatar>} label={job.Profiles.nickname} size="small" variant="outlined" />) : "-"}</TableCell>
                                <TableCell><Chip label={getStatusLabel(job.status)} size="small" sx={{ bgcolor: getStatusColor(job.status), color: 'white', fontWeight: 'bold' }} /></TableCell>
                                <TableCell>
                                     <Typography variant="body2">{new Date(job.start_time).toLocaleDateString('th-TH')}</Typography>
                                     <Typography variant="caption" color="text.secondary">{new Date(job.start_time).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})} - {new Date(job.end_time).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</Typography>
                                </TableCell>
                                <TableCell align="center"><IconButton size="small" onClick={() => openJobDetail(job)} color="primary"><ListIcon /></IconButton></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        )}
      </Paper>
      
      {/* Dialog สร้างงาน */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} fullWidth maxWidth="md">
         <DialogTitle sx={{ bgcolor: '#D32F2F', color: 'white' }}>สร้างงานใหม่</DialogTitle>
         <DialogContent sx={{ pt: 3 }}>
             <Stack spacing={2} sx={{ mt: 1 }}>
                 <TextField label="ชื่องาน" fullWidth value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} placeholder="เช่น ล้างแอร์, ซ่อมไฟ" />
                 
                 <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField label="ชื่อลูกค้า" fullWidth value={newJob.customer_name} onChange={e => setNewJob({...newJob, customer_name: e.target.value})} InputProps={{ startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} /> }} />
                    <TextField label="เบอร์โทรศัพท์" fullWidth value={newJob.customer_phone} onChange={e => setNewJob({...newJob, customer_phone: e.target.value})} InputProps={{ startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} /> }} />
                 </Stack>

                 <TextField label="สถานที่ปฏิบัติงาน" fullWidth value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} InputProps={{ startAdornment: <LocationIcon color="action" sx={{ mr: 1 }} /> }} />
                 
                 <FormControl fullWidth>
                    <InputLabel>มอบหมายให้ (ผู้รับผิดชอบ)</InputLabel>
                    <Select value={newJob.assigned_to} label="มอบหมายให้ (ผู้รับผิดชอบ)" onChange={e => setNewJob({...newJob, assigned_to: e.target.value})}>
                        <MenuItem value=""><em>ไม่ระบุ</em></MenuItem>
                        {users.map(u => <MenuItem key={u.user_id} value={u.user_id}>{u.nickname} ({u.department})</MenuItem>)}
                    </Select>
                 </FormControl>
                 <TextField label="รายละเอียดเพิ่มเติม" multiline rows={3} fullWidth value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} />
                 <Stack direction="row" spacing={2}>
                    <TextField type="datetime-local" label="เวลาเริ่ม" fullWidth InputLabelProps={{shrink:true}} value={newJob.start_time} onChange={e => setNewJob({...newJob, start_time: e.target.value})} />
                    <TextField type="datetime-local" label="จบ" fullWidth InputLabelProps={{shrink:true}} value={newJob.end_time} onChange={e => setNewJob({...newJob, end_time: e.target.value})} />
                 </Stack>
             </Stack>
         </DialogContent>
         <DialogActions sx={{ p: 2 }}>
             <Button onClick={() => setOpenCreateDialog(false)} color="inherit">ยกเลิก</Button>
             <Button variant="contained" onClick={handleCreateJob}>บันทึก</Button>
         </DialogActions>
      </Dialog>

      {/* Dialog แก้ไขงาน */}
       <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="md">
         <DialogTitle sx={{ bgcolor: '#455A64', color: 'white' }}>แก้ไขงาน</DialogTitle>
         <DialogContent sx={{ pt: 3 }}>
            {editJob && (
             <Stack spacing={2} sx={{ mt: 1 }}>
                 <TextField label="ชื่องาน" fullWidth value={editJob.title} onChange={e => setEditJob({...editJob, title: e.target.value})} />
                 
                 <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField label="ชื่อลูกค้า" fullWidth value={editJob.customer_name} onChange={e => setEditJob({...editJob, customer_name: e.target.value})} />
                    <TextField label="เบอร์โทรศัพท์" fullWidth value={editJob.customer_phone} onChange={e => setEditJob({...editJob, customer_phone: e.target.value})} />
                 </Stack>

                 <TextField label="สถานที่" fullWidth value={editJob.location} onChange={e => setEditJob({...editJob, location: e.target.value})} />
                 <FormControl fullWidth>
                    <InputLabel>มอบหมายให้</InputLabel>
                    <Select value={editJob.assigned_to || ''} label="มอบหมายให้" onChange={e => setEditJob({...editJob, assigned_to: e.target.value})}>
                        <MenuItem value=""><em>ไม่ระบุ</em></MenuItem>
                        {users.map(u => <MenuItem key={u.user_id} value={u.user_id}>{u.nickname}</MenuItem>)}
                    </Select>
                 </FormControl>
                 <TextField label="รายละเอียด" multiline rows={3} fullWidth value={editJob.description} onChange={e => setEditJob({...editJob, description: e.target.value})} />
                 <Stack direction="row" spacing={2}>
                    <TextField type="datetime-local" label="เริ่ม" fullWidth InputLabelProps={{shrink:true}} value={editJob.start_time} onChange={e => setEditJob({...editJob, start_time: e.target.value})} />
                    <TextField type="datetime-local" label="จบ" fullWidth InputLabelProps={{shrink:true}} value={editJob.end_time} onChange={e => setEditJob({...editJob, end_time: e.target.value})} />
                 </Stack>
             </Stack>
            )}
         </DialogContent>
         <DialogActions sx={{ p: 2 }}>
             <Button onClick={() => setOpenEditDialog(false)} color="inherit">ยกเลิก</Button>
             <Button variant="contained" onClick={handleUpdateJob}>บันทึก</Button>
         </DialogActions>
      </Dialog>

      {/* Dialog รายละเอียด */}
      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
          <Box sx={{ bgcolor: selectedJob ? getStatusColor(selectedJob.status) : 'grey', height: 8, width: '100%' }} />
          <DialogTitle sx={{ pb: 1 }}>
              <Typography variant="h5" fontWeight="bold">{selectedJob?.title}</Typography>
              <Stack direction="row" alignItems="center" spacing={1} mt={1}><LocationIcon fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">{selectedJob?.location || 'ไม่ระบุสถานที่'}</Typography></Stack>
          </DialogTitle>
          <DialogContent>
              {selectedJob && (
                  <Stack spacing={3} sx={{ mt: 1 }}>
                      <Box sx={{ p: 2, bgcolor: '#FFF3E0', borderRadius: 2, border: '1px solid #FFE0B2' }}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                              <PersonIcon color="warning" />
                              <Typography variant="subtitle2" fontWeight="bold">ข้อมูลลูกค้า</Typography>
                          </Stack>
                          <Typography variant="body1">คุณ {selectedJob.customer_name || '-'}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                              <PhoneIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">{selectedJob.customer_phone || '-'}</Typography>
                          </Stack>
                      </Box>

                      <Box sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2 }}>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{selectedJob.description || "-"}</Typography>
                      </Box>
                      
                      {selectedJob.image_url && (
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                <ImageIcon color="action" />
                                <Typography variant="subtitle2">รูปภาพส่งงาน:</Typography>
                            </Stack>
                            <a href={selectedJob.image_url} target="_blank" rel="noreferrer">
                                <img src={selectedJob.image_url} alt="หลักฐานงาน" style={{ width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} />
                            </a>
                        </Box>
                      )}

                      <Stack direction="row" justifyContent="space-between">
                          <Box><Typography variant="caption" color="text.secondary">ผู้รับผิดชอบ</Typography><Typography variant="body1" fontWeight={600}>{selectedJob.Profiles?.nickname || 'ไม่ระบุ'}</Typography></Box>
                          <Box sx={{ textAlign: 'right' }}><Typography variant="caption" color="text.secondary">เวลานัดหมาย</Typography><Typography variant="body2">{selectedJob.start_formatted} - {selectedJob.end_formatted}</Typography></Box>
                      </Stack>
                      <Box sx={{ my: 1, borderTop: '1px solid #eee' }} />
                      <Box>
                        <Typography variant="subtitle2" gutterBottom align="center" color="text.secondary">จัดการสถานะ</Typography>
                        <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                            {selectedJob.status === 'PENDING' && <Button variant="contained" color="warning" startIcon={<PlayIcon />} onClick={() => updateJobStatus(selectedJob.id, 'IN_PROGRESS', 'ยืนยันเริ่มงาน?')}>เริ่มงาน</Button>}
                            {selectedJob.status === 'IN_PROGRESS' && <Button variant="contained" sx={{ bgcolor: '#1976D2' }} startIcon={<DoneIcon />} onClick={() => updateJobStatus(selectedJob.id, 'WAITING_REVIEW', 'ยืนยันส่งงาน?')}>ส่งตรวจ</Button>}
                            {selectedJob.status === 'WAITING_REVIEW' && profile?.role === 'ADMIN' && (
                                <><Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => updateJobStatus(selectedJob.id, 'PENDING', 'ตีกลับงาน?')}>ตีกลับ</Button>
                                <Button variant="contained" color="success" startIcon={<CheckIcon />} onClick={() => updateJobStatus(selectedJob.id, 'APPROVED', 'อนุมัติงาน?')}>อนุมัติ</Button></>
                            )}
                            {selectedJob.status === 'APPROVED' && <Chip icon={<CheckIcon />} label="เสร็จสมบูรณ์" color="success" variant="outlined" />}
                        </Stack>
                      </Box>
                  </Stack>
              )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
              {profile?.role === 'ADMIN' ? (
                <Stack direction="row" spacing={1}><Button color="error" startIcon={<DeleteIcon />} onClick={handleDeleteJob}>ลบ</Button><Button color="inherit" startIcon={<EditIcon />} onClick={openEditForm}>แก้ไข</Button></Stack>
              ) : <Box />}
              <Button variant="outlined" onClick={() => setOpenDetailDialog(false)}>ปิด</Button>
          </DialogActions>
      </Dialog>
    </Layout>
  );
}
export default DashboardPage;