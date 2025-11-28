import React, { useEffect, useState, useRef } from 'react';
import { 
  Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Box, CircularProgress, TextField, InputAdornment, Rating, Stepper, Step, StepLabel
} from '@mui/material';
import { supabase } from '../supabaseClient';
import { 
  LocationOn, AccessTime, Visibility, 
  PlayArrow as PlayIcon, Done as DoneIcon, CloudUpload as CloudUploadIcon,
  Person as PersonIcon, Phone as PhoneIcon, Image as ImageIcon,
  Cancel as CancelIcon, Search as SearchIcon, Map as MapIcon, Assignment as AssignmentIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { confirmAction, showSuccess, showError } from '../utils/alertUtils';
import SignatureCanvas from 'react-signature-canvas';

function MyJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [openFeedback, setOpenFeedback] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const sigPad = useRef<any>(null);
  
  const [feedback, setFeedback] = useState({
      contact_convenience: 5, service_speed: 5, repair_time: 5, repair_quality: 5, testing_check: 5, 
      politeness: 5, expertise: 5, understanding: 5, advice: 5, notification: 5, 
      overall_satisfaction: 5, staff_satisfaction: 5, suggestion: '' 
  });

  useEffect(() => { fetchMyJobs(); }, []);

  const fetchMyJobs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('JobAssignments').select(`job_id, Jobs:job_id (*)`).eq('user_id', user.id).order('id', { ascending: false });
    const myJobList = data?.map((item: any) => item.Jobs).filter((j: any) => j !== null) || [];
    myJobList.sort((a:any, b:any) => b.id - a.id);
    setJobs(myJobList);
  };

  const getStatusColor = (status: string) => { switch (status) { case 'PENDING': return '#D32F2F'; case 'IN_PROGRESS': return '#F57C00'; case 'WAITING_REVIEW': return '#1976D2'; case 'APPROVED': return '#388E3C'; default: return '#757575'; } };
  const getStatusLabel = (status: string) => { switch (status) { case 'PENDING': return 'รอดำเนินการ'; case 'IN_PROGRESS': return 'กำลังดำเนินการ'; case 'WAITING_REVIEW': return 'รอตรวจงาน'; case 'APPROVED': return 'เสร็จสมบูรณ์'; default: return status; } };

  const filteredJobs = jobs.filter((job) => {
    const query = searchQuery.toLowerCase();
    return ( (job.title?.toLowerCase().includes(query)) || (job.location?.toLowerCase().includes(query)) || (job.customer_name?.toLowerCase().includes(query)) );
  });

  const openJobDetail = (job: any) => {
    setSelectedJob({ ...job, start_formatted: new Date(job.start_time).toLocaleString('th-TH'), end_formatted: new Date(job.end_time).toLocaleString('th-TH') });
    setSelectedImage(null); setPreviewUrl(null); setOpenDetailDialog(true);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files[0]) {
          const file = event.target.files[0];
          setSelectedImage(file);
          setPreviewUrl(URL.createObjectURL(file));
      }
  };

  const handleStartJob = async () => {
      if (!(await confirmAction('เริ่มงาน?', 'ยืนยันที่จะเริ่มปฏิบัติงาน'))) return;
      const { error } = await supabase.from('Jobs').update({ status: 'IN_PROGRESS' }).eq('id', selectedJob.id);
      if (!error) { showSuccess('เริ่มงานแล้ว'); setOpenDetailDialog(false); fetchMyJobs(); }
  };

  const handlePreSubmit = () => {
      if (!selectedImage) { showError("กรุณาแนบรูป", "ต้องถ่ายรูปหน้างานเพื่อยืนยัน"); return; }
      if (selectedJob.is_feedback_required) { setOpenDetailDialog(false); setOpenFeedback(true); setActiveStep(0); } 
      else { handleSubmitJob(); }
  };

  const handleSubmitFeedbackAndJob = async () => {
      if (sigPad.current && sigPad.current.isEmpty()) { showError("กรุณาเซ็นชื่อ", "ลูกค้าต้องเซ็นชื่อรับรอง"); return; }
      if (!(await confirmAction('ยืนยันการประเมิน', 'ขอบคุณที่ใช้บริการครับ'))) return;
      setUploading(true);
      try {
          const canvas = sigPad.current.getCanvas(); const sigDataUrl = canvas.toDataURL('image/png'); const sigBlob = await (await fetch(sigDataUrl)).blob(); const sigFile = new File([sigBlob], "signature.png", { type: "image/png" }); const sigName = `sig_${selectedJob.id}_${Date.now()}.png`;
          await supabase.storage.from('job-evidence').upload(sigName, sigFile);
          const { data: { publicUrl: sigUrl } } = supabase.storage.from('job-evidence').getPublicUrl(sigName);
          await supabase.from('JobFeedbacks').insert([{ job_id: selectedJob.id, ...feedback, signature_url: sigUrl }]);
          await handleSubmitJob(true); setOpenFeedback(false);
      } catch (err: any) { showError("เกิดข้อผิดพลาด", err.message); setUploading(false); }
  };

  const handleSubmitJob = async (skipConfirm = false) => {
      if (!skipConfirm && !(await confirmAction('ยืนยันการส่งงาน?', 'ตรวจสอบความเรียบร้อยแล้วใช่หรือไม่'))) return;
      setUploading(true);
      try {
          const fileExt = selectedImage!.name.split('.').pop(); const fileName = `${selectedJob.id}_${Date.now()}.${fileExt}`;
          await supabase.storage.from('job-evidence').upload(fileName, selectedImage!);
          const { data: { publicUrl } } = supabase.storage.from('job-evidence').getPublicUrl(fileName);
          const { error: dbError } = await supabase.from('Jobs').update({ status: 'WAITING_REVIEW', image_url: publicUrl }).eq('id', selectedJob.id);
          if (dbError) throw dbError;
          showSuccess("ส่งงานเรียบร้อย!", "ขอบคุณครับ"); setOpenDetailDialog(false); fetchMyJobs();
      } catch (error: any) { showError("เกิดข้อผิดพลาด", error.message); } finally { setUploading(false); }
  };
  
  const handleCancelSubmission = async () => {
      if (!(await confirmAction('ยกเลิกการส่งงาน?', 'สถานะจะกลับไปเป็น "กำลังดำเนินการ" เพื่อให้คุณแก้ไขรูปภาพหรือข้อมูลได้', 'ใช่, ยกเลิกการส่ง'))) return;
      const { error } = await supabase.from('Jobs').update({ status: 'IN_PROGRESS' }).eq('id', selectedJob.id);
      if (!error) { showSuccess("ยกเลิกการส่งงานแล้ว"); setOpenDetailDialog(false); fetchMyJobs(); }
  };

  const renderStepContent = (step: number) => {
      const RatingRow = ({ label, val, setter }: any) => (<Box display="flex" justifyContent="space-between" alignItems="center" my={1}><Typography variant="body2">{label}</Typography><Rating value={val} onChange={(e, v) => setFeedback({...feedback, [setter]: v})} /></Box>);
      switch (step) {
          case 0: return (<Box><Typography variant="h6" gutterBottom color="primary">1. บริการ</Typography><RatingRow label="ความสะดวก" val={feedback.contact_convenience} setter="contact_convenience" /><RatingRow label="ความรวดเร็ว" val={feedback.service_speed} setter="service_speed" /><RatingRow label="ระยะเวลาซ่อม" val={feedback.repair_time} setter="repair_time" /><RatingRow label="คุณภาพงาน" val={feedback.repair_quality} setter="repair_quality" /><RatingRow label="การตรวจสอบ" val={feedback.testing_check} setter="testing_check" /></Box>);
          case 1: return (<Box><Typography variant="h6" gutterBottom color="primary">2. เจ้าหน้าที่</Typography><RatingRow label="มารยาท" val={feedback.politeness} setter="politeness" /><RatingRow label="ความเชี่ยวชาญ" val={feedback.expertise} setter="expertise" /><RatingRow label="ความเข้าใจ" val={feedback.understanding} setter="understanding" /><RatingRow label="คำแนะนำ" val={feedback.advice} setter="advice" /><RatingRow label="การแจ้งเตือน" val={feedback.notification} setter="notification" /></Box>);
          case 2: return (<Box><Typography variant="h6" gutterBottom color="primary">3. สรุป</Typography><RatingRow label="ความพึงพอใจรวม" val={feedback.overall_satisfaction} setter="overall_satisfaction" /><RatingRow label="พึงพอใจ จนท." val={feedback.staff_satisfaction} setter="staff_satisfaction" /><TextField label="ข้อเสนอแนะ" multiline rows={2} fullWidth value={feedback.suggestion} onChange={e => setFeedback({...feedback, suggestion: e.target.value})} sx={{ my: 2 }} /><Typography variant="subtitle2">ลายเซ็น:</Typography><Box sx={{ border: '1px solid #ccc', bgcolor: '#fff' }}><SignatureCanvas ref={sigPad} penColor="black" canvasProps={{width: 500, height: 150, className: 'sigCanvas'}} backgroundColor="transparent"/></Box><Button size="small" onClick={() => sigPad.current?.clear()}>ล้าง</Button></Box>);
          default: return "";
      }
  }

  return (
    <Layout title="งานของฉัน">
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', sm: 'center' }} mb={3} spacing={2}>
        <Typography variant="h4">งานที่ได้รับมอบหมาย</Typography>
        <TextField placeholder="ค้นหางาน..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>) }} sx={{ bgcolor: 'white', borderRadius: 1, minWidth: 250 }} />
      </Stack>
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#424242' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ชื่องาน</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ลูกค้า</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>สถานะ</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>เวลา</TableCell>
                <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>
                      <Typography fontWeight={600}>{job.title}</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5} color="text.secondary"><LocationOn fontSize="small" color="action" /><Typography variant="caption">{job.location || '-'}</Typography></Stack>
                      {job.is_feedback_required && <Chip label="ต้องประเมิน" size="small" color="warning" variant="outlined" icon={<AssignmentIcon />} sx={{ mt: 0.5, height: 20, fontSize: 10 }} />}
                  </TableCell>
                  <TableCell>{job.customer_name ? <Box><Typography variant="body2" fontWeight="bold">{job.customer_name}</Typography><Typography variant="caption" color="text.secondary">{job.customer_phone}</Typography></Box> : "-"}</TableCell>
                  <TableCell><Chip label={getStatusLabel(job.status)} size="small" sx={{ bgcolor: getStatusColor(job.status), color: 'white', fontWeight: 'bold' }} /></TableCell>
                  <TableCell><Stack direction="row" alignItems="center" spacing={0.5} color="text.secondary"><AccessTime fontSize="small" /><Typography variant="caption">{new Date(job.start_time).toLocaleDateString('th-TH')}</Typography></Stack></TableCell>
                  <TableCell align="center"><Button variant="outlined" size="small" startIcon={<Visibility />} onClick={() => openJobDetail(job)} color="primary">รายละเอียด</Button></TableCell>
                </TableRow>
              ))}
              {filteredJobs.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>{searchQuery ? 'ไม่พบงานที่ค้นหา' : 'คุณยังไม่มีงานที่ได้รับมอบหมาย'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Dialog open={openDetailDialog} onClose={() => !uploading && setOpenDetailDialog(false)} fullWidth maxWidth="sm">
          <Box sx={{ bgcolor: selectedJob ? getStatusColor(selectedJob.status) : 'grey', height: 8, width: '100%' }} />
          <DialogTitle sx={{ pb: 1 }}>
              <Typography variant="h5" fontWeight="bold">{selectedJob?.title}</Typography>
              <Stack direction="row" alignItems="center" spacing={1} mt={1}><LocationOn fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">{selectedJob?.location || 'ไม่ระบุสถานที่'}</Typography></Stack>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
              {selectedJob && (
                  <Stack spacing={3}>
                      {selectedJob.map_url && <Button variant="outlined" color="primary" startIcon={<MapIcon />} href={selectedJob.map_url} target="_blank">ดูแผนที่</Button>}
                      <Box sx={{ p: 2, bgcolor: '#FFF3E0', borderRadius: 2, border: '1px solid #FFE0B2' }}><Stack direction="row" spacing={1} alignItems="center" mb={1}><PersonIcon color="warning" /><Typography variant="subtitle2" fontWeight="bold">ติดต่อลูกค้า</Typography></Stack><Typography variant="body1">คุณ {selectedJob.customer_name || '-'}</Typography><Stack direction="row" spacing={1} alignItems="center" mt={0.5}><PhoneIcon fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">{selectedJob.customer_phone || '-'}</Typography></Stack></Box>
                      <Box sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2, border: '1px solid #eee' }}><Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{selectedJob.description || "-"}</Typography></Box>
                      {selectedJob.image_url && (<Box><Stack direction="row" alignItems="center" spacing={1} mb={1}><ImageIcon color="action" /><Typography variant="subtitle2">รูปภาพส่งงาน:</Typography></Stack><img src={selectedJob.image_url} alt="หลักฐาน" style={{ width: '100%', borderRadius: 8 }} /></Box>)}
                      <Divider />
                      <Box sx={{ textAlign: 'center' }}>
                        {/* [Rule 2] LOCK JOB if Approved */}
                        {selectedJob.status === 'APPROVED' ? (
                            <Chip label="งานเสร็จสมบูรณ์แล้ว (ไม่สามารถแก้ไขได้)" color="success" icon={<DoneIcon />} />
                        ) : (
                            <>
                                {/* [Rule 1.2] Staff buttons */}
                                {selectedJob.status === 'PENDING' && <Button variant="contained" color="warning" size="large" startIcon={<PlayIcon />} onClick={handleStartJob}>เริ่มปฏิบัติงาน</Button>}
                                {selectedJob.status === 'IN_PROGRESS' && (
                                    <Box sx={{ p: 2, border: '2px dashed #ccc', borderRadius: 2, bgcolor: '#FAFAFA' }}>
                                        <Typography variant="subtitle2" gutterBottom color="primary">📸 อัปโหลดรูปผลงานเพื่อส่งงาน</Typography>
                                        {previewUrl ? (
                                            <Box sx={{ mb: 2, position: 'relative' }}><img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} /><Button size="small" color="error" onClick={() => {setPreviewUrl(null); setSelectedImage(null);}}>แยกลบรูป</Button></Box>
                                        ) : (
                                            <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} sx={{ mb: 2 }}>เลือกรูปภาพ<input hidden accept="image/*" type="file" onChange={handleImageSelect} /></Button>
                                        )}
                                        <Button variant="contained" fullWidth size="large" sx={{ bgcolor: '#0288D1', color: 'white' }} startIcon={uploading ? <CircularProgress size={20} color="inherit"/> : <DoneIcon />} disabled={!selectedImage || uploading} onClick={handlePreSubmit}>{uploading ? 'กำลังอัปโหลด...' : 'ยืนยันส่งงาน'}</Button>
                                    </Box>
                                )}
                                {/* [Rule 2] Cancel Submission */}
                                {selectedJob.status === 'WAITING_REVIEW' && <Stack spacing={2} alignItems="center"><Chip label="รอแอดมินตรวจสอบ" color="primary" variant="outlined" /><Button variant="text" color="error" size="small" startIcon={<CancelIcon />} onClick={handleCancelSubmission}>ยกเลิกการส่งงาน (แก้ไขใหม่)</Button></Stack>}
                            </>
                        )}
                      </Box>
                  </Stack>
              )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}><Button variant="outlined" onClick={() => setOpenDetailDialog(false)} disabled={uploading} color="inherit">ปิดหน้าต่าง</Button></DialogActions>
      </Dialog>

      <Dialog open={openFeedback} fullWidth maxWidth="md"><DialogTitle sx={{ bgcolor: '#D32F2F', color: 'white' }}>แบบสอบถาม</DialogTitle><DialogContent sx={{ pt: 3 }}><Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}><Step><StepLabel>บริการ</StepLabel></Step><Step><StepLabel>เจ้าหน้าที่</StepLabel></Step><Step><StepLabel>สรุป</StepLabel></Step></Stepper><Box sx={{ px: 2 }}>{renderStepContent(activeStep)}</Box></DialogContent><DialogActions sx={{ p: 3 }}><Button disabled={activeStep === 0} onClick={() => setActiveStep((prev) => prev - 1)}>ย้อนกลับ</Button>{activeStep === 2 ? <Button variant="contained" color="primary" onClick={handleSubmitFeedbackAndJob} disabled={uploading}>{uploading ? 'กำลังส่ง...' : 'ยืนยันและส่งงาน'}</Button> : <Button variant="contained" onClick={() => setActiveStep((prev) => prev + 1)}>ถัดไป</Button>}</DialogActions></Dialog>
    </Layout>
  );
}
export default MyJobsPage;