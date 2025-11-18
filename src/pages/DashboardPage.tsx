import React, { useEffect, useState } from 'react';
import { 
  AppBar, Toolbar, Typography, Button, Container, Box, Paper, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Divider 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// FullCalendar Imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]); 
  
  // State สำหรับ Dialog "สร้างงาน"
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', description: '', start_time: '', end_time: '' });

  // State สำหรับ Dialog "ดูรายละเอียดงาน"
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }

      const { data: profileData } = await supabase
        .from('Profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (profileData) setProfile(profileData);

      fetchJobs();
    };
    fetchData();
  }, [navigate]);

  const fetchJobs = async () => {
    const { data, error } = await supabase.from('Jobs').select('*');
    if (error) console.error('Error:', error);
    else {
      // แปลงข้อมูลให้ FullCalendar เข้าใจ (เก็บข้อมูลลึกๆ ไว้ใน extendedProps)
      const formattedEvents = data.map((job: any) => ({
        id: job.id,
        title: job.title,
        start: job.start_time,
        end: job.end_time,
        color: job.status === 'DONE' ? 'green' : '#3788d8', // เสร็จแล้วสีเขียว, ยังไม่เสร็จสีฟ้า
        extendedProps: {
            description: job.description,
            status: job.status
        }
      }));
      setJobs(formattedEvents);
    }
  };

  const handleCreateJob = async () => {
    if (!newJob.title || !newJob.start_time || !newJob.end_time) {
      alert("กรุณากรอกข้อมูลให้ครบ"); return;
    }
    const { error } = await supabase.from('Jobs').insert([{
        title: newJob.title,
        description: newJob.description,
        start_time: newJob.start_time,
        end_time: newJob.end_time,
        status: 'PENDING'
    }]);
    if (!error) {
      alert("สร้างงานสำเร็จ!");
      setOpenCreateDialog(false);
      fetchJobs();
      setNewJob({ title: '', description: '', start_time: '', end_time: '' });
    }
  };

  // ฟังก์ชันเมื่อคลิกที่แถบงาน
  const handleEventClick = (info: any) => {
    // ดึงข้อมูลจาก Event ที่คลิก มาใส่ตัวแปร
    setSelectedJob({
        id: info.event.id,
        title: info.event.title,
        description: info.event.extendedProps.description,
        status: info.event.extendedProps.status,
        start: info.event.start?.toLocaleString(),
        end: info.event.end?.toLocaleString()
    });
    setOpenDetailDialog(true); // เปิดหน้าต่างรายละเอียด
  };

  // ฟังก์ชันกด "ปิดงาน" (Mark as Done)
  const handleCompleteJob = async () => {
    if (!selectedJob) return;
    
    const confirm = window.confirm("ยืนยันที่จะปิดงานนี้?");
    if (!confirm) return;

    const { error } = await supabase
        .from('Jobs')
        .update({ status: 'DONE' }) // อัปเดตสถานะเป็น DONE
        .eq('id', selectedJob.id);

    if (!error) {
        alert("ปิดงานเรียบร้อย!");
        setOpenDetailDialog(false);
        fetchJobs(); // รีเฟรชสีปฏิทิน
    }
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>WeJob Dashboard</Typography>
          {profile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography>{profile.nickname} ({profile.role})</Typography>
              <Button color="inherit" variant="outlined" onClick={async () => {
                await supabase.auth.signOut(); navigate('/');
              }}>Logout</Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4">ตารางงานทั้งหมด</Typography>
            <Typography variant="body2" color="text.secondary">จัดการงานซ่อมบำรุงและมอบหมายงาน</Typography>
          </Box>
          <Button variant="contained" size="large" onClick={() => setOpenCreateDialog(true)}>+ สร้างงานใหม่</Button>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
            height="auto" contentHeight={600}
            events={jobs}
            eventClick={handleEventClick} // <--- เพิ่มคำสั่งคลิกตรงนี้
          />
        </Paper>
      </Container>

      {/* --- Dialog 1: สร้างงานใหม่ --- */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>สร้างใบงานใหม่</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Stack spacing={2}>
                <TextField label="ชื่องาน" fullWidth required value={newJob.title} onChange={(e) => setNewJob({...newJob, title: e.target.value})} />
                <TextField label="รายละเอียด" fullWidth multiline rows={3} value={newJob.description} onChange={(e) => setNewJob({...newJob, description: e.target.value})} />
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField label="เวลาเริ่ม" type="datetime-local" fullWidth required InputLabelProps={{ shrink: true }} value={newJob.start_time} onChange={(e) => setNewJob({...newJob, start_time: e.target.value})} />
                    <TextField label="เวลาจบ" type="datetime-local" fullWidth required InputLabelProps={{ shrink: true }} value={newJob.end_time} onChange={(e) => setNewJob({...newJob, end_time: e.target.value})} />
                </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleCreateJob}>บันทึกงาน</Button>
        </DialogActions>
      </Dialog>

      {/* --- Dialog 2: ดูรายละเอียดงาน (เพิ่มใหม่) --- */}
      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>รายละเอียดงาน</DialogTitle>
        <DialogContent>
            {selectedJob && (
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="h6" color="primary">{selectedJob.title}</Typography>
                    
                    <Typography variant="body1">
                        <strong>สถานะ: </strong> 
                        <Chip 
                            label={selectedJob.status} 
                            color={selectedJob.status === 'DONE' ? 'success' : 'primary'} 
                            size="small" 
                        />
                    </Typography>

                    <Divider />
                    <Typography variant="body2" color="text.secondary">รายละเอียด:</Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                        {selectedJob.description || "- ไม่มีรายละเอียด -"}
                    </Typography>
                    
                    <Divider />
                    <Box>
                        <Typography variant="caption">เริ่ม: {selectedJob.start}</Typography><br/>
                        <Typography variant="caption">จบ: {selectedJob.end || "-"}</Typography>
                    </Box>
                </Stack>
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)}>ปิดหน้าต่าง</Button>
          {/* ปุ่มปิดงาน จะโชว์เฉพาะงานที่ยังไม่เสร็จ */}
          {selectedJob?.status !== 'DONE' && (
            <Button variant="contained" color="success" onClick={handleCompleteJob}>
                ✅ ปิดงาน (เสร็จสิ้น)
            </Button>
          )}
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default DashboardPage;