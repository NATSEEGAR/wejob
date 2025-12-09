import React, { useEffect, useState, useCallback } from 'react';
import { 
  Typography, Button, Paper, Chip, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, InputAdornment,
  ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  MenuItem, Select, InputLabel, FormControl, IconButton, Avatar, OutlinedInput,
  Checkbox, ListItemText, FormControlLabel, Switch, Divider, TablePagination, Box, Rating, Radio, RadioGroup, FormLabel
} from '@mui/material';

import { 
  CalendarMonth as CalendarIcon, List as ListIcon, 
  Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon,
  Add as AddIcon, LocationOn as LocationIcon, Image as ImageIcon,
  Person as PersonIcon, Phone as PhoneIcon, Map as MapIcon, FilterAlt as FilterIcon, 
  Visibility as VisibilityIcon, Save as SaveIcon
} from '@mui/icons-material'; 

import { supabase } from '../supabaseClient';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { confirmAction, showSuccess, showError } from '../utils/alertUtils';
import Layout from '../components/Layout';
import dayjs from 'dayjs';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = { PaperProps: { style: { maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP, width: 250 } } };

const TIME_SLOTS = [
    { value: 'MORNING', label: 'ช่วงเช้า', start: 9, end: 12 },
    { value: 'AFTERNOON', label: 'ช่วงบ่าย', start: 13, end: 16 },
    { value: 'EVENING', label: 'ช่วงเย็น', start: 17, end: 20 },
    { value: 'ALL_DAY', label: 'ทั้งวัน', start: 0, end: 23 },
];

const getSlotFromTime = (startStr: string) => {
    if (!startStr) return 'ALL_DAY';
    const hour = dayjs(startStr).hour();
    if (hour < 12) return 'MORNING';
    if (hour >= 13 && hour < 17) return 'AFTERNOON';
    if (hour >= 17) return 'EVENING';
    return 'ALL_DAY';
};

const getTimesFromSlot = (dateStr: string, slotValue: string) => {
    const slot = TIME_SLOTS.find(s => s.value === slotValue) || TIME_SLOTS[3]; 
    const baseDate = dayjs(dateStr);  
    let start, end;
    if (slotValue === 'ALL_DAY') {
        start = baseDate.hour(0).minute(0).second(0);
        end = baseDate.hour(23).minute(59).second(59);
    } else {
        start = baseDate.hour(slot.start).minute(0).second(0);
        end = baseDate.hour(slot.end).minute(0).second(0);
    }
    
    return { start_time: start.toISOString(), end_time: end.toISOString() };
};

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
      case 'DONE': return 'เสร็จสมบูรณ์';
      case 'CANCELLED': return 'ยกเลิก';
      default: return status;
    }
};

// ✅ ฟังก์ชันช่วยเช็คและแสดงผลเวลา (ฉบับอัปเกรด เช็คนาทีด้วย)
const getDisplayTimeInfo = (startIso: string, endIso: string) => {
    const s = dayjs(startIso);
    const e = dayjs(endIso);
    
    const sh = s.hour(); const sm = s.minute();
    const eh = e.hour(); const em = e.minute();

    const isMorning = sh === 9 && sm === 0 && eh === 12 && em === 0;
    const isAfternoon = sh === 13 && sm === 0 && eh === 16 && em === 0;
    const isEvening = sh === 17 && sm === 0 && eh === 20 && em === 0;
    
    const isAllDay = sh === 0 && sm === 0 && eh === 23 && em === 59;

    if (isMorning) return { label: 'ช่วงเช้า', isSlot: true };
    if (isAfternoon) return { label: 'ช่วงบ่าย', isSlot: true };
    if (isEvening) return { label: 'ช่วงเย็น', isSlot: true };
    if (isAllDay) return { label: 'ทั้งวัน', isSlot: true };

    return { label: `${s.format('HH:mm')} - ${e.format('HH:mm')}`, isSlot: false };
};

function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]); 
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [deptUsers, setDeptUsers] = useState<any[]>([]);
  
  const [page, setPage] = useState(0); 
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('table'); 
  const [searchQuery, setSearchQuery] = useState('');

  const [adminFilterDept, setAdminFilterDept] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showMyJobsOnly, setShowMyJobsOnly] = useState(false); 

  const [jobFeedback, setJobFeedback] = useState<any>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  
  const [newJob, setNewJob] = useState({ 
      title: '', location: '', map_url: '', description: '', 
      date: dayjs().format('YYYY-MM-DD'), 
      end_date: dayjs().format('YYYY-MM-DD'),
      time_slot: 'ALL_DAY',
      time_mode: 'SLOT', 
      manual_start: '00:00',
      manual_end: '00:00',
      is_multi_day: false,
      assigned_to: [] as string[], 
      customer_name: '', customer_phone: '', selected_depts: [] as number[], is_feedback_required: false 
  });
  
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  
  const [editJob, setEditJob] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({
      title: '', description: '', customer_name: '', customer_phone: '', location: '', 
      date: '', 
      end_date: '',
      time_slot: '',
      time_mode: 'SLOT',
      manual_start: '00:00',
      manual_end: '00:00', 
      is_multi_day: false,
      department_ids: [], assigned_to: [], is_feedback_required: true
  });

  const fetchJobs = useCallback(async (userProfile: any = profile) => {
    const currentProfile = userProfile || profile;
    if (!currentProfile) return;

    let query = supabase
    .from('Jobs')
    .select(`*, JobAssignments (user_id, Profiles (nickname, first_name, last_name))`)
    .order('start_time', { ascending: true });

    if (currentProfile.role !== 'ADMIN') {
        if (currentProfile.department_id) {
            query = query.contains('department_ids', [currentProfile.department_id]);
        }
    }
    const { data, error } = await query;
    if (error) console.error(error); else setJobs(data || []);
  }, [profile]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileData } = await supabase.from('Profiles').select('*').eq('user_id', user.id).single();
      setProfile(profileData);
      
      const { data: depts } = await supabase.from('Departments').select('*').order('id');
      if (depts) {
          const onlyRobot = depts.filter(d => d.name.includes('หุ่นยนต์'));
          setDepartments(onlyRobot); 
      } else {
          setDepartments([]);
      }

      const { data: userList } = await supabase.from('Profiles').select('*').neq('role', 'ADMIN').order('first_name');
      setUsers(userList || []);

      fetchJobs(profileData);
    };
    fetchData();
  }, [fetchJobs]);

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

  const filteredJobs = jobs.filter((job) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
          (job.title && job.title.toLowerCase().includes(query)) ||
          (job.location && job.location.toLowerCase().includes(query)) ||
          (job.customer_name && job.customer_name.toLowerCase().includes(query)) ||
          (job.customer_phone && job.customer_phone.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;

      if (filterStatus !== 'ALL' && job.status !== filterStatus) return false;

      if (profile?.role === 'ADMIN') {
          if (adminFilterDept !== 0 && !job.department_ids?.includes(adminFilterDept)) return false;
      } 
      
      if (showMyJobsOnly && profile) {
          const isAssigned = job.JobAssignments?.some((assign: any) => assign.user_id === profile.user_id);
          const isLegacyAssigned = !isAssigned && job.assigned_to === profile.user_id;
          if (!isAssigned && !isLegacyAssigned) return false;
      }
      return true;
  });

  const handleCreateJob = async () => {
    // ... (ส่วนเช็คข้อมูลต้นฟังก์ชัน เหมือนเดิม) ...
    if (!newJob.title || !newJob.date || !newJob.location || newJob.selected_depts.length === 0) {
      showError("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลและเลือกฝ่ายรับผิดชอบ"); return;
    }
    if (newJob.is_multi_day && !newJob.end_date) {
        showError("ข้อมูลไม่ครบ", "กรุณาระบุวันที่สิ้นสุดสำหรับงานต่อเนื่อง"); return;
    }

    if (!(await confirmAction('ยืนยันการมอบหมาย', `สร้างงาน "${newJob.title}"?`))) return;

    // ✅ ส่วนคำนวณเวลา (ของ Create ใช้ newJob)
    let start_time_iso, end_time_iso;
    let sTime, eTime;

    if (newJob.time_mode === 'SLOT') {
        const times = getTimesFromSlot(newJob.date, newJob.time_slot);
        sTime = dayjs(times.start_time).format('HH:mm');
        eTime = dayjs(times.end_time).format('HH:mm');
    } else {
        sTime = newJob.manual_start;
        eTime = newJob.manual_end;
        if (!sTime || !eTime) {
            showError("เวลาไม่ครบ", "กรุณาระบุเวลาเริ่มและสิ้นสุดให้ครบถ้วน"); return;
        }
    }

    start_time_iso = dayjs(`${newJob.date}T${sTime}:00`).toISOString();

    if (newJob.is_multi_day) {
        end_time_iso = dayjs(`${newJob.end_date}T${eTime}:00`).toISOString();
    } else {
        end_time_iso = dayjs(`${newJob.date}T${eTime}:00`).toISOString();
    }

    if (dayjs(end_time_iso).isBefore(dayjs(start_time_iso))) {
         showError("เวลาไม่ถูกต้อง", "เวลาสิ้นสุดต้องหลังจากเวลาเริ่มต้น"); return;
    }

    const { data: jobData, error } = await supabase.from('Jobs').insert([{
        title: newJob.title, location: newJob.location, map_url: newJob.map_url, description: newJob.description,
        start_time: start_time_iso, 
        end_time: end_time_iso,
        status: 'PENDING', customer_name: newJob.customer_name, customer_phone: newJob.customer_phone,
        department_ids: newJob.selected_depts, is_feedback_required: newJob.is_feedback_required
    }]).select().single();

    if (error || !jobData) { showError("เกิดข้อผิดพลาด", error?.message || ''); return; }

    if (newJob.assigned_to.length > 0) {
        const assignments = newJob.assigned_to.map(userId => ({ job_id: jobData.id, user_id: userId }));
        await supabase.from('JobAssignments').insert(assignments);
    }
    showSuccess("สร้างงานสำเร็จ"); setOpenCreateDialog(false); fetchJobs(profile);
    
    setNewJob({ 
        title: '', location: '', map_url: '', description: '', 
        date: dayjs().format('YYYY-MM-DD'), end_date: dayjs().format('YYYY-MM-DD'),
        time_slot: 'ALL_DAY', is_multi_day: false,
        time_mode: 'SLOT', 
        manual_start: '00:00', 
        manual_end: '00:00',
        assigned_to: [], customer_name: '', customer_phone: '', selected_depts: [], is_feedback_required: false 
    });
  };

  const handleOpenEdit = async (job: any) => {
    setEditJob(job);
    const { data: assignments } = await supabase.from('JobAssignments').select('user_id').eq('job_id', job.id);
    const currentAssignees = assignments?.map((a: any) => a.user_id) || [];

    const start = dayjs(job.start_time);
    const end = dayjs(job.end_time);
    const isMulti = !start.isSame(end, 'day');

    setEditForm({
      title: job.title || '', description: job.description || '', customer_name: job.customer_name || '', customer_phone: job.customer_phone || '', location: job.location || '',
      
      date: start.format('YYYY-MM-DD'),
      end_date: end.format('YYYY-MM-DD'),
      time_slot: isMulti ? 'ALL_DAY' : getSlotFromTime(job.start_time),
      is_multi_day: isMulti,

      department_ids: job.department_ids || [], assigned_to: currentAssignees, is_feedback_required: job.is_feedback_required ?? true
    });
  };

  const handleUpdateJob = async () => {
      if (!editJob) return;
      if (!(await confirmAction('บันทึกการแก้ไข?', 'ข้อมูลเดิมจะถูกเปลี่ยนแปลง'))) return;

      try {
          // ✅ ส่วนคำนวณเวลา (ของ Update ใช้ editForm)
          let start_time_iso, end_time_iso;
          let sTime, eTime;

          if (editForm.time_mode === 'SLOT') {
              const times = getTimesFromSlot(editForm.date, editForm.time_slot);
              sTime = dayjs(times.start_time).format('HH:mm');
              eTime = dayjs(times.end_time).format('HH:mm');
          } else {
              sTime = editForm.manual_start;
              eTime = editForm.manual_end;
              if (!sTime || !eTime) {
            showError("เวลาไม่ครบ", "กรุณาระบุเวลาเริ่มและสิ้นสุดให้ครบถ้วน"); return;
        }
          }

          start_time_iso = dayjs(`${editForm.date}T${sTime}:00`).toISOString();

          if (editForm.is_multi_day) {
              end_time_iso = dayjs(`${editForm.end_date}T${eTime}:00`).toISOString();
          } else {
              end_time_iso = dayjs(`${editForm.date}T${eTime}:00`).toISOString();
          }

          if (dayjs(end_time_iso).isBefore(dayjs(start_time_iso))) {
               showError("เวลาไม่ถูกต้อง", "เวลาสิ้นสุดต้องหลังจากเวลาเริ่มต้น"); return;
          }

          const { error } = await supabase.from('Jobs').update({
              title: editForm.title, description: editForm.description, customer_name: editForm.customer_name, customer_phone: editForm.customer_phone, location: editForm.location,
              start_time: start_time_iso, 
              end_time: end_time_iso,
              department_ids: editForm.department_ids, is_feedback_required: editForm.is_feedback_required
          }).eq('id', editJob.id);

          if (error) throw error;

          await supabase.from('JobAssignments').delete().eq('job_id', editJob.id);
          if (editForm.assigned_to && editForm.assigned_to.length > 0) {
              const newAssignments = editForm.assigned_to.map((userId: string) => ({ job_id: editJob.id, user_id: userId }));
              await supabase.from('JobAssignments').insert(newAssignments);
          }

          showSuccess("แก้ไขสำเร็จ"); setEditJob(null); fetchJobs(profile);
      } catch (err: any) { showError("เกิดข้อผิดพลาด", err.message); }
  };

  const handleDeleteJob = async () => { 
      if(!selectedJob) return; 
      if (!(await confirmAction('ลบงานถาวร?', `ลบงาน "${selectedJob.title}"?`, 'ลบเลย', '#D32F2F'))) return; 
      
      if (selectedJob.image_url) { 
          try { 
              const fileName = selectedJob.image_url.split('/').pop(); 
              if(fileName) await supabase.storage.from('job-evidence').remove([fileName]); 
          } catch (e) {} 
      }
      const { error } = await supabase.from('Jobs').delete().eq('id', selectedJob.id); 
      if (!error) { showSuccess("ลบงานเรียบร้อย"); setOpenDetailDialog(false); fetchJobs(profile); } 
      else { showError("ลบไม่ได้", error.message); }
  };

  const handleChangePage = (event: unknown, newPage: number) => { setPage(newPage); };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };
  
  const updateJobStatus = async (id: any, status: any, msg: string) => {
    if (!(await confirmAction('ยืนยันการดำเนินการ', msg))) return;
    const { error } = await supabase.from('Jobs').update({ status }).eq('id', id);
    if (!error) { showSuccess("บันทึกสถานะเรียบร้อย"); setOpenDetailDialog(false); fetchJobs(profile); }
    else { showError("เกิดข้อผิดพลาด", error.message); }
  };

  const calendarEvents = filteredJobs.map((job: any) => {
      // ✅ แก้ตรงนี้เหมือนกัน
      const info = getDisplayTimeInfo(job.start_time, job.end_time);
      const slotLabel = info.label;

      return { 
          id: job.id, 
          title: `[${slotLabel}] ${job.title}`, 
          start: job.start_time, 
          end: job.end_time, 
          color: getStatusColor(job.status), 
          extendedProps: { ...job } 
      };
  });

  const handleEventClick = (info: any) => { openJobDetail(info.event.extendedProps); };
  
  const openJobDetail = (job: any) => { 
    // ✅ แก้ตรงนี้: ใช้ getDisplayTimeInfo แทนการเดา Slot
    const info = getDisplayTimeInfo(job.start_time, job.end_time);
    
    const dateFormatted = dayjs(job.start_time).format('DD/MM/YYYY');
    
    // ส่ง info.label ไปแสดงผลเลย (จะได้เป็น "12:00 - 17:00" หรือ "ช่วงเช้า" ตามจริง)
    setSelectedJob({ ...job, display_date: dateFormatted, display_slot: info.label }); 
    
    fetchJobFeedback(job.id); 
    setOpenDetailDialog(true); 
  }

  const renderJobImages = (imageUrlData: any) => {
    if (!imageUrlData) return null;
    let urls: string[] = [];
    if (Array.isArray(imageUrlData)) { urls = imageUrlData; } 
    else if (typeof imageUrlData === 'string') {
      const trimmed = imageUrlData.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try { const parsed = JSON.parse(trimmed); urls = Array.isArray(parsed) ? parsed : [trimmed]; } catch (e) { urls = [trimmed]; }
      } else { urls = [trimmed]; }
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
            <Box key={index} component="img" src={url} alt={`หลักฐาน ${index + 1}`} sx={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 2, border: '1px solid #ccc', cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />
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
            <TextField placeholder="ค้นหางาน..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }} sx={{ bgcolor: 'white', borderRadius: 1, minWidth: 200 }} />
            
            <FormControl size="small" sx={{ minWidth: 150, bgcolor: 'white', borderRadius: 1 }}>
                <InputLabel>สถานะงาน</InputLabel>
                <Select value={filterStatus} label="สถานะงาน" onChange={(e) => setFilterStatus(e.target.value)}>
                    <MenuItem value="ALL">-- ทั้งหมด --</MenuItem>
                    <MenuItem value="PENDING">รอดำเนินการ</MenuItem>
                    <MenuItem value="IN_PROGRESS">กำลังดำเนินการ</MenuItem>
                    <MenuItem value="WAITING_REVIEW">รอตรวจงาน</MenuItem>
                    <MenuItem value="APPROVED">เสร็จสมบูรณ์</MenuItem>
                </Select>
            </FormControl>

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
            
            <Box sx={{ display: 'flex', gap: 2 }}>
                <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)}>
                    <ToggleButton value="table"><ListIcon /></ToggleButton>
                    <ToggleButton value="calendar"><CalendarIcon /></ToggleButton>
                </ToggleButtonGroup>
                
                {profile?.role === 'ADMIN' && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreateDialog(true)} sx={{ px: 3, bgcolor: '#D32F2F' }}>สร้างงาน</Button>
                )}
            </Box>
        </Stack>
      </Stack>

      <Paper sx={{ p: 0, borderRadius: 3, overflow: 'hidden' }}>
        {viewMode === 'calendar' ? (
            <Paper sx={{ p: 3, borderRadius: 3 }}>
                <FullCalendar 
                    plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" 
                    events={calendarEvents} eventClick={handleEventClick} height="auto" 
                    displayEventTime={false}
                />
            </Paper>
        ) : (
            <>
                <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2, mb: 2 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#424242' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'white' }}>งาน / สถานที่</TableCell>
                                <TableCell sx={{ color: 'white' }}>ลูกค้า</TableCell>
                                <TableCell sx={{ color: 'white' }}>สถานะ</TableCell>
                                <TableCell sx={{ color: 'white' }}>วันที่ / ช่วงเวลา</TableCell>
                                <TableCell align="center" sx={{ color: 'white' }}>จัดการ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredJobs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((job) => {
                                // ✅ 1. คำนวณวันที่เริ่มและจบ
                                const start = dayjs(job.start_time);
                                const end = dayjs(job.end_time);
                                const isMultiDay = !start.isSame(end, 'day'); // เช็คว่าเป็นคนละวันไหม

                                // ✅ 2. สร้างข้อความแสดงผล (ถ้าหลายวันให้โชว์ช่วง, ถ้าวันเดียวโชว์แค่วันนั้น)
                                const dateShow = isMultiDay 
                                    ? `${start.format('DD/MM/YYYY')} - ${end.format('DD/MM/YYYY')}` 
                                    : start.format('DD/MM/YYYY');

                                const slotLabel = TIME_SLOTS.find(s => s.value === getSlotFromTime(job.start_time))?.label;

                                return (
                                <TableRow key={job.id} hover>
                                    <TableCell>
                                        <Typography fontWeight="bold">{job.title}</Typography>
                                        <Typography variant="caption" color="text.secondary">{job.location || '-'}</Typography>
                                        {job.is_feedback_required && <Chip label="ต้องประเมิน" size="small" color="warning" variant="outlined" sx={{ ml: 1, height: 20, fontSize: 10 }} />}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{job.customer_name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{job.customer_phone}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={getStatusLabel(job.status)} size="small" sx={{ bgcolor: getStatusColor(job.status), color: 'white', fontWeight: 'bold', minWidth: 100 }} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold" sx={{ whiteSpace: 'nowrap' }}>
                                            {dateShow}
                                        </Typography>
                                        
                                        {/* ✅ ต้องเรียกใช้ฟังก์ชัน getDisplayTimeInfo ตรงนี้ครับ */}
                                        {(() => {
                                            const info = getDisplayTimeInfo(job.start_time, job.end_time);
                                            return (
                                                <Chip 
                                                    label={info.label} 
                                                    size="small" 
                                                    variant={info.isSlot ? "filled" : "outlined"} 
                                                    color={info.isSlot ? "default" : "primary"}
                                                    sx={{ mt: 0.5, fontSize: '0.75rem' }} 
                                                />
                                            );
                                        })()}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            {profile?.role === 'ADMIN' && (
                                            <IconButton color="primary" size="small" onClick={() => handleOpenEdit(job)} disabled={['APPROVED', 'DONE', 'CANCELLED'].includes(job.status)}>
                                                <EditIcon />
                                            </IconButton>
                                            )}
                                            <IconButton color="info" size="small" onClick={() => openJobDetail(job)}>
                                                <VisibilityIcon />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                            {/* ... (ส่วนแสดงเมื่อไม่มีข้อมูล เหมือนเดิม) ... */}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredJobs.length}
                    rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="แสดงหน้าละ:"
                />
            </>
        )}
      </Paper>
      
      {/* Dialog สร้างงาน */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} fullWidth maxWidth="md">
         <DialogTitle sx={{ bgcolor: '#D32F2F', color: 'white' }}>สร้างงานใหม่</DialogTitle>
         <DialogContent sx={{ pt: 3 }}>
             <Stack spacing={2} sx={{ mt: 1 }}>
                 {/* 1. ชื่องาน */}
                 <TextField label="ชื่องาน" fullWidth value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} />
                 
                 {/* 2. ข้อมูลลูกค้า (เรียงแนวนอน) */}
                 <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField label="ชื่อลูกค้า" fullWidth value={newJob.customer_name} onChange={e => setNewJob({...newJob, customer_name: e.target.value})} InputProps={{ startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} /> }} />
                    <TextField label="เบอร์โทรศัพท์" fullWidth value={newJob.customer_phone} onChange={e => setNewJob({...newJob, customer_phone: e.target.value})} InputProps={{ startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} /> }} />
                 </Stack>

                 {/* 3. สถานที่ */}
                 <TextField label="สถานที่" fullWidth value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} InputProps={{ startAdornment: <LocationIcon color="action" sx={{ mr: 1 }} /> }} />
                 <TextField label="ลิงก์ Google Map" fullWidth value={newJob.map_url} onChange={e => setNewJob({...newJob, map_url: e.target.value})} InputProps={{ startAdornment: <MapIcon color="action" sx={{ mr: 1 }} /> }} />
                 
                 {/* 4. รายละเอียดเพิ่มเติม (Multiline) */}
                 <TextField 
                    label="รายละเอียดงานเพิ่มเติม" 
                    fullWidth 
                    multiline 
                    rows={4} 
                    value={newJob.description} 
                    onChange={e => setNewJob({...newJob, description: e.target.value})} 
                    placeholder="เช่น อาการเสีย, อุปกรณ์ที่ต้องเตรียม, หมายเหตุถึงช่าง..."
                 />
                 
                 {/* 5. Checkbox งานต่อเนื่อง */}
                 <FormControlLabel 
                    control={
                        <Checkbox 
                            checked={newJob.is_multi_day} 
                            onChange={(e) => setNewJob({ ...newJob, is_multi_day: e.target.checked })} 
                        />
                    } 
                    label="งานต่อเนื่องหลายวัน" 
                    sx={{ mt: 1 }}
                 />

                 {/* ✅ 1. เพิ่มปุ่มเลือกโหมดเวลา (วางต่อจาก Checkbox งานต่อเนื่อง) */}
                 <FormControl component="fieldset" sx={{ mt: 1, mb: 1 }}>
                    <FormLabel component="legend" sx={{ fontSize: '0.8rem' }}>รูปแบบเวลา</FormLabel>
                    <RadioGroup 
                        row 
                        value={newJob.time_mode} 
                        onChange={(e) => setNewJob({ ...newJob, time_mode: e.target.value })}
                    >
                        <FormControlLabel value="SLOT" control={<Radio size="small" />} label="เลือกช่วงเวลา (เช้า/บ่าย)" />
                        <FormControlLabel value="SPECIFIC" control={<Radio size="small" />} label="ระบุเวลาเอง (เวลา:นาที)" />
                    </RadioGroup>
                 </FormControl>

                 {/* ✅ 2. ส่วนกรอกวันที่และเวลา (ปรับเปลี่ยนตามโหมดที่เลือก) */}
                 <Stack direction="row" spacing={2} alignItems="flex-start">
                    {/* วันที่เริ่ม (แสดงเสมอ) */}
                    <TextField 
                        label={newJob.is_multi_day ? "วันที่เริ่ม" : "วันที่"} 
                        type="date" fullWidth InputLabelProps={{ shrink: true }} 
                        value={newJob.date} onChange={e => setNewJob({...newJob, date: e.target.value})} 
                    />

                    {/* วันที่สิ้นสุด (แสดงเฉพาะตอนติ๊กงานต่อเนื่อง) */}
                    {newJob.is_multi_day && (
                        <TextField 
                            label="วันที่สิ้นสุด" type="date" fullWidth InputLabelProps={{ shrink: true }} 
                            value={newJob.end_date} onChange={e => setNewJob({...newJob, end_date: e.target.value})} 
                        />
                    )}

                    {/* ส่วนเลือกเวลา: เปลี่ยนไปมาระหว่าง Dropdown กับ นาฬิกา */}
                    {newJob.time_mode === 'SLOT' ? (
                        <FormControl fullWidth>
                            <InputLabel>ช่วงเวลา</InputLabel>
                            <Select value={newJob.time_slot} label="ช่วงเวลา" onChange={(e) => setNewJob({...newJob, time_slot: e.target.value})}>
                                {TIME_SLOTS.map((slot) => (<MenuItem key={slot.value} value={slot.value}>{slot.label}</MenuItem>))}
                            </Select>
                        </FormControl>
                    ) : (
                        // โหมดระบุเวลาเอง: แสดงช่องกรอก 2 ช่อง
                        <Stack direction="row" spacing={1} sx={{ minWidth: 220 }}>
                             <TextField 
                                label="เริ่ม" type="time" fullWidth InputLabelProps={{ shrink: true }} 
                                value={newJob.manual_start} onChange={e => setNewJob({...newJob, manual_start: e.target.value})} 
                             />
                             <TextField 
                                label="ถึง" type="time" fullWidth InputLabelProps={{ shrink: true }} 
                                value={newJob.manual_end} onChange={e => setNewJob({...newJob, manual_end: e.target.value})} 
                             />
                        </Stack>
                    )}
                 </Stack>

                 {/* 7. เลือกฝ่ายและทีมงาน */}
                 <FormControl fullWidth>
                    <InputLabel id="create-dept-label">ฝ่ายที่รับผิดชอบ</InputLabel>
                    <Select labelId="create-dept-label" multiple value={newJob.selected_depts} onChange={(e) => { const values = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value; setNewJob({...newJob, selected_depts: values as number[]}); }} input={<OutlinedInput label="ฝ่ายที่รับผิดชอบ" />} renderValue={(selected) => (<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map((value) => { const dept = departments.find(d => d.id === value); return <Chip key={value} label={dept?.name} size="small" />; })}</Box>)} MenuProps={MenuProps}>
                        {departments.map((d) => (<MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>))}
                    </Select>
                 </FormControl>

                 <FormControl fullWidth disabled={newJob.selected_depts.length === 0}>
                     <InputLabel id="create-assign-label">มอบหมายทีมงาน</InputLabel>
                     <Select labelId="create-assign-label" multiple value={newJob.assigned_to} onChange={(e) => { const { target: { value } } = e; setNewJob({...newJob, assigned_to: typeof value === 'string' ? value.split(',') : value as string[] }); }} input={<OutlinedInput label="มอบหมายทีมงาน" />} renderValue={(selected) => (<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map((value) => { const user = deptUsers.find(u => u.user_id === value); return <Chip key={value} label={user ? user.nickname : value} size="small" />; })}</Box>)} MenuProps={MenuProps}>
                         {deptUsers.map((u) => (<MenuItem key={u.user_id} value={u.user_id}><Checkbox checked={newJob.assigned_to.indexOf(u.user_id) > -1} /><ListItemText primary={`${u.first_name} ${u.last_name} (${u.nickname})`} /></MenuItem>))}
                     </Select>
                 </FormControl>
                 
                 {/* 8. ตัวเลือกประเมินงาน */}
                 <FormControlLabel control={<Switch checked={newJob.is_feedback_required} onChange={(e) => setNewJob({...newJob, is_feedback_required: e.target.checked})} />} label="ต้องการให้ลูกค้าประเมินงานเมื่อเสร็จสิ้น" />
             </Stack>
         </DialogContent>
         <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
             <Button onClick={() => setOpenCreateDialog(false)} color="inherit">ยกเลิก</Button>
             <Button onClick={handleCreateJob} variant="contained" color="primary" startIcon={<SaveIcon />}>บันทึกงาน</Button>
         </DialogActions>
      </Dialog>

      {/* Dialog แก้ไขงาน */}
      <Dialog open={!!editJob} onClose={() => setEditJob(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ bgcolor: '#1976D2', color: 'white' }}>แก้ไขงาน</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField label="ชื่องาน" fullWidth value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                   <TextField label="ชื่อลูกค้า" fullWidth value={editForm.customer_name} onChange={e => setEditForm({...editForm, customer_name: e.target.value})} />
                   <TextField label="เบอร์โทรศัพท์" fullWidth value={editForm.customer_phone} onChange={e => setEditForm({...editForm, customer_phone: e.target.value})} />
                </Stack>
                <TextField label="สถานที่" fullWidth value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} />
                
                <TextField 
                    label="รายละเอียดงานเพิ่มเติม" fullWidth multiline rows={4} 
                    value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} 
                />

                <FormControlLabel 
                    control={<Checkbox checked={editForm.is_multi_day} onChange={(e) => setEditForm({ ...editForm, is_multi_day: e.target.checked })} />} 
                    label="งานต่อเนื่องหลายวัน" sx={{ mt: 1 }}
                />
                
                {/* ✅ 1. เลือกโหมดเวลา */}
                <FormControl component="fieldset" sx={{ mt: 1, mb: 1 }}>
                    <FormLabel component="legend" sx={{ fontSize: '0.8rem' }}>รูปแบบเวลา</FormLabel>
                    <RadioGroup row value={editForm.time_mode} onChange={(e) => setEditForm({ ...editForm, time_mode: e.target.value })}>
                        <FormControlLabel value="SLOT" control={<Radio size="small" />} label="เลือกช่วงเวลา (เช้า/บ่าย)" />
                        <FormControlLabel value="SPECIFIC" control={<Radio size="small" />} label="ระบุเวลาเอง (เวลา:นาที)" />
                    </RadioGroup>
                 </FormControl>

                 {/* ✅ 2. กรอกวันที่และเวลา */}
                 <Stack direction="row" spacing={2} alignItems="flex-start">
                    <TextField label={editForm.is_multi_day ? "วันที่เริ่ม" : "วันที่"} type="date" fullWidth InputLabelProps={{ shrink: true }} value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} />
                    {editForm.is_multi_day && (
                        <TextField label="วันที่สิ้นสุด" type="date" fullWidth InputLabelProps={{ shrink: true }} value={editForm.end_date} onChange={e => setEditForm({...editForm, end_date: e.target.value})} />
                    )}
                    {editForm.time_mode === 'SLOT' ? (
                        <FormControl fullWidth>
                            <InputLabel>ช่วงเวลา</InputLabel>
                            <Select value={editForm.time_slot} label="ช่วงเวลา" onChange={(e) => setEditForm({...editForm, time_slot: e.target.value})}>
                                {TIME_SLOTS.map((slot) => (<MenuItem key={slot.value} value={slot.value}>{slot.label}</MenuItem>))}
                            </Select>
                        </FormControl>
                    ) : (
                        <Stack direction="row" spacing={1} sx={{ minWidth: 220 }}>
                             <TextField label="เริ่ม" type="time" fullWidth InputLabelProps={{ shrink: true }} value={editForm.manual_start} onChange={e => setEditForm({...editForm, manual_start: e.target.value})} />
                             <TextField label="ถึง" type="time" fullWidth InputLabelProps={{ shrink: true }} value={editForm.manual_end} onChange={e => setEditForm({...editForm, manual_end: e.target.value})} />
                        </Stack>
                    )}
                 </Stack>

                {/* ⚠️ ส่วนนี้อย่าลืมใส่กลับมานะครับ! (เลือกฝ่าย + เลือกคน) */}
                <FormControl fullWidth>
                    <InputLabel>ฝ่ายที่รับผิดชอบ</InputLabel>
                    <Select multiple value={editForm.department_ids} onChange={(e) => { const values = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value; setEditForm({...editForm, department_ids: values as number[]}); }} input={<OutlinedInput label="ฝ่ายที่รับผิดชอบ" />} renderValue={(selected) => (<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map((value: any) => { const dept = departments.find(d => d.id === value); return <Chip key={value} label={dept?.name} size="small" />; })}</Box>)}>
                        {departments.map((d) => (<MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>))}
                    </Select>
                </FormControl>
                
                <FormControl fullWidth>
                     <InputLabel>มอบหมายทีมงาน</InputLabel>
                     <Select multiple value={editForm.assigned_to} onChange={(e) => { const { target: { value } } = e; setEditForm({...editForm, assigned_to: typeof value === 'string' ? value.split(',') : value as string[] }); }} input={<OutlinedInput label="มอบหมายทีมงาน" />} renderValue={(selected) => (<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map((value: any) => { const user = users.find(u => u.user_id === value); return <Chip key={value} label={user ? user.nickname : value} size="small" />; })}</Box>)} MenuProps={MenuProps}>
                         {users.map((u) => (<MenuItem key={u.user_id} value={u.user_id}><Checkbox checked={editForm.assigned_to.indexOf(u.user_id) > -1} /><ListItemText primary={`${u.first_name} ${u.last_name} (${u.nickname})`} /></MenuItem>))}
                     </Select>
                 </FormControl>

                <FormControlLabel control={<Switch checked={editForm.is_feedback_required} onChange={(e) => setEditForm({...editForm, is_feedback_required: e.target.checked})} />} label="ต้องการให้ลูกค้าประเมินงานเมื่อเสร็จสิ้น" />
            </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <Button onClick={() => setEditJob(null)} color="inherit">ยกเลิก</Button>
            <Button onClick={handleUpdateJob} variant="contained" color="primary" startIcon={<SaveIcon />}>บันทึกการแก้ไข</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog รายละเอียดงาน (ใช้ Grid size={{...}} แก้ปัญหา MUI v6) */}
      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} fullWidth maxWidth="md">
        {selectedJob && (
            <>
                <DialogTitle sx={{ bgcolor: getStatusColor(selectedJob.status), color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">{selectedJob.title}</Typography>
                    <Chip label={getStatusLabel(selectedJob.status)} sx={{ bgcolor: 'white', color: getStatusColor(selectedJob.status), fontWeight: 'bold' }} />
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        {/* ✅ [Fix Grid] ใช้ size={{...}} แทน item xs=... */}
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>ข้อมูลลูกค้า</Typography>
                            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#fafafa' }}>
                                <Stack spacing={1}>
                                    <Stack direction="row" spacing={1}><PersonIcon color="action" /><Typography>{selectedJob.customer_name}</Typography></Stack>
                                    <Stack direction="row" spacing={1}><PhoneIcon color="action" /><Typography>{selectedJob.customer_phone}</Typography></Stack>
                                    <Stack direction="row" spacing={1}><LocationIcon color="action" /><Typography>{selectedJob.location}</Typography></Stack>
                                    {selectedJob.map_url && <Button startIcon={<MapIcon />} size="small" href={selectedJob.map_url} target="_blank">ดูแผนที่</Button>}
                                </Stack>
                            </Paper>

                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>รายละเอียดงาน</Typography>
                            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{selectedJob.description || '-'}</Typography>
                            </Paper>

                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>ทีมงานที่รับผิดชอบ</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                {selectedJob.JobAssignments?.map((assign: any) => (
                                    <Chip key={assign.user_id} avatar={<Avatar>{assign.Profiles?.nickname?.[0]}</Avatar>} label={`${assign.Profiles?.first_name} (${assign.Profiles?.nickname})`} />
                                ))}
                            </Box>

                            {/* รูปภาพส่งงาน */}
                            {(selectedJob.status === 'APPROVED' || selectedJob.status === 'WAITING_REVIEW') && selectedJob.image_url && renderJobImages(selectedJob.image_url)}

                            {/* Feedback ลูกค้า */}
                            {jobFeedback && profile?.role === 'ADMIN' && (
                                <Box sx={{ p: 2, bgcolor: '#E8F5E9', borderRadius: 2, border: '1px solid #C8E6C9', mb: 2 }}>
                                    <Typography variant="h6" gutterBottom color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        📝 ผลการประเมินจากลูกค้า
                                    </Typography>
                                    <Divider sx={{ my: 1, borderColor: '#A5D6A7' }} />
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
                                </Box>
                            )}

                            {/* ลายเซ็นลูกค้า (เรียกจาก jobFeedback) */}
                            {jobFeedback?.signature_url && (
                                <Box sx={{ mt: 2, p: 2, border: '1px dashed #BDBDBD', borderRadius: 2, bgcolor: '#FAFAFA', textAlign: 'center' }}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>✍️ ลายเซ็นลูกค้า (ผู้รับงาน)</Typography>
                                    <Box component="img" src={jobFeedback.signature_url} alt="ลายเซ็นลูกค้า" sx={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain', filter: 'contrast(1.2)' }} />
                                </Box>
                            )}
                        </Grid>

                        {/* ✅ [Fix Grid] ใช้ size={{...}} แทน item xs=... */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="subtitle2" color="text.secondary">เวลานัดหมาย</Typography>
                            <Typography variant="body1" fontWeight="bold" fontSize="1.2rem" color="primary">{selectedJob.display_date}</Typography>
                            <Chip label={selectedJob.display_slot} color="info" variant="filled" sx={{ mt: 1, mb: 2 }} />

                            {profile?.role === 'ADMIN' && (
                                <Paper sx={{ p: 2, bgcolor: '#f0f0f0' }}>
                                    <Typography variant="subtitle2" fontWeight="bold" mb={1}>จัดการสถานะ</Typography>
                                    <Stack spacing={1}>
                                        {selectedJob.status === 'WAITING_REVIEW' && (
                                            <>
                                                <Button variant="contained" color="success" onClick={() => updateJobStatus(selectedJob.id, 'APPROVED', 'อนุมัติงาน?')}>อนุมัติ (เสร็จสมบูรณ์)</Button>
                                                <Button variant="outlined" color="warning" onClick={() => updateJobStatus(selectedJob.id, 'IN_PROGRESS', 'ตีกลับไปแก้ไข?')}>ตีกลับแก้ไข</Button>
                                            </>
                                        )}
                                        <Divider sx={{ my: 1 }} />
                                        <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteJob}>ลบงาน</Button>
                                    </Stack>
                                </Paper>
                            )}
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailDialog(false)}>ปิด</Button>
                </DialogActions>
            </>
        )}
      </Dialog>
    </Layout>
  );
}

export default DashboardPage;