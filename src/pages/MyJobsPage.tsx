import React, { useEffect, useState } from 'react';
import { 
  Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Box, CircularProgress
} from '@mui/material';
import { supabase } from '../supabaseClient';
import { 
  LocationOn, AccessTime, Visibility, 
  PlayArrow as PlayIcon, Done as DoneIcon, CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { confirmAction, showSuccess, showError } from '../utils/alertUtils';

function MyJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  
  // State สำหรับการอัปโหลดรูป
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
    // ล้างค่ารูปภาพเก่าเมื่อเปิดงานใหม่
    setSelectedImage(null);
    setPreviewUrl(null);
    setOpenDetailDialog(true);
  };

  // ฟังก์ชันเลือกไฟล์รูป
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files[0]) {
          const file = event.target.files[0];
          setSelectedImage(file);
          setPreviewUrl(URL.createObjectURL(file)); // สร้าง URL ชั่วคราวเพื่อแสดงตัวอย่าง
      }
  };

  // ฟังก์ชันเริ่มงาน (ไม่ต้องมีรูป)
  const handleStartJob = async () => {
      if (!(await confirmAction('เริ่มงาน?', 'ยืนยันที่จะเริ่มปฏิบัติงาน'))) return;
      const { error } = await supabase.from('Jobs').update({ status: 'IN_PROGRESS' }).eq('id', selectedJob.id);
      if (!error) { showSuccess('เริ่มงานแล้ว'); setOpenDetailDialog(false); fetchMyJobs(); }
  };

  // ฟังก์ชันส่งงาน (ต้องมีรูป)
  const handleSubmitJob = async () => {
      if (!selectedImage) {
          showError("กรุณาแนบรูป", "ต้องถ่ายรูปหน้างานเพื่อยืนยันการส่งงาน");
          return;
      }

      if (!(await confirmAction('ยืนยันการส่งงาน?', 'ตรวจสอบความเรียบร้อยแล้วใช่หรือไม่'))) return;

      setUploading(true);
      try {
          // 1. อัปโหลดรูปไปที่ Storage
          const fileExt = selectedImage.name.split('.').pop();
          const fileName = `${selectedJob.id}_${Date.now()}.${fileExt}`; // ตั้งชื่อไฟล์ไม่ให้ซ้ำ
          const { error: uploadError } = await supabase.storage
              .from('job-evidence') // ชื่อ Bucket ที่เราสร้าง
              .upload(fileName, selectedImage);

          if (uploadError) throw uploadError;

          // 2. ขอ Public URL ของรูป
          const { data: { publicUrl } } = supabase.storage
              .from('job-evidence')
              .getPublicUrl(fileName);

          // 3. อัปเดต Database (เปลี่ยนสถานะ + บันทึกลิงก์รูป)
          const { error: dbError } = await supabase
              .from('Jobs')
              .update({ 
                  status: 'WAITING_REVIEW', 
                  image_url: publicUrl 
              })
              .eq('id', selectedJob.id);

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

  return (
    <Layout title="งานของฉัน">
      <Typography variant="h4" sx={{ mb: 3 }}>งานที่ได้รับมอบหมาย</Typography>
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#424242' }}>
              <TableRow>
                <TableCell sx={{ color: 'white' }}>ชื่องาน</TableCell>
                <TableCell sx={{ color: 'white' }}>สถานะ</TableCell>
                <TableCell sx={{ color: 'white' }}>เวลา</TableCell>
                <TableCell align="center" sx={{ color: 'white' }}>จัดการ</TableCell>
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
              {jobs.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 5, color: 'text.secondary' }}>คุณยังไม่มีงานที่ได้รับมอบหมาย</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog รายละเอียด & ส่งงาน */}
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
                      <Box sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2, border: '1px solid #eee' }}>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{selectedJob.description || "- ไม่มีรายละเอียดเพิ่มเติม -"}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary">เวลานัดหมาย</Typography>
                          <Typography variant="body2" fontWeight={600}>{selectedJob.start_formatted} - {selectedJob.end_formatted}</Typography>
                      </Box>

                      {/* --- ส่วนแสดงรูปภาพ (ถ้ามี) --- */}
                      {selectedJob.image_url && (
                          <Box>
                              <Typography variant="subtitle2" gutterBottom>รูปภาพส่งงาน:</Typography>
                              <img src={selectedJob.image_url} alt="หลักฐานงาน" style={{ width: '100%', borderRadius: '8px', border: '1px solid #ddd' }} />
                          </Box>
                      )}

                      <Divider />

                      {/* --- ส่วนจัดการ Workflow --- */}
                      <Box sx={{ textAlign: 'center' }}>
                        
                        {/* 1. งานยังไม่เริ่ม */}
                        {selectedJob.status === 'PENDING' && (
                            <Button variant="contained" color="warning" size="large" startIcon={<PlayIcon />} onClick={handleStartJob}>
                                เริ่มปฏิบัติงาน
                            </Button>
                        )}
                        
                        {/* 2. กำลังทำ -> ต้องอัปโหลดรูปก่อนส่ง */}
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

                                <Button 
                                    variant="contained" fullWidth size="large"
                                    sx={{ bgcolor: '#0288D1', color: 'white' }} 
                                    startIcon={uploading ? <CircularProgress size={20} color="inherit"/> : <DoneIcon />}
                                    disabled={!selectedImage || uploading} // ถ้าไม่มีรูป ห้ามกด
                                    onClick={handleSubmitJob}
                                >
                                    {uploading ? 'กำลังอัปโหลด...' : 'ยืนยันส่งงาน'}
                                </Button>
                            </Box>
                        )}

                        {/* 3. สถานะอื่นๆ */}
                        {selectedJob.status === 'WAITING_REVIEW' && <Chip label="รอแอดมินตรวจสอบ" color="primary" variant="outlined" />}
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