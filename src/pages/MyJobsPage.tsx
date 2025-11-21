import React, { useEffect, useState } from 'react';
import { 
  Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Box, CircularProgress
} from '@mui/material';
import { supabase } from '../supabaseClient';
import { 
  LocationOn, AccessTime, Visibility, 
  PlayArrow as PlayIcon, Done as DoneIcon, CloudUpload as CloudUploadIcon,
  Person as PersonIcon, Phone as PhoneIcon, 
  Cancel as CancelIcon // <--- เพิ่มไอคอน Cancel
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { confirmAction, showSuccess, showError } from '../utils/alertUtils';

function MyJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('Jobs').select('*').eq('assigned_to', user.id).order('id', { ascending: false });
    setJobs(data || []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#D32F2F';
      case 'IN_PROGRESS': return '#F57C00';
      case 'WAITING_REVIEW': return '#1976D2';
      case 'APPROVED': return '#388E3C';
      default: return '#757575';
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

  const openJobDetail = (job: any) => {
    setSelectedJob({
        ...job,
        start_formatted: new Date(job.start_time).toLocaleString('th-TH'),
        end_formatted: new Date(job.end_time).toLocaleString('th-TH')
    });
    setSelectedImage(null);
    setPreviewUrl(null);
    setOpenDetailDialog(true);
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

  const handleSubmitJob = async () => {
      if (!selectedImage) {
          showError("กรุณาแนบรูป", "ต้องถ่ายรูปหน้างานเพื่อยืนยันการส่งงาน");
          return;
      }

      if (!(await confirmAction('ยืนยันการส่งงาน?', 'ตรวจสอบความเรียบร้อยแล้วใช่หรือไม่'))) return;

      setUploading(true);
      try {
          const fileExt = selectedImage.name.split('.').pop();
          const fileName = `${selectedJob.id}_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('job-evidence').upload(fileName, selectedImage);
          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from('job-evidence').getPublicUrl(fileName);

          const { error: dbError } = await supabase.from('Jobs').update({ status: 'WAITING_REVIEW', image_url: publicUrl }).eq('id', selectedJob.id);
          if (dbError) throw dbError;

          showSuccess("ส่งงานเรียบร้อย!", "แอดมินได้รับข้อมูลแล้ว");
          setOpenDetailDialog(false);
          fetchMyJobs();

      } catch (error: any) {
          showError("เกิดข้อผิดพลาด", error.message);
      } finally {
          setUploading(false);
      }
  };

  // --- [NEW] ฟังก์ชันยกเลิกการส่งงาน ---
  const handleCancelSubmission = async () => {
      if (!(await confirmAction('ยกเลิกการส่งงาน?', 'สถานะจะกลับไปเป็น "กำลังดำเนินการ" เพื่อให้คุณแก้ไขรูปภาพหรือข้อมูลได้', 'ใช่, ยกเลิกการส่ง'))) return;

      // ย้อนสถานะกลับไปเป็น IN_PROGRESS
      const { error } = await supabase.from('Jobs').update({ status: 'IN_PROGRESS' }).eq('id', selectedJob.id);
      
      if (!error) {
          showSuccess("ยกเลิกการส่งงานแล้ว", "คุณสามารถแก้ไขและส่งใหม่ได้ทันที");
          setOpenDetailDialog(false);
          fetchMyJobs();
      } else {
          showError("เกิดข้อผิดพลาด", error.message);
      }
  };

  return (
    <Layout title="งานของฉัน">
      <Typography variant="h4" sx={{ mb: 3 }}>งานที่ได้รับมอบหมาย</Typography>
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
              {jobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>
                      <Typography fontWeight={600}>{job.title}</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5} color="text.secondary">
                           <LocationOn fontSize="small" />
                           <Typography variant="caption">{job.location || '-'}</Typography>
                      </Stack>
                  </TableCell>
                  <TableCell>
                      {job.customer_name ? (
                          <Box>
                              <Typography variant="body2" fontWeight="bold">{job.customer_name}</Typography>
                              <Typography variant="caption" color="text.secondary">{job.customer_phone}</Typography>
                          </Box>
                      ) : "-"}
                  </TableCell>
                  <TableCell>
                      <Chip label={getStatusLabel(job.status)} size="small" sx={{ bgcolor: getStatusColor(job.status), color: 'white', fontWeight: 'bold' }} />
                  </TableCell>
                  <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5} color="text.secondary">
                          <AccessTime fontSize="small" />
                          <Typography variant="caption">{new Date(job.start_time).toLocaleDateString('th-TH')}</Typography>
                      </Stack>
                  </TableCell>
                  <TableCell align="center">
                      <Button variant="outlined" size="small" startIcon={<Visibility />} onClick={() => openJobDetail(job)} color="primary">รายละเอียด</Button>
                  </TableCell>
                </TableRow>
              ))}
              {jobs.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>คุณยังไม่มีงานที่ได้รับมอบหมาย</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openDetailDialog} onClose={() => !uploading && setOpenDetailDialog(false)} fullWidth maxWidth="sm">
          <Box sx={{ bgcolor: selectedJob ? getStatusColor(selectedJob.status) : 'grey', height: 8, width: '100%' }} />
          <DialogTitle sx={{ pb: 1 }}>
              <Typography variant="h5" fontWeight="bold">{selectedJob?.title}</Typography>
              <Stack direction="row" alignItems="center" spacing={1} mt={1}>
                 <LocationOn fontSize="small" color="action" />
                 <Typography variant="body2" color="text.secondary">{selectedJob?.location || 'ไม่ระบุสถานที่'}</Typography>
              </Stack>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 3 }}>
              {selectedJob && (
                  <Stack spacing={3}>
                      <Box sx={{ p: 2, bgcolor: '#FFF3E0', borderRadius: 2, border: '1px solid #FFE0B2' }}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                              <PersonIcon color="warning" />
                              <Typography variant="subtitle2" fontWeight="bold">ติดต่อลูกค้า</Typography>
                          </Stack>
                          <Typography variant="body1">คุณ {selectedJob.customer_name || '-'}</Typography>
                          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                              <PhoneIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">{selectedJob.customer_phone || '-'}</Typography>
                          </Stack>
                      </Box>

                      <Box sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2, border: '1px solid #eee' }}>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{selectedJob.description || "- ไม่มีรายละเอียดเพิ่มเติม -"}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary">เวลานัดหมาย</Typography>
                          <Typography variant="body2" fontWeight={600}>{selectedJob.start_formatted} - {selectedJob.end_formatted}</Typography>
                      </Box>

                      {selectedJob.image_url && (
                          <Box>
                              <Typography variant="subtitle2" gutterBottom>รูปภาพส่งงาน:</Typography>
                              <img src={selectedJob.image_url} alt="หลักฐานงาน" style={{ width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} />
                          </Box>
                      )}

                      <Divider />

                      <Box sx={{ textAlign: 'center' }}>
                        {selectedJob.status === 'PENDING' && (
                            <Button variant="contained" color="warning" size="large" startIcon={<PlayIcon />} onClick={handleStartJob}>เริ่มปฏิบัติงาน</Button>
                        )}
                        
                        {selectedJob.status === 'IN_PROGRESS' && (
                            <Box sx={{ p: 2, border: '2px dashed #ccc', borderRadius: 2, bgcolor: '#FAFAFA' }}>
                                <Typography variant="subtitle2" gutterBottom color="primary">📸 อัปโหลดรูปผลงานเพื่อส่งงาน</Typography>
                                {previewUrl ? (
                                    <Box sx={{ mb: 2, position: 'relative' }}>
                                        <img src={previewUrl} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} />
                                        <Button size="small" color="error" onClick={() => {setPreviewUrl(null); setSelectedImage(null);}}>แยกลบรูป</Button>
                                    </Box>
                                ) : (
                                    <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} sx={{ mb: 2 }}>
                                        เลือกรูปภาพ
                                        <input hidden accept="image/*" type="file" onChange={handleImageSelect} />
                                    </Button>
                                )}
                                <Button variant="contained" fullWidth size="large" sx={{ bgcolor: '#0288D1', color: 'white' }} startIcon={uploading ? <CircularProgress size={20} color="inherit"/> : <DoneIcon />} disabled={!selectedImage || uploading} onClick={handleSubmitJob}>
                                    {uploading ? 'กำลังอัปโหลด...' : 'ยืนยันส่งงาน'}
                                </Button>
                            </Box>
                        )}

                        {/* --- [NEW] ส่วนปุ่มยกเลิกการส่งงาน --- */}
                        {selectedJob.status === 'WAITING_REVIEW' && (
                            <Stack spacing={2} alignItems="center">
                                <Chip label="รอแอดมินตรวจสอบ" color="primary" variant="outlined" />
                                <Button 
                                    variant="text" 
                                    color="error" 
                                    size="small"
                                    startIcon={<CancelIcon />}
                                    onClick={handleCancelSubmission}
                                >
                                    ยกเลิกการส่งงาน (แก้ไขใหม่)
                                </Button>
                            </Stack>
                        )}
                        {/* ------------------------------------- */}

                        {selectedJob.status === 'APPROVED' && <Chip label="งานเสร็จสมบูรณ์แล้ว" color="success" />}
                      </Box>
                  </Stack>
              )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
              <Button variant="outlined" onClick={() => setOpenDetailDialog(false)} disabled={uploading} color="inherit">ปิดหน้าต่าง</Button>
          </DialogActions>
      </Dialog>
    </Layout>
  );
}
export default MyJobsPage;