import React, { useEffect, useState } from 'react';
import { 
  Typography, Button, Box, Paper, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack,
  ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  MenuItem, Select, InputLabel, FormControl, IconButton, Avatar, InputAdornment, OutlinedInput,
  AvatarGroup, Checkbox, ListItemText, FormControlLabel // <--- [FIX] เพิ่ม Checkbox, ListItemText, FormControlLabel
} from '@mui/material';
import { 
  CalendarMonth as CalendarIcon, List as ListIcon, CheckCircle as CheckIcon, 
  Cancel as CancelIcon, PlayArrow as PlayIcon, Done as DoneIcon,
  Edit as EditIcon, Delete as DeleteIcon,
  Add as AddIcon, LocationOn as LocationIcon, Image as ImageIcon,
  Person as PersonIcon, Phone as PhoneIcon, Search as SearchIcon,
  Map as MapIcon, FilterAlt as FilterIcon, Assignment as AssignmentIcon
  // [FIX] ลบ GroupsIcon ออกเพราะไม่ได้ใช้
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

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]); 
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [deptUsers, setDeptUsers] = useState<any[]>([]);
  
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('table'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [adminFilterDept, setAdminFilterDept] = useState<number>(0);
  const [showMyJobsOnly, setShowMyJobsOnly] = useState(false); 
  const [jobFeedback, setJobFeedback] = useState<any>(null); // เพิ่ม state สำหรับ feedback

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', location: '', map_url: '', description: '', start_time: '', end_time: '', assigned_to: [] as string[], customer_name: '', customer_phone: '', selected_depts: [] as number[], is_feedback_required: false });
  
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
      
      const { data: depts } = await supabase.from('Departments').select('*').order('id');
      setDepartments(depts || []);

      fetchJobs(profileData);
      fetchUsers();
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchJobs = async (userProfile: any = profile) => {
    const currentProfile = userProfile || profile;
    if (!currentProfile) return;

    let query = supabase
        .from('Jobs')
        .select(`
            *,
            JobAssignments (
                user_id,
                Profiles ( nickname, first_name, last_name )
            )
        `)
        .order('id', { ascending: false });

    if (currentProfile.role !== 'ADMIN') {
        if (currentProfile.department_id) {
            query = query.contains('department_ids', [currentProfile.department_id]);
        }
    }

    const { data, error } = await query;
    if (error) console.error(error); 
    else setJobs(data || []);
  };

  const fetchUsers = async () => {
      const { data } = await supabase.from('Profiles').select('*').eq('approval_status', 'APPROVED');
      setUsers(data || []);
  };

  const fetchJobFeedback = async (jobId: number) => {
      const { data } = await supabase.from('JobFeedbacks').select('*').eq('job_id', jobId).single();
      setJobFeedback(data || null);
  };

  useEffect(() => {
      const fetchDeptUsers = async () => {
          if (newJob.selected_depts.length === 0) {
              setDeptUsers([]);
              return;
          }
          const { data } = await supabase
            .from('Profiles')
            .select('*')
            .in('department_id', newJob.selected_depts)
            .eq('approval_status', 'APPROVED');
          setDeptUsers(data || []);
      };
      fetchDeptUsers();
  }, [newJob.selected_depts]);

  const filteredJobs = jobs.filter((job) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
          (job.title && job.title.toLowerCase().includes(query)) ||
          (job.location && job.location.toLowerCase().includes(query)) ||
          (job.customer_name && job.customer_name.toLowerCase().includes(query)) ||
          (job.customer_phone && job.customer_phone.toLowerCase().includes(query))
      );

      if (!matchesSearch) return false;

      if (profile?.role === 'ADMIN') {
          if (adminFilterDept !== 0) {
              return job.department_ids?.includes(adminFilterDept);
          }
      } 
      
      if (showMyJobsOnly && profile) {
          const isAssigned = job.JobAssignments?.some((assign: any) => assign.user_id === profile.user_id);
          const isLegacyAssigned = !isAssigned && job.assigned_to === profile.user_id;
          
          if (!isAssigned && !isLegacyAssigned) {
              return false;
          }
      }
      return true;
  });

  const handleCreateJob = async () => {
    if (!newJob.title || !newJob.start_time || !newJob.end_time || !newJob.location || newJob.selected_depts.length === 0) {
      showError("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลและเลือกฝ่ายรับผิดชอบ"); return;
    }
    
    const { data: duplicateJob } = await supabase.from('Jobs').select('id').eq('title', newJob.title).maybeSingle();
    if (duplicateJob) { showError("ชื่อซ้ำ", "ชื่องานนี้มีอยู่แล้ว"); return; }

    if (!(await confirmAction('ยืนยันการมอบหมาย', `สร้างงาน "${newJob.title}"?`))) return;

    const { data: jobData, error } = await supabase.from('Jobs').insert([{
        title: newJob.title, 
        location: newJob.location, 
        map_url: newJob.map_url,
        description: newJob.description,
        start_time: new Date(newJob.start_time).toISOString(),
        end_time: new Date(newJob.end_time).toISOString(),
        status: 'PENDING', 
        customer_name: newJob.customer_name,
        customer_phone: newJob.customer_phone,
        department_ids: newJob.selected_depts,
        is_feedback_required: newJob.is_feedback_required
    }]).select().single();

    if (error || !jobData) { showError("เกิดข้อผิดพลาด", error?.message || ''); return; }

    if (newJob.assigned_to.length > 0) {
        const assignments = newJob.assigned_to.map(userId => ({ job_id: jobData.id, user_id: userId }));
        await supabase.from('JobAssignments').insert(assignments);
    }

    showSuccess("สร้างงานสำเร็จ"); setOpenCreateDialog(false); fetchJobs();
    setNewJob({ title: '', location: '', map_url: '', description: '', start_time: '', end_time: '', assigned_to: [], customer_name: '', customer_phone: '', selected_depts: [], is_feedback_required: false });
  };

  const handleUpdateJob = async () => {
      if (!(await confirmAction('บันทึกการแก้ไข?', 'ข้อมูลเดิมจะถูกเปลี่ยนแปลง'))) return;
      
      const { data: duplicateJob } = await supabase.from('Jobs').select('id').eq('title', editJob.title).neq('id', editJob.id).maybeSingle();
      if (duplicateJob) { showError("ชื่อซ้ำ", "มีงานอื่นใช้ชื่อนี้แล้ว"); return; }

      const { error } = await supabase.from('Jobs').update({
            title: editJob.title, 
            location: editJob.location, 
            map_url: editJob.map_url,
            description: editJob.description,
            start_time: new Date(editJob.start_time).toISOString(),
            end_time: new Date(editJob.end_time).toISOString(),
            customer_name: editJob.customer_name,
            customer_phone: editJob.customer_phone
        }).eq('id', editJob.id);
      
      if (error) { showError("เกิดข้อผิดพลาด", error.message); return; }

      await supabase.from('JobAssignments').delete().eq('job_id', editJob.id);
      if (editJob.assigned_to && editJob.assigned_to.length > 0) {
          const assignments = editJob.assigned_to.map((userId: string) => ({ job_id: editJob.id, user_id: userId }));
          await supabase.from('JobAssignments').insert(assignments);
      }
      showSuccess("แก้ไขสำเร็จ"); setOpenEditDialog(false); setOpenDetailDialog(false); fetchJobs(profile);
  };

  const handleDeleteJob = async () => { 
      if(!selectedJob) return; 
      if(!(await confirmAction('ลบงานถาวร?', `ลบงาน "${selectedJob.title}"?`, 'ลบเลย', '#D32F2F'))) return; 
      if (selectedJob.image_url) {
          try { const fileName = selectedJob.image_url.split('/').pop(); if(fileName) await supabase.storage.from('job-evidence').remove([fileName]); } catch (e) { console.error(e); }
      }
      const { error } = await supabase.from('Jobs').delete().eq('id', selectedJob.id); 
      if (!error) { showSuccess("ลบงานเรียบร้อย"); setOpenDetailDialog(false); fetchJobs(profile); } else { showError("ลบไม่ได้", error.message); }
  };
  
  const updateJobStatus = async (id:any, status:any, msg: string) => { 
      if (!(await confirmAction('เปลี่ยนสถานะ', msg))) return;
      const { error } = await supabase.from('Jobs').update({status}).eq('id', id); 
      if (!error) { showSuccess("อัปเดตสถานะแล้ว"); fetchJobs(profile); setOpenDetailDialog(false); }
  };

  const calendarEvents = filteredJobs.map((job: any) => ({ id: job.id, title: job.title, start: job.start_time, end: job.end_time, color: getStatusColor(job.status), extendedProps: { ...job } }));
  const handleEventClick = (info: any) => { 
    openJobDetail(info.event.extendedProps); 
  };
  const openJobDetail = (job: any) => { 
    setSelectedJob({ 
        ...job, 
        start_formatted: new Date(job.start_time).toLocaleString('th-TH'), 
        end_formatted: new Date(job.end_time).toLocaleString('th-TH') 
    }); 
    fetchJobFeedback(job.id); // ดึง Feedback
    setOpenDetailDialog(true); 
  }
  const openEditForm = () => { 
      const currentAssignees = selectedJob.JobAssignments?.map((a: any) => a.user_id) || [];
      setEditJob({ 
          ...selectedJob, 
          assigned_to: currentAssignees,
          start_time: selectedJob.start_time.substring(0, 16), 
          end_time: selectedJob.end_time.substring(0, 16) 
      }); 
      setOpenEditDialog(true); 
  };

  return (
    <Layout title="หน้าหลัก">
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', md: 'center' }} mb={3} spacing={2}>
        <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>ตารางงานรวม</Typography>
            <Typography variant="subtitle1" color="text.secondary">ภาพรวมการดำเนินงานทั้งหมด</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" width={{ xs: '100%', md: 'auto' }} flexWrap="wrap">
            
            {profile?.role === 'ADMIN' && (
                <FormControl size="small" sx={{ minWidth: 180, bgcolor: 'white', borderRadius: 1 }}>
                    <InputLabel>กรองตามฝ่าย</InputLabel>
                    <Select value={adminFilterDept} label="กรองตามฝ่าย" onChange={(e) => setAdminFilterDept(Number(e.target.value))}>
                        <MenuItem value={0}>-- ดูงานทุกฝ่าย --</MenuItem>
                        {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                    </Select>
                </FormControl>
            )}
            {profile?.role !== 'ADMIN' && (
                <Button variant={showMyJobsOnly ? "contained" : "outlined"} color={showMyJobsOnly ? "secondary" : "inherit"} startIcon={<FilterIcon />} onClick={() => setShowMyJobsOnly(!showMyJobsOnly)} sx={{ borderColor: showMyJobsOnly ? 'transparent' : '#ddd', color: showMyJobsOnly ? 'white' : '#555', whiteSpace: 'nowrap' }}>
                    {showMyJobsOnly ? "แสดงงานของฉัน" : "แสดงงานทั้งหมด"}
                </Button>
            )}
            <TextField placeholder="ค้นหา..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>) }} sx={{ bgcolor: 'white', borderRadius: 1, minWidth: 200 }} />
            <Box sx={{ display: 'flex', gap: 2 }}>
                <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)}>
                    <ToggleButton value="table"><ListIcon /> ตาราง</ToggleButton>
                    <ToggleButton value="calendar"><CalendarIcon /> ปฏิทิน</ToggleButton>
                </ToggleButtonGroup>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreateDialog(true)} sx={{ px: 3, bgcolor: '#D32F2F' }}>สร้างงาน</Button>
            </Box>
        </Stack>
      </Stack>

      <Paper sx={{ p: 0, borderRadius: 3, overflow: 'hidden' }}>
        {viewMode === 'calendar' ? (
            <Box sx={{ p: 3 }}><FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" events={calendarEvents} eventClick={handleEventClick} height="auto" /></Box>
        ) : (
            <TableContainer>
                <Table>
                    <TableHead sx={{ bgcolor: '#FAFAFA' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>ชื่องาน</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>ลูกค้า</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>สถานที่</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>ฝ่ายที่รับผิดชอบ</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>ทีมงาน</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>สถานะ</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>เวลา</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>จัดการ</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredJobs.map((job) => (
                            <TableRow key={job.id} hover>
                                <TableCell>
                                    <Typography fontWeight={600}>{job.title}</Typography>
                                    <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5} color="text.secondary">
                                        <LocationIcon fontSize="small" color="action" /><Typography variant="body2">{job.location || '-'}</Typography>
                                    </Stack>
                                    {job.is_feedback_required && <Chip label="ต้องประเมิน" size="small" color="warning" variant="outlined" icon={<AssignmentIcon />} sx={{ mt: 0.5, height: 20, fontSize: 10 }} />}
                                </TableCell>
                                <TableCell>{job.customer_name ? <Box><Typography variant="body2" fontWeight="bold">{job.customer_name}</Typography><Typography variant="caption" color="text.secondary">{job.customer_phone}</Typography></Box> : "-"}</TableCell>
                                <TableCell>{job.location || '-'}</TableCell>
                                <TableCell>
                                     {job.department_ids?.map((deptId: number) => {
                                        const d = departments.find(dp => dp.id === deptId);
                                        return d ? <Chip key={deptId} label={d.name} size="small" sx={{ mr: 0.5, my: 0.5, fontSize: '0.7rem' }} /> : null;
                                    })}
                                </TableCell>
                                <TableCell>
                                    <AvatarGroup max={3} sx={{ justifyContent: 'flex-start' }}>
                                        {job.JobAssignments?.map((a: any) => (
                                            <Avatar key={a.user_id} sx={{ width: 24, height: 24, fontSize: 12 }} title={a.Profiles.nickname}>
                                                {a.Profiles.nickname[0]}
                                            </Avatar>
                                        ))}
                                    </AvatarGroup>
                                </TableCell>
                                <TableCell><Chip label={getStatusLabel(job.status)} size="small" sx={{ bgcolor: getStatusColor(job.status), color: 'white', fontWeight: 'bold' }} /></TableCell>
                                <TableCell>
                                     <Typography variant="body2">{new Date(job.start_time).toLocaleDateString('th-TH')}</Typography>
                                     <Typography variant="caption" color="text.secondary">{new Date(job.start_time).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})} - {new Date(job.end_time).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</Typography>
                                </TableCell>
                                <TableCell align="center"><IconButton size="small" onClick={() => openJobDetail(job)} color="primary"><ListIcon /></IconButton></TableCell>
                            </TableRow>
                        ))}
                        {filteredJobs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                    {searchQuery ? 'ไม่พบงานที่ค้นหา' : 'ไม่มีงานในระบบ'}
                                </TableCell>
                            </TableRow>
                        )}
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
                 <TextField label="ชื่องาน" fullWidth value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} placeholder="เช่น ล้างแอร์, ซ่อมไฟ" error={false} />
                 <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField label="ชื่อลูกค้า" fullWidth value={newJob.customer_name} onChange={e => setNewJob({...newJob, customer_name: e.target.value})} InputProps={{ startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} /> }} />
                    <TextField label="เบอร์โทรศัพท์" fullWidth value={newJob.customer_phone} onChange={e => setNewJob({...newJob, customer_phone: e.target.value})} InputProps={{ startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} /> }} />
                 </Stack>
                 <TextField label="สถานที่ปฏิบัติงาน" fullWidth value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} InputProps={{ startAdornment: <LocationIcon color="action" sx={{ mr: 1 }} /> }} />
                 <TextField label="ลิงก์ Google Map (ถ้ามี)" fullWidth value={newJob.map_url} onChange={e => setNewJob({...newJob, map_url: e.target.value})} placeholder="https://maps.app.goo.gl/..." InputProps={{ startAdornment: <MapIcon color="action" sx={{ mr: 1 }} /> }} />

                 <FormControl fullWidth>
                    <InputLabel id="create-dept-label">ฝ่ายที่รับผิดชอบ (เลือกได้หลายฝ่าย)</InputLabel>
                    <Select labelId="create-dept-label" multiple value={newJob.selected_depts} onChange={(e) => { const values = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value; setNewJob({...newJob, selected_depts: values as number[]}); }} input={<OutlinedInput label="ฝ่ายที่รับผิดชอบ (เลือกได้หลายฝ่าย)" />} renderValue={(selected) => (<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map((value) => { const dept = departments.find(d => d.id === value); return <Chip key={value} label={dept?.name} size="small" />; })}</Box>)} MenuProps={MenuProps}>
                        {departments.filter(d => profile?.role === 'ADMIN' || d.id === profile?.department_id).map((d) => (<MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>))}
                    </Select>
                 </FormControl>

                 <FormControl fullWidth disabled={newJob.selected_depts.length === 0}>
                    <InputLabel id="create-assign-label">มอบหมายทีมงาน (ในฝ่ายที่เลือก)</InputLabel>
                    <Select labelId="create-assign-label" multiple value={newJob.assigned_to} onChange={e => { const { target: { value } } = e; setNewJob({...newJob, assigned_to: typeof value === 'string' ? value.split(',') : value }); }} input={<OutlinedInput label="มอบหมายทีมงาน (ในฝ่ายที่เลือก)" />} renderValue={(selected) => (<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map((value) => { const user = deptUsers.find(u => u.user_id === value); return <Chip key={value} label={user ? user.nickname : value} size="small" />; })}</Box>)} MenuProps={MenuProps}>
                        {deptUsers.map(u => (<MenuItem key={u.user_id} value={u.user_id}><Checkbox checked={newJob.assigned_to.indexOf(u.user_id) > -1} /><ListItemText primary={`${u.nickname} (${u.first_name})`} secondary={departments.find(d => d.id === u.department_id)?.name} /></MenuItem>))}
                    </Select>
                 </FormControl>

                 <FormControlLabel control={<Checkbox checked={newJob.is_feedback_required} onChange={(e) => setNewJob({...newJob, is_feedback_required: e.target.checked})} color="primary" />} label="แนบแบบสอบถามความพึงพอใจ (ลูกค้าต้องประเมินก่อนส่งงาน)" sx={{ border: '1px solid #ddd', borderRadius: 1, px: 1, bgcolor: '#fafafa' }} />
                 
                 <TextField label="รายละเอียดเพิ่มเติม" multiline rows={2} fullWidth value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} />
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

      {/* Dialog Edit Form */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="md">
          <DialogTitle sx={{ bgcolor: '#455A64', color: 'white' }}>แก้ไขงาน</DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
             {editJob && <Stack spacing={2} sx={{mt:1}}>
                 <TextField label="ชื่องาน" fullWidth value={editJob.title} onChange={e => setEditJob({...editJob, title: e.target.value})} />
                 <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField label="ชื่อลูกค้า" fullWidth value={editJob.customer_name} onChange={e => setEditJob({...editJob, customer_name: e.target.value})} />
                    <TextField label="เบอร์โทรศัพท์" fullWidth value={editJob.customer_phone} onChange={e => setEditJob({...editJob, customer_phone: e.target.value})} />
                 </Stack>
                 <TextField label="สถานที่" fullWidth value={editJob.location} onChange={e => setEditJob({...editJob, location: e.target.value})} />
                 <TextField label="ลิงก์ Google Map" fullWidth value={editJob.map_url} onChange={e => setEditJob({...editJob, map_url: e.target.value})} InputProps={{ startAdornment: <MapIcon color="action" sx={{ mr: 1 }} /> }} />

                 <FormControl fullWidth>
                    <InputLabel id="edit-assign-label">มอบหมายทีมงาน</InputLabel>
                    <Select labelId="edit-assign-label" multiple value={editJob.assigned_to || []} onChange={e => { const { target: { value } } = e; setEditJob({...editJob, assigned_to: typeof value === 'string' ? value.split(',') : value }); }} input={<OutlinedInput label="มอบหมายทีมงาน" />} renderValue={(selected) => (<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map((value: string) => { const user = users.find(u => u.user_id === value); return <Chip key={value} label={user ? user.nickname : value} size="small" />; })}</Box>)} MenuProps={MenuProps}>
                        {users.map(u => (<MenuItem key={u.user_id} value={u.user_id}>{u.nickname} ({u.first_name})</MenuItem>))}
                    </Select>
                 </FormControl>
                 <TextField label="รายละเอียด" multiline rows={2} fullWidth value={editJob.description} onChange={e => setEditJob({...editJob, description: e.target.value})} />
                 <Stack direction="row" spacing={2}>
                    <TextField type="datetime-local" label="เริ่ม" fullWidth InputLabelProps={{shrink:true}} value={editJob.start_time} onChange={e => setEditJob({...editJob, start_time: e.target.value})} />
                    <TextField type="datetime-local" label="จบ" fullWidth InputLabelProps={{shrink:true}} value={editJob.end_time} onChange={e => setEditJob({...editJob, end_time: e.target.value})} />
                 </Stack>
             </Stack>}
          </DialogContent>
          <DialogActions>
             <Button onClick={() => setOpenEditDialog(false)}>ยกเลิก</Button>
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
                      {selectedJob.map_url && (<Button variant="outlined" color="primary" startIcon={<MapIcon />} href={selectedJob.map_url} target="_blank" rel="noopener noreferrer" fullWidth>เปิดดูแผนที่ Google Maps</Button>)}
                      {selectedJob.is_feedback_required && (<Chip label="งานนี้ต้องการแบบสอบถามความพึงพอใจ" color="warning" icon={<AssignmentIcon />} sx={{ width: '100%', justifyContent: 'center' }} />)}
                      <Box sx={{ p: 2, bgcolor: '#FFF3E0', borderRadius: 2, border: '1px solid #FFE0B2' }}><Stack direction="row" spacing={1} alignItems="center" mb={1}><PersonIcon color="warning" /><Typography variant="subtitle2" fontWeight="bold">ข้อมูลลูกค้า</Typography></Stack><Typography variant="body1">คุณ {selectedJob.customer_name || '-'}</Typography><Stack direction="row" spacing={1} alignItems="center" mt={0.5}><PhoneIcon fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">{selectedJob.customer_phone || '-'}</Typography></Stack></Box>
                      <Box sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2 }}><Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{selectedJob.description || "-"}</Typography></Box>
                      {selectedJob.image_url && (<Box><Stack direction="row" alignItems="center" spacing={1} mb={1}><ImageIcon color="action" /><Typography variant="subtitle2">รูปภาพส่งงาน:</Typography></Stack><a href={selectedJob.image_url} target="_blank" rel="noreferrer"><img src={selectedJob.image_url} alt="หลักฐานงาน" style={{ width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} /></a></Box>)}
                      
                      {/* แสดง Feedback */}
                      {jobFeedback && (
                          <Box sx={{ p: 2, bgcolor: '#E8F5E9', borderRadius: 2, border: '1px solid #C8E6C9' }}>
                              <Typography variant="h6" gutterBottom color="success.main">📝 ผลการประเมินจากลูกค้า</Typography>
                              <Stack spacing={1}>
                                  {/* ใช้ Typography แสดงผลคะแนนแทน Rating ถ้ายังไม่ได้ import */}
                                  <Typography variant="body2">บริการโดยรวม: {jobFeedback.overall_satisfaction} / 5</Typography>
                                  <Typography variant="body2">พนักงาน: {jobFeedback.staff_satisfaction} / 5</Typography>
                                  {jobFeedback.suggestion && <Typography variant="body2" sx={{ fontStyle: 'italic' }}>" {jobFeedback.suggestion} "</Typography>}
                                  {jobFeedback.signature_url && <Box mt={1}><Typography variant="caption">ลายเซ็น:</Typography><img src={jobFeedback.signature_url} alt="Signature" style={{ height: 40, objectFit: 'contain', border: '1px solid #ccc' }} /></Box>}
                              </Stack>
                          </Box>
                      )}

                      <Stack direction="row" justifyContent="space-between"><Box><Typography variant="caption" color="text.secondary">ทีมผู้รับผิดชอบ</Typography><Stack direction="row" spacing={0.5} flexWrap="wrap">{selectedJob.JobAssignments && selectedJob.JobAssignments.length > 0 ? (selectedJob.JobAssignments.map((assign: any) => (<Chip key={assign.user_id} label={assign.Profiles?.nickname} size="small" variant="outlined" />))) : <Typography variant="body2">-</Typography>}</Stack></Box><Box sx={{ textAlign: 'right' }}><Typography variant="caption" color="text.secondary">เวลานัดหมาย</Typography><Typography variant="body2">{selectedJob.start_formatted} - {selectedJob.end_formatted}</Typography></Box></Stack>
                      <Box sx={{ my: 1, borderTop: '1px solid #eee' }} />
                      <Box>
                        <Typography variant="subtitle2" gutterBottom align="center" color="text.secondary">จัดการสถานะ</Typography>
                        <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                            {selectedJob.status === 'PENDING' && <Button variant="contained" color="warning" startIcon={<PlayIcon />} onClick={() => updateJobStatus(selectedJob.id, 'IN_PROGRESS', 'ยืนยันเริ่มงาน?')}>เริ่มงาน</Button>}
                            {selectedJob.status === 'IN_PROGRESS' && <Button variant="contained" sx={{ bgcolor: '#1976D2' }} startIcon={<DoneIcon />} onClick={() => updateJobStatus(selectedJob.id, 'WAITING_REVIEW', 'ยืนยันส่งงาน?')}>ส่งตรวจ</Button>}
                            {selectedJob.status === 'WAITING_REVIEW' && profile?.role === 'ADMIN' && (
                                <><Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => updateJobStatus(selectedJob.id, 'PENDING', 'ตีกลับงาน?')}>ตีกลับ</Button><Button variant="contained" color="success" startIcon={<CheckIcon />} onClick={() => updateJobStatus(selectedJob.id, 'APPROVED', 'อนุมัติงาน?')}>อนุมัติ</Button></>
                            )}
                            {selectedJob.status === 'APPROVED' && <Chip icon={<CheckIcon />} label="เสร็จสมบูรณ์" color="success" variant="outlined" />}
                        </Stack>
                      </Box>
                  </Stack>
              )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1}><Button color="error" startIcon={<DeleteIcon />} onClick={handleDeleteJob}>ลบ</Button><Button color="inherit" startIcon={<EditIcon />} onClick={openEditForm}>แก้ไข</Button></Stack>
              <Button variant="outlined" onClick={() => setOpenDetailDialog(false)}>ปิด</Button>
          </DialogActions>
      </Dialog>
    </Layout>
  );
}
export default DashboardPage;