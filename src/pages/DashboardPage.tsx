import React, { useEffect, useState } from 'react';
import { 
  Typography, Button, Paper, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, InputAdornment,
  ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  MenuItem, Select, InputLabel, FormControl, IconButton, Avatar,  OutlinedInput,
  Checkbox, ListItemText, FormControlLabel, Rating, Switch, Divider, TablePagination
} from '@mui/material';

import { Box } from '@mui/material';
import dayjs from 'dayjs';

import { 
  CalendarMonth as CalendarIcon, List as ListIcon, CheckCircle as CheckIcon, 
  Cancel as CancelIcon, 
  Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon,
  Add as AddIcon, LocationOn as LocationIcon, Image as ImageIcon,
  Person as PersonIcon, Phone as PhoneIcon, 
  Map as MapIcon, FilterAlt as FilterIcon, Visibility as VisibilityIcon, Save as SaveIcon
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
const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('th-TH', {
      day: 'numeric', 
      month: 'short', 
      year: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = { PaperProps: { style: { maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP, width: 250 } } };

function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]); 
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [deptUsers, setDeptUsers] = useState<any[]>([]);
  const [page, setPage] = useState(0); // หน้าปัจจุบัน (เริ่มที่ 0)
  const [rowsPerPage, setRowsPerPage] = useState(10); // แสดงหน้าละกี่งาน (ตั้งไว้ 10)
  
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('table'); 
  const [searchQuery, setSearchQuery] = useState('');

  // 1. แปลงสถานะเป็นภาษาไทย
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'รอดำเนินการ';
      case 'IN_PROGRESS': return 'กำลังดำเนินการ';
      case 'WAITING_REVIEW': return 'รอตรวจงาน';
      case 'APPROVED': return 'เสร็จสมบูรณ์';
      case 'DONE': return 'เสร็จสมบูรณ์';
      case 'CANCELLED': return 'ยกเลิก';
      default: return status;
    }
  };

  // 2. เลือกสีตามที่ขอ (แดง -> เหลือง -> เขียวอ่อน -> เขียวเข้ม)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': 
          return '#D32F2F';        // 🔴 แดง (รอดำเนินการ)
      case 'IN_PROGRESS': 
          return '#FBC02D';        // 🟡 เหลืองเข้ม/ทอง (กำลังดำเนินการ) - ใช้โทนนี้เพื่อให้ตัวหนังสือสีขาวอ่านออกครับ
      case 'WAITING_REVIEW': 
          return '#66BB6A';        // 🟢 เขียวอ่อน (รอตรวจงาน)
      case 'APPROVED': 
          return '#1B5E20';        // 🌲 เขียวเข้ม (เสร็จสมบูรณ์)
      case 'DONE': 
          return '#1B5E20';        // 🌲 เขียวเข้ม
      default: 
          return '#757575';        // เทา (อื่นๆ)
    }
  };
  
  // --- ตัวกรอง ---
  const [adminFilterDept, setAdminFilterDept] = useState<number>(0);
  const [adminFilterStatus, setAdminFilterStatus] = useState<string>('ALL'); // [NEW] กรองสถานะ
  const [showMyJobsOnly, setShowMyJobsOnly] = useState(false); 
  // --------------

  const [jobFeedback, setJobFeedback] = useState<any>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', location: '', map_url: '', description: '', start_time: '', end_time: '', assigned_to: [] as string[], customer_name: '', customer_phone: '', selected_depts: [] as number[], is_feedback_required: false });
  
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  
  const [editJob, setEditJob] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({
      title: '',
      description: '',
      customer_name: '',
      customer_phone: '',
      location: '',
      start_time: '',
      
      department_ids: [],
      is_feedback_required: true
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileData } = await supabase.from('Profiles').select('*').eq('user_id', user.id).single();
      setProfile(profileData);
      const { data: depts } = await supabase.from('Departments').select('*').order('id');
      // 2. 👇 เพิ่มอันนี้: ดึงรายชื่อพนักงาน (ไม่เอา Admin)
      const { data: userList } = await supabase
        .from('Profiles')
        .select('*')
        .neq('role', 'ADMIN')
         .order('first_name');
      setUsers(userList || []);
      setDepartments(depts || []);
      fetchJobs(profileData);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchJobs = async (userProfile: any = profile) => {
    const currentProfile = userProfile || profile;
    if (!currentProfile) return;

    let query = supabase
        .from('Jobs')
        .select(`*, JobAssignments (user_id, Profiles (nickname, first_name, last_name))`)
        .order('id', { ascending: false });

    if (currentProfile.role !== 'ADMIN') {
        if (currentProfile.department_id) {
            query = query.contains('department_ids', [currentProfile.department_id]);
        }
    }
    const { data, error } = await query;
    if (error) console.error(error); else setJobs(data || []);
  };

  const fetchJobFeedback = async (jobId: number) => {
      setJobFeedback(null); 
      const { data } = await supabase.from('JobFeedbacks').select('*').eq('job_id', jobId).single();
      setJobFeedback(data || null);
  };

  useEffect(() => {
      const fetchDeptUsers = async () => {
          if (newJob.selected_depts.length === 0) { setDeptUsers([]); return; }
          const { data } = await supabase.from('Profiles').select('*').in('department_id', newJob.selected_depts).eq('approval_status', 'APPROVED');
          setDeptUsers(data || []);
      };
      fetchDeptUsers();
  }, [newJob.selected_depts]);

  // --- Logic กรองงาน (Updated) ---
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
          // กรองแผนก
          if (adminFilterDept !== 0 && !job.department_ids?.includes(adminFilterDept)) return false;
          // กรองสถานะ (NEW)
          if (adminFilterStatus !== 'ALL' && job.status !== adminFilterStatus) return false;
      } 
      
      if (showMyJobsOnly && profile) {
          const isAssigned = job.JobAssignments?.some((assign: any) => assign.user_id === profile.user_id);
          const isLegacyAssigned = !isAssigned && job.assigned_to === profile.user_id;
          if (!isAssigned && !isLegacyAssigned) return false;
      }
      return true;
  });

  const handleCreateJob = async () => {
    if (!newJob.title || !newJob.start_time || !newJob.end_time || !newJob.location || newJob.selected_depts.length === 0) {
      showError("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลและเลือกฝ่ายรับผิดชอบ"); return;
    }
    if (!(await confirmAction('ยืนยันการมอบหมาย', `สร้างงาน "${newJob.title}"?`))) return;

    const { data: jobData, error } = await supabase.from('Jobs').insert([{
        title: newJob.title, location: newJob.location, map_url: newJob.map_url, description: newJob.description,
        start_time: dayjs(newJob.start_time).toISOString(), end_time: dayjs(newJob.end_time).toISOString(),
        status: 'PENDING', customer_name: newJob.customer_name, customer_phone: newJob.customer_phone,
        department_ids: newJob.selected_depts, is_feedback_required: newJob.is_feedback_required
    }]).select().single();

    if (error || !jobData) { showError("เกิดข้อผิดพลาด", error?.message || ''); return; }

    if (newJob.assigned_to.length > 0) {
        const assignments = newJob.assigned_to.map(userId => ({ job_id: jobData.id, user_id: userId }));
        await supabase.from('JobAssignments').insert(assignments);
    }
    showSuccess("สร้างงานสำเร็จ"); setOpenCreateDialog(false); fetchJobs(profile);
    setNewJob({ title: '', location: '', map_url: '', description: '', start_time: '', end_time: '', assigned_to: [], customer_name: '', customer_phone: '', selected_depts: [], is_feedback_required: false });
  };

  // แทนที่ handleUpdateJob เดิมด้วยอันนี้ครับ 
  const handleUpdateJob = async () => {
      if (!editJob) return;
      if (!(await confirmAction('บันทึกการแก้ไข?', 'ข้อมูลเดิมจะถูกเปลี่ยนแปลง'))) return;

      try {
          // 1. อัปเดตข้อมูลงาน (Jobs)
          const { error } = await supabase.from('Jobs').update({
              title: editForm.title,
              description: editForm.description,
              customer_name: editForm.customer_name,
              customer_phone: editForm.customer_phone,
              location: editForm.location,
              department_ids: editForm.department_ids,
              is_feedback_required: editForm.is_feedback_required,
              start_time: editForm.start_time ? dayjs(editForm.start_time).toISOString() : null,
              end_time: editForm.end_time ? dayjs(editForm.end_time).toISOString() : null

          }).eq('id', editJob.id);

          if (error) throw error;

          // 2. อัปเดตพนักงานที่รับผิดชอบ (JobAssignments)
          // ลบคนเก่าออกให้หมดก่อน
          await supabase.from('JobAssignments').delete().eq('job_id', editJob.id);
          
          // ถ้ามีการเลือกคนใหม่ ให้ใส่เข้าไป
          if (editForm.assigned_to && editForm.assigned_to.length > 0) {
              const newAssignments = editForm.assigned_to.map((userId: string) => ({
                  job_id: editJob.id,
                  user_id: userId
              }));
              const { error: assignError } = await supabase.from('JobAssignments').insert(newAssignments);
              if (assignError) throw assignError;
          }

          showSuccess("แก้ไขสำเร็จ");
          setEditJob(null); // ปิดหน้าต่าง
          fetchJobs(profile); // โหลดข้อมูลใหม่ (ส่ง profile เข้าไปตามเดิม)

      } catch (err: any) {
          showError("เกิดข้อผิดพลาด", err.message);
      }
  };

  // 👇👇👇 สร้างฟังก์ชันนี้เพิ่มเข้าไปครับ 👇👇👇
  const handleOpenEdit = async (job: any) => {
    setEditJob(job); // เก็บข้อมูลงานหลัก

    // 👇 ฟังก์ชันเปลี่ยนหน้า
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // 👇 ฟังก์ชันเปลี่ยนจำนวนงานต่อหน้า (เช่น เปลี่ยนจาก 10 เป็น 25)
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

    // 1. ดึงข้อมูลว่างานนี้มอบหมายให้ใครบ้าง (จากตาราง JobAssignments)
    const { data: assignments } = await supabase
        .from('JobAssignments')
        .select('user_id')
        .eq('job_id', job.id);
    
    const currentAssignees = assignments?.map((a: any) => a.user_id) || [];

    // 2. เอาข้อมูลมาใส่ฟอร์ม
    setEditForm({
      title: job.title || '',
      description: job.description || '',
      customer_name: job.customer_name || '',
      customer_phone: job.customer_phone || '',
      location: job.location || '',
      // แปลงเวลาให้ถูกต้อง
      start_time: job.start_time ? dayjs(job.start_time).format('YYYY-MM-DDTHH:mm') : '',
      department_ids: job.department_ids || [],
      assigned_to: currentAssignees, // 👈 ใส่รายชื่อคนที่ทำอยู่นี้ลงไป
      is_feedback_required: job.is_feedback_required ?? true
    });
  };
  const handleDeleteJob = async () => { 
      if(!selectedJob) return; 
      if(!(await confirmAction('ลบงานถาวร?', `ลบงาน "${selectedJob.title}"?`, 'ลบเลย', '#D32F2F'))) return; 
      if (selectedJob.image_url) { try { const fileName = selectedJob.image_url.split('/').pop(); if(fileName) await supabase.storage.from('job-evidence').remove([fileName]); } catch (e) {} }
      const { error } = await supabase.from('Jobs').delete().eq('id', selectedJob.id); 
      if (!error) { showSuccess("ลบงานเรียบร้อย"); setOpenDetailDialog(false); fetchJobs(profile); } else { showError("ลบไม่ได้", error.message); }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // --- ฟังก์ชันอนุมัติ/ตีกลับ (สำหรับ Admin) ---
  const updateJobStatus = async (id: any, status: any, msg: string) => {
    if (!(await confirmAction('ยืนยันการดำเนินการ', msg))) return;
    const { error } = await supabase.from('Jobs').update({ status }).eq('id', id);
    if (!error) { showSuccess("บันทึกสถานะเรียบร้อย"); setOpenDetailDialog(false); fetchJobs(profile); }
    else { showError("เกิดข้อผิดพลาด", error.message); }
  };

  const calendarEvents = filteredJobs.map((job: any) => ({ id: job.id, title: job.title, start: job.start_time, end: job.end_time, color: getStatusColor(job.status), extendedProps: { ...job } }));
  const handleEventClick = (info: any) => { openJobDetail(info.event.extendedProps); };
  
  const openJobDetail = (job: any) => { 
    setSelectedJob({ ...job, start_formatted: new Date(job.start_time).toLocaleString('th-TH'), end_formatted: new Date(job.end_time).toLocaleString('th-TH') }); 
    fetchJobFeedback(job.id); 
    setOpenDetailDialog(true); 
  }

  // เช็คว่างานล็อกหรือยัง (Approved แล้ว ห้ามแก้)
  const isJobLocked = selectedJob?.status === 'APPROVED';

  const renderJobImages = (imageUrlData: any) => {
    if (!imageUrlData) return null;

    let urls: string[] = [];

    // แปลงข้อมูลให้เป็น Array (รองรับทั้งแบบเก่า String และแบบใหม่ Array)
    if (Array.isArray(imageUrlData)) {
      urls = imageUrlData;
    } else if (typeof imageUrlData === 'string') {
      const trimmed = imageUrlData.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          urls = Array.isArray(parsed) ? parsed : [trimmed];
        } catch (e) {
          urls = [trimmed];
        }
      } else {
        urls = [trimmed];
      }
    }

    if (urls.length === 0) return null;

    return (
      <Box mt={2}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <ImageIcon color="action" />
          <Typography variant="subtitle2">รูปภาพส่งงาน ({urls.length} รูป):</Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {urls.map((url, index) => (
            <Box
              key={index}
              component="img"
              src={url}
              alt={`หลักฐาน ${index + 1}`}
              sx={{
                width: 120,
                height: 120,
                objectFit: 'cover',
                borderRadius: 2,
                border: '1px solid #ccc',
                cursor: 'pointer'
              }}
              onClick={() => window.open(url, '_blank')}
            />
          ))}
        </Stack>
      </Box>
    );
  };

  return (
    <Layout title="หน้าหลัก">
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', md: 'center' }} mb={3} spacing={2}>
        <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>ตารางงานรวม</Typography>
            <Typography variant="subtitle1" color="text.secondary">ภาพรวมการดำเนินงานทั้งหมด</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" width={{ xs: '100%', md: 'auto' }} flexWrap="wrap">
            
            {/* ช่องค้นหา */}
                <TextField 
                    placeholder="ค้นหางาน..." 
                    size="small" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                    
                    InputProps={{ 
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ) 
                    }} 
                    sx={{ bgcolor: 'white', borderRadius: 1, minWidth: 200 }} 
                />
            
            {/* --- [NEW] Filter Status Dropdown --- */}
            {profile?.role === 'ADMIN' && (
                <>
                    <FormControl size="small" sx={{ minWidth: 150, bgcolor: 'white', borderRadius: 1 }}>
                        <InputLabel>สถานะงาน</InputLabel>
                        <Select value={adminFilterStatus} label="สถานะงาน" onChange={(e) => setAdminFilterStatus(e.target.value)}>
                            <MenuItem value="ALL">-- ทั้งหมด --</MenuItem>
                            <MenuItem value="PENDING">รอดำเนินการ</MenuItem>
                            <MenuItem value="IN_PROGRESS">กำลังดำเนินการ</MenuItem>
                            <MenuItem value="WAITING_REVIEW">รอตรวจงาน</MenuItem>
                            <MenuItem value="APPROVED">เสร็จสมบูรณ์</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 180, bgcolor: 'white', borderRadius: 1 }}>
                        <InputLabel>กรองตามฝ่าย</InputLabel>
                        <Select value={adminFilterDept} label="กรองตามฝ่าย" onChange={(e) => setAdminFilterDept(Number(e.target.value))}>
                            <MenuItem value={0}>-- ดูงานทุกฝ่าย --</MenuItem>
                            {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </>
            )}

            {profile?.role !== 'ADMIN' && (
                <Button variant={showMyJobsOnly ? "contained" : "outlined"} color={showMyJobsOnly ? "secondary" : "inherit"} startIcon={<FilterIcon />} onClick={() => setShowMyJobsOnly(!showMyJobsOnly)} sx={{ borderColor: showMyJobsOnly ? 'transparent' : '#ddd', color: showMyJobsOnly ? 'white' : '#555', whiteSpace: 'nowrap' }}>
                    {showMyJobsOnly ? "แสดงงานของฉัน" : "แสดงงานทั้งหมด"}
                </Button>
            )}
            
            <Box sx={{ display: 'flex', gap: 2 }}>
                <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)}>
                    <ToggleButton value="table"><ListIcon /></ToggleButton>
                    <ToggleButton value="calendar"><CalendarIcon /></ToggleButton>
                </ToggleButtonGroup>
                
                {/* [Rule 1.1] เฉพาะ Admin สร้างงานได้ */}
                {profile?.role === 'ADMIN' && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreateDialog(true)} sx={{ px: 3, bgcolor: '#D32F2F' }}>สร้างงาน</Button>
                )}
            </Box>
        </Stack>
      </Stack>

      <Paper sx={{ p: 0, borderRadius: 3, overflow: 'hidden' }}>
        {/* 👇👇👇 วางโค้ดชุดนี้แทนที่ส่วนแสดงผล Calendar/Table เดิมครับ 👇👇👇 */}
        {viewMode === 'calendar' ? (
            <Paper sx={{ p: 3, borderRadius: 3 }}>
                <FullCalendar 
                    plugins={[dayGridPlugin, interactionPlugin]} 
                    initialView="dayGridMonth" 
                    events={calendarEvents} 
                    eventClick={handleEventClick} 
                    height="auto" 
                />
            </Paper>
        ) : (
            // ✅ ต้องมี <> ครอบตรงนี้ เพราะข้างในมี 2 ชิ้น (TableContainer + TablePagination)
            <>
                <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2, mb: 2 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#424242' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'white' }}>งาน / สถานที่</TableCell>
                                <TableCell sx={{ color: 'white' }}>ลูกค้า</TableCell>
                                <TableCell sx={{ color: 'white' }}>สถานะ</TableCell>
                                <TableCell sx={{ color: 'white' }}>วันที่เริ่ม</TableCell>
                                <TableCell align="center" sx={{ color: 'white' }}>จัดการ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredJobs
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((job) => (
                                    <TableRow key={job.id} hover>
                                        <TableCell>
                                            <Typography fontWeight="bold">{job.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">{job.location || '-'}</Typography>
                                            {job.is_feedback_required && <Chip label="รอประเมิน" size="small" color="warning" variant="outlined" sx={{ ml: 1, height: 20, fontSize: 10 }} />}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{job.customer_name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{job.customer_phone}</Typography>
                                        </TableCell>
                                        <TableCell>
                                                <Chip 
                                                    label={getStatusLabel(job.status)} // เรียกฟังก์ชันแปลงเป็นภาษาไทย
                                                    size="small" 
                                                    sx={{ 
                                                    bgcolor: getStatusColor(job.status), // เรียกฟังก์ชันเปลี่ยนสี (แดง-เหลือง-เขียว)
                                                    color: 'white',   // ตัวหนังสือสีขาว
                                                    fontWeight: 'bold',
                                                    minWidth: '100px', // กำหนดความกว้างให้เท่ากัน
                                                    border: '1px solid rgba(255,255,255,0.2)' // เพิ่มขอบจางๆ ให้ดูมีมิติ
                                                    }} 
                                                />
                                        </TableCell>
                                        <TableCell>
                      <Stack spacing={0.5}>
                          {/* เวลาเริ่ม (สีเขียว) */}
                          <Stack direction="row" alignItems="center" spacing={1}>
                              <Box sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', px: 0.5, borderRadius: 1, fontSize: '10px', fontWeight: 'bold', minWidth: '35px', textAlign: 'center' }}>
                                  เริ่ม
                              </Box>
                              <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                  {formatDate(job.start_time)}
                              </Typography>
                          </Stack>

                          {/* เวลาสิ้นสุด (สีแดง) */}
                          <Stack direction="row" alignItems="center" spacing={1}>
                              <Box sx={{ bgcolor: '#FFEBEE', color: '#C62828', px: 0.5, borderRadius: 1, fontSize: '10px', fontWeight: 'bold', minWidth: '35px', textAlign: 'center' }}>
                                  สิ้นสุด
                              </Box>
                              <Typography variant="body2" sx={{ fontSize: '0.85rem', color: job.end_time ? 'text.primary' : 'text.disabled' }}>
                                  {job.end_time ? formatDate(job.end_time) : 'ไม่ระบุ'}
                              </Typography>
                          </Stack>
                      </Stack>
                  </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                {profile?.role === 'ADMIN' && (
                                                <IconButton 
                                                    color="primary" 
                                                    size="small"
                                                    onClick={() => handleOpenEdit(job)}
                                                    // ล็อคปุ่มถ้างานอยู่ในสถานะที่ห้ามแก้
                                                    disabled={['APPROVED', 'DONE', 'CANCELLED'].includes(job.status)}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            )}
                                                <IconButton 
                                                    color="error" 
                                                    size="small"
                                                    onClick={() => {
                                                        // เรียก Dialog ยืนยันลบ หรือดูรายละเอียด
                                                        setSelectedJob(job);
                                                        setOpenDetailDialog(true);
                                                    }}
                                                >
                                                    <VisibilityIcon />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            
                            {filteredJobs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        ไม่พบข้อมูลงาน
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* ส่วนแบ่งหน้า */}
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredJobs.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}            
                    onRowsPerPageChange={handleChangeRowsPerPage} 
                    labelRowsPerPage="แสดงหน้าละ:"
                />
            </> 
            // (ปิดถุงห่อ)
        )}
        
        {/* ปิด Paper (ห้ามมี )} เกินมาตรงนี้) */}
        </Paper>
      
      {/* Dialog สร้างงาน (Admin Only) */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} fullWidth maxWidth="md">
         <DialogTitle sx={{ bgcolor: '#D32F2F', color: 'white' }}>สร้างงานใหม่</DialogTitle>
         <DialogContent sx={{ pt: 3 }}>
             {/* ... (เนื้อหา Form สร้างงาน เหมือนเดิม) ... */}
             <Stack spacing={2} sx={{ mt: 1 }}>
                 <TextField label="ชื่องาน" fullWidth value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} />
                 <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField label="ชื่อลูกค้า" fullWidth value={newJob.customer_name} onChange={e => setNewJob({...newJob, customer_name: e.target.value})} InputProps={{ startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} /> }} />
                    <TextField label="เบอร์โทรศัพท์" fullWidth value={newJob.customer_phone} onChange={e => setNewJob({...newJob, customer_phone: e.target.value})} InputProps={{ startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} /> }} />
                 </Stack>
                 <TextField label="สถานที่" fullWidth value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} InputProps={{ startAdornment: <LocationIcon color="action" sx={{ mr: 1 }} /> }} />
                 <TextField label="ลิงก์ Google Map" fullWidth value={newJob.map_url} onChange={e => setNewJob({...newJob, map_url: e.target.value})} InputProps={{ startAdornment: <MapIcon color="action" sx={{ mr: 1 }} /> }} />
                 <FormControl fullWidth>
                    <InputLabel id="create-dept-label">ฝ่ายที่รับผิดชอบ</InputLabel>
                    <Select labelId="create-dept-label" multiple value={newJob.selected_depts} onChange={(e) => { const values = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value; setNewJob({...newJob, selected_depts: values as number[]}); }} input={<OutlinedInput label="ฝ่ายที่รับผิดชอบ" />} renderValue={(selected) => (<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map((value) => { const dept = departments.find(d => d.id === value); return <Chip key={value} label={dept?.name} size="small" />; })}</Box>)} MenuProps={MenuProps}>
                        {departments.map((d) => (<MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>))}
                    </Select>
                 </FormControl>

                  <FormControl fullWidth disabled={newJob.selected_depts.length === 0}>
                      <InputLabel id="create-assign-label">มอบหมายทีมงาน</InputLabel>
                      <Select 
                          labelId="create-assign-label" 
                          multiple 
                          value={newJob.assigned_to} 
                          onChange={(e) => { 
                              const { target: { value } } = e;
                              const valArray = typeof value === 'string' ? value.split(',') : value;
                              
                              // เช็คว่ามีการกดปุ่ม "เลือกทุกคน" หรือไม่
                              if (valArray.includes('ALL')) {
                                  if (newJob.assigned_to.length === deptUsers.length && deptUsers.length > 0) {
                                      // ถ้าเลือกครบอยู่แล้ว -> ให้ยกเลิกทั้งหมด
                                      setNewJob({...newJob, assigned_to: [] });
                                  } else {
                                      // ถ้ายังเลือกไม่ครบ -> ให้เลือกทุกคน
                                      setNewJob({...newJob, assigned_to: deptUsers.map(u => u.user_id) });
                                  }
                              } else {
                                  // กรณีเลือกรายคนปกติ
                                  setNewJob({...newJob, assigned_to: valArray }); 
                              }
                          }} 
                          input={<OutlinedInput label="มอบหมายทีมงาน" />} 
                          renderValue={(selected) => (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {/* ถ้าเลือกทุกคน ให้โชว์คำว่า "ทุกคนในฝ่าย" แทนชื่อยาวๆ */}
                                  {selected.length === deptUsers.length && deptUsers.length > 0 ? (
                                      <Chip label="ทุกคนในฝ่าย" color="primary" size="small" />
                                  ) : (
                                      selected.map((value) => { 
                                          const user = deptUsers.find(u => u.user_id === value); 
                                          return <Chip key={value} label={user ? user.nickname : value} size="small" />; 
                                      })
                                  )}
                              </Box>
                          )} 
                          MenuProps={MenuProps}
                      >
                          {/* --- ปุ่มเลือกทุกคน --- */}
                          <MenuItem value="ALL">
                              <Checkbox 
                                  checked={deptUsers.length > 0 && newJob.assigned_to.length === deptUsers.length} 
                                  indeterminate={newJob.assigned_to.length > 0 && newJob.assigned_to.length < deptUsers.length}
                              />
                              <ListItemText primary="-- เลือกทุกคนในฝ่าย --" primaryTypographyProps={{ fontWeight: 'bold', color: 'primary.main' }} />
                          </MenuItem>
                          <Divider />
                          {/* ------------------ */}

                          {deptUsers.map(u => (
                              <MenuItem key={u.user_id} value={u.user_id}>
                                  <Checkbox checked={newJob.assigned_to.indexOf(u.user_id) > -1} />
                                  <ListItemText primary={`${u.nickname} (${u.first_name})`} secondary={departments.find(d => d.id === u.department_id)?.name} />
                              </MenuItem>
                          ))}
                      </Select>
                  </FormControl>
                 <FormControlLabel control={<Checkbox checked={newJob.is_feedback_required} onChange={(e) => setNewJob({...newJob, is_feedback_required: e.target.checked})} color="primary" />} label="แนบแบบสอบถามความพึงพอใจ" sx={{ border: '1px solid #ddd', borderRadius: 1, px: 1, bgcolor: '#fafafa' }} />
                 <TextField label="รายละเอียด" multiline rows={2} fullWidth value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} />
                 <Stack direction="row" spacing={2}>
                    <TextField type="datetime-local" label="เวลาเริ่ม" fullWidth InputLabelProps={{shrink:true}} value={newJob.start_time} onChange={e => setNewJob({...newJob, start_time: e.target.value})} />
                    <TextField type="datetime-local" label="จบ" fullWidth InputLabelProps={{shrink:true}} value={newJob.end_time} onChange={e => setNewJob({...newJob, end_time: e.target.value})} />
                 </Stack>
             </Stack>
         </DialogContent>
         <DialogActions sx={{ p: 2 }}><Button onClick={() => setOpenCreateDialog(false)} color="inherit">ยกเลิก</Button><Button variant="contained" onClick={handleCreateJob}>บันทึก</Button></DialogActions>
      </Dialog>

      {/* 👇👇👇 วางโค้ดนี้แทนก้อนเดิมเลยครับ 👇👇👇 */}
      <Dialog open={!!editJob} onClose={() => setEditJob(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ bgcolor: '#ED6C02', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon /> แก้ไขรายละเอียดงาน
        </DialogTitle>
        <Dialog open={!!editJob} onClose={() => setEditJob(null)} fullWidth maxWidth="md"> {/* ขยายเป็น md ให้กว้างขึ้น */}
        <DialogTitle sx={{ bgcolor: '#ED6C02', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon /> แก้ไขรายละเอียดงาน
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            
            {/* --- โซนที่ 1: ข้อมูลลูกค้า & สถานที่ --- */}
            <Divider textAlign="left"><Chip label="1. ข้อมูลลูกค้า & สถานที่" size="small" /></Divider>
                <Stack direction="row" spacing={2}>
                    <TextField label="ชื่องาน / อาการเสีย" fullWidth size="small" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                    <Stack direction="row" spacing={2}>
                    <TextField
                        label="เวลาเริ่ม"
                        type="datetime-local"
                        fullWidth
                        size="small"
                        value={editForm.start_time}
                        onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="เวลาจบ"
                        type="datetime-local"
                        fullWidth
                        size="small"
                        value={editForm.end_time} // อย่าลืมเช็คว่าประกาศตัวแปร end_time ใน editForm แล้วนะ
                        onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />
                </Stack>
            </Stack>
            <Stack direction="row" spacing={2}>
                 <TextField label="ชื่อลูกค้า" fullWidth size="small" value={editForm.customer_name} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })} />
                 <TextField label="เบอร์โทรศัพท์" fullWidth size="small" value={editForm.customer_phone} onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })} />
            </Stack>
            <TextField label="สถานที่ / ที่อยู่ / ลิงก์ Map" fullWidth multiline rows={2} size="small" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />

            {/* --- โซนที่ 2: มอบหมายเจ้าหน้าที่ (อัปเกรดใหม่) --- */}
            <Divider textAlign="left" sx={{ mt: 1 }}><Chip label="2. มอบหมายเจ้าหน้าที่" size="small" color="primary" /></Divider>
            
            <Stack spacing={2}>
                {/* 2.1 เลือกแผนก */}
                <FormControl fullWidth size="small">
                    <InputLabel>แผนกที่รับผิดชอบ</InputLabel>
                    <Select
                        multiple
                        value={editForm.department_ids || []}
                        label="แผนกที่รับผิดชอบ"
                        onChange={(e) => {
                            const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                            // เมื่อเปลี่ยนแผนก ให้เคลียร์คนเก่าออกด้วย (เพื่อความชัวร์) หรือจะเก็บไว้ก็ได้
                            setEditForm({ ...editForm, department_ids: val });
                        }}
                        renderValue={(selected: any) => <Box sx={{ display: 'flex', gap: 0.5 }}>{selected.map((val: any) => <Chip key={val} label={departments.find((d:any) => d.id === val)?.name} size="small" />)}</Box>}
                    >
                        {departments.map((dept:any) => <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>)}
                    </Select>
                </FormControl>

                {/* 2.2 เลือกพนักงาน (กรองตามแผนก + ปุ่มเลือกทั้งหมด) */}
                <Box sx={{ border: '1px solid #ddd', p: 2, borderRadius: 2, bgcolor: '#FAFAFA' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" fontWeight="bold">เลือกพนักงานในแผนก</Typography>
                        
                        {/* ปุ่มเลือกทั้งหมด */}
                        <Button 
                            size="small" 
                            variant="outlined" 
                            onClick={() => {
                                // กรองหาเฉพาะคนในแผนกที่เลือก
                                const availableUsers = users.filter(u => editForm.department_ids.includes(u.department_id));
                                // ดึง ID ทั้งหมดมาใส่
                                const allIds = availableUsers.map(u => u.user_id);
                                setEditForm({ ...editForm, assigned_to: allIds });
                            }}
                        >
                            เลือกทุกคนในฝ่าย
                        </Button>
                    </Stack>

                    <FormControl fullWidth size="small">
                        <InputLabel>รายชื่อพนักงาน</InputLabel>
                        <Select
                            multiple
                            value={editForm.assigned_to || []}
                            label="รายชื่อพนักงาน"
                            onChange={(e) => setEditForm({ ...editForm, assigned_to: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                            renderValue={(selected: any) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((val: any) => {
                                        const u = users.find((user:any) => user.user_id === val);
                                        return <Chip key={val} label={u ? `${u.nickname} (${u.first_name})` : val} size="small" avatar={<Avatar src={u?.avatar_url} sx={{ width: 24, height: 24 }} />} />;
                                    })}
                                </Box>
                            )}
                        >
                            {/* 👇 Logic กรอง: แสดงเฉพาะ User ที่อยู่ department_ids ที่เลือกไว้ 👇 */}
                            {users
                                .filter((u:any) => editForm.department_ids.includes(u.department_id)) // กรองตรงนี้
                                .map((u:any) => (
                                    <MenuItem key={u.user_id} value={u.user_id}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Avatar src={u.avatar_url} sx={{ width: 24, height: 24 }} />
                                            <Typography>{u.nickname} - {u.first_name} {u.last_name}</Typography>
                                        </Stack>
                                    </MenuItem>
                            ))}
                            
                            {/* กรณีเลือกแผนกแล้วไม่มีพนักงาน */}
                            {users.filter((u:any) => editForm.department_ids.includes(u.department_id)).length === 0 && (
                                <MenuItem disabled>
                                    <Typography variant="caption" color="text.secondary">-- ไม่พบพนักงานในแผนกที่เลือก --</Typography>
                                </MenuItem>
                            )}
                        </Select>
                    </FormControl>
                </Box>
            </Stack>

            {/* --- โซนที่ 3: อื่นๆ --- */}
            <Divider textAlign="left" sx={{ mt: 1 }}><Chip label="3. รายละเอียดอื่นๆ" size="small" /></Divider>
            <TextField label="รายละเอียดเพิ่มเติม" fullWidth multiline rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            <FormControlLabel control={<Switch checked={editForm.is_feedback_required} onChange={(e) => setEditForm({ ...editForm, is_feedback_required: e.target.checked })} color="warning" />} label="งานนี้ต้องมีการประเมินผล (Feedback)" />

          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditJob(null)} color="inherit">ยกเลิก</Button>
          <Button onClick={handleUpdateJob} variant="contained" color="warning" startIcon={<SaveIcon />}>บันทึกการแก้ไข</Button>
        </DialogActions>
      </Dialog>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditJob(null)} color="inherit">ยกเลิก</Button>
          {/* ปุ่มบันทึก */}
          <Button onClick={handleUpdateJob} variant="contained" color="warning" startIcon={<SaveIcon />}>
            บันทึกการแก้ไข
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog รายละเอียด (ตรวจงาน) */}
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
                      
                      
                      {/* --- [NEW] แสดง Feedback แบบละเอียด 6 ข้อ (เฉพาะ Admin เห็น) --- */}
                      {jobFeedback && profile?.role === 'ADMIN' && (
                          <Box sx={{ p: 2, bgcolor: '#E8F5E9', borderRadius: 2, border: '1px solid #C8E6C9', mb: 2 }}>
                              <Typography variant="h6" gutterBottom color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  📝 ผลการประเมินจากลูกค้า
                              </Typography>
                              
                              <Divider sx={{ my: 1, borderColor: '#A5D6A7' }} />
                              
                              {/* Grid แสดงคะแนน 6 หัวข้อ */}
                              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                                  <Box><Typography variant="caption" color="text.secondary">1. ความสุภาพ</Typography><br/><Rating value={jobFeedback.politeness} readOnly size="small" /></Box>
                                  <Box><Typography variant="caption" color="text.secondary">2. ความรวดเร็ว</Typography><br/><Rating value={jobFeedback.service_speed} readOnly size="small" /></Box>
                                  <Box><Typography variant="caption" color="text.secondary">3. ความเรียบร้อย</Typography><br/><Rating value={jobFeedback.repair_quality} readOnly size="small" /></Box>
                                  <Box><Typography variant="caption" color="text.secondary">4. ความสะอาด</Typography><br/><Rating value={jobFeedback.testing_check} readOnly size="small" /></Box>
                                  <Box><Typography variant="caption" color="text.secondary">5. ตรงต่อเวลา</Typography><br/><Rating value={jobFeedback.contact_convenience} readOnly size="small" /></Box>
                                  <Box><Typography variant="caption" color="text.secondary" fontWeight="bold">6. ภาพรวม</Typography><br/><Rating value={jobFeedback.overall_satisfaction} readOnly size="small" /></Box>
                              </Box>

                              {jobFeedback.suggestion && (
                                  <Box sx={{ mt: 2, bgcolor: 'white', p: 1.5, borderRadius: 1, border: '1px dashed #A5D6A7' }}>
                                      <Typography variant="caption" fontWeight="bold" color="success.main">ข้อเสนอแนะ:</Typography>
                                      <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 0.5 }}>"{jobFeedback.suggestion}"</Typography>
                                  </Box>
                              )}

                              {jobFeedback.signature_url && (
                                  <Box mt={2} textAlign="center">
                                      <Typography variant="caption" color="text.secondary">ลายเซ็นลูกค้า:</Typography>
                                      <Box sx={{ border: '1px solid #ddd', bgcolor: 'white', borderRadius: 1, p: 1, mt: 0.5, display: 'inline-block' }}>
                                          <img src={jobFeedback.signature_url} alt="ลายเซ็น" style={{ height: 50, objectFit: 'contain' }} />
                                      </Box>
                                  </Box>
                              )}
                          </Box>
                      )}

                      {selectedJob?.customer_signature && (
                            <Box sx={{ mt: 2, textAlign: 'center', border: '1px dashed #ccc', p: 2, borderRadius: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">ลายเซ็นลูกค้า</Typography>
                                <img src={selectedJob.customer_signature} alt="Signature" style={{ maxHeight: 100, maxWidth: '100%' }} />
                            </Box>
                     )}

                      {selectedJob.customer_signature && profile?.role === 'ADMIN' && (
                          <Box sx={{ mt: 2, p: 2, border: '1px dashed #BDBDBD', borderRadius: 2, bgcolor: '#FAFAFA', textAlign: 'center' }}>
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                  ลายเซ็นลูกค้า (ผู้รับงาน)
                              </Typography>
                              <Box 
                                  component="img" 
                                  src={selectedJob.customer_signature} 
                                  alt="ลายเซ็นลูกค้า" 
                                  sx={{ 
                                      maxHeight: 120, 
                                      maxWidth: '100%', 
                                      objectFit: 'contain',
                                      filter: 'contrast(1.2)'
                                  }} 
                              />
                          </Box>
                      )}

                      <Box sx={{ p: 2, bgcolor: '#FFF3E0', borderRadius: 2, border: '1px solid #FFE0B2' }}><Stack direction="row" spacing={1} alignItems="center" mb={1}><PersonIcon color="warning" /><Typography variant="subtitle2" fontWeight="bold">ข้อมูลลูกค้า</Typography></Stack><Typography variant="body1">คุณ {selectedJob.customer_name || '-'}</Typography><Stack direction="row" spacing={1} alignItems="center" mt={0.5}><PhoneIcon fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">{selectedJob.customer_phone || '-'}</Typography></Stack></Box>
                      <Box sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2 }}><Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{selectedJob.description || "-"}</Typography></Box>
                    {/* เรียกใช้ฟังก์ชันแสดงรูปภาพ (รองรับหลายรูป) */}
                    {selectedJob && renderJobImages(selectedJob.image_url)}
                      
                      {/* Status Label */}
                      <Box sx={{ textAlign: 'center', mt: 2 }}>
                          <Typography variant="caption" color="text.secondary">สถานะปัจจุบัน</Typography>
                          <br />
                          <Chip label={getStatusLabel(selectedJob.status)} color="primary" sx={{ mt: 0.5 }} />
                      </Box>

                      {/* --- Admin Action Buttons --- */}
                      {profile?.role === 'ADMIN' && selectedJob.status === 'WAITING_REVIEW' && (
                         <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                             <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => updateJobStatus(selectedJob.id, 'PENDING', 'ต้องการตีกลับงานนี้ไปสถานะ "รอดำเนินการ" หรือไม่?')}>ตีกลับ (ไม่ผ่าน)</Button>
                             <Button variant="contained" color="success" startIcon={<CheckIcon />} onClick={() => updateJobStatus(selectedJob.id, 'APPROVED', 'ยืนยันอนุมัติงานนี้?')}>อนุมัติ (ผ่าน)</Button>
                         </Stack>
                      )}
                  </Stack>
              )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
              {/* [Rule 1.1] Admin Only: Edit/Delete (และต้องยังไม่ Lock) */}
              {profile?.role === 'ADMIN' && !isJobLocked ? (
                <Stack direction="row" spacing={1}>
                    <Button color="error" startIcon={<DeleteIcon />} onClick={handleDeleteJob}>
                        ลบ
                    </Button>
                    
                    {/* 👇👇👇 แก้ตรงนี้ครับ 👇👇👇 */}
                    <Button 
                        color="inherit" 
                        startIcon={<EditIcon />} 
                        onClick={() => {
                            setOpenDetailDialog(false); 
                            handleOpenEdit(selectedJob); 
                        }}
                    >
                        แก้ไข
                    </Button>
                    {/* 👆👆👆 จบส่วนแก้ 👆👆👆 */}
                    
                </Stack>
              ) : <Box />}
              <Button variant="outlined" onClick={() => setOpenDetailDialog(false)}>ปิด</Button>
          </DialogActions>
      </Dialog>
    </Layout>
    
  );
}
export default DashboardPage;