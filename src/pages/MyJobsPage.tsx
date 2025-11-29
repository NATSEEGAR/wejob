import React, { useEffect, useState, useRef } from 'react';
import {
    Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Stack,
    Dialog, DialogTitle, DialogContent, DialogActions, Divider, Box, CircularProgress, TextField, InputAdornment, Rating, Stepper, Step, StepLabel, IconButton
} from '@mui/material';
import { supabase } from '../supabaseClient';
import {
    LocationOn, AccessTime, Visibility,
    PlayArrow as PlayIcon, Done as DoneIcon, CloudUpload as CloudUploadIcon,
    Person as PersonIcon, Phone as PhoneIcon, Image as ImageIcon,
    Cancel as CancelIcon, Search as SearchIcon, Map as MapIcon, Assignment as AssignmentIcon,
    Close as CloseIcon, AddPhotoAlternate as AddPhotoIcon, CheckCircle as CheckCircleIcon 
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { confirmAction, showSuccess, showError } from '../utils/alertUtils';
import SignatureCanvas from 'react-signature-canvas';

function MyJobsPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [submitSuccess, setSubmitSuccess] = useState(false);   // สำหรับหน้าขอบคุณ (หน้าเขียว)
    const [customerFinished, setCustomerFinished] = useState(false); // สำหรับหน้าพนักงานกดส่ง (หน้าสรุป)
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploading, setUploading] = useState(false);
    const [signatureData, setSignatureData] = useState<string | null>(null);

    // --- แก้ไข Point 1: เปลี่ยน State ให้เก็บเป็น Array เพื่อรองรับหลายรูป ---
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    // ----------------------------------------------------------------

    const [openFeedback, setOpenFeedback] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const sigPad = useRef<any>(null);

    const [feedback, setFeedback] = useState({
      politeness: 5,          // 1. ความสุภาพ
      service_speed: 5,       // 2. ความรวดเร็ว
      repair_quality: 5,      // 3. ความเรียบร้อย
      testing_check: 5,       // 4. ความสะอาด (ใช้ช่อง testing_check แทน)
      contact_convenience: 5, // 5. ความตรงต่อเวลา (ใช้ช่อง contact_convenience แทน)
      overall_satisfaction: 5,// 6. ความพึงพอใจโดยรวม
      
      // ค่าอื่นๆ ใส่ไว้กัน Error แต่ไม่ได้โชว์
      repair_time: 5, expertise: 5, understanding: 5, advice: 5, notification: 5, staff_satisfaction: 5,
      
      suggestion: ''          // ข้อเสนอแนะ
  });

    useEffect(() => { fetchMyJobs(); }, []);

    const fetchMyJobs = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('JobAssignments').select(`job_id, Jobs:job_id (*)`).eq('user_id', user.id).order('id', { ascending: false });
        const myJobList = data?.map((item: any) => item.Jobs).filter((j: any) => j !== null) || [];
        myJobList.sort((a: any, b: any) => b.id - a.id);
        setJobs(myJobList);
    };

    const getStatusColor = (status: string) => { switch (status) { case 'PENDING': return '#D32F2F'; case 'IN_PROGRESS': return '#F57C00'; case 'WAITING_REVIEW': return '#1976D2'; case 'APPROVED': return '#388E3C'; default: return '#757575'; } };
    const getStatusLabel = (status: string) => { switch (status) { case 'PENDING': return 'รอดำเนินการ'; case 'IN_PROGRESS': return 'กำลังดำเนินการ'; case 'WAITING_REVIEW': return 'รอตรวจงาน'; case 'APPROVED': return 'เสร็จสมบูรณ์'; default: return status; } };

    const filteredJobs = jobs.filter((job) => {
        const query = searchQuery.toLowerCase();
        return ((job.title?.toLowerCase().includes(query)) || (job.location?.toLowerCase().includes(query)) || (job.customer_name?.toLowerCase().includes(query)));
    });

    const openJobDetail = (job: any) => {
        setSelectedJob({ ...job, start_formatted: new Date(job.start_time).toLocaleString('th-TH'), end_formatted: new Date(job.end_time).toLocaleString('th-TH') });
        // reset state รูปภาพเมื่อเปิด dialog ใหม่
        setSelectedImages([]); setPreviewUrls([]);
        setOpenDetailDialog(true);
    };

    // --- แก้ไข Point 3: ฟังก์ชันเลือกรูปภาพ รองรับการเลือกเพิ่ม ---
    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const newFiles = Array.from(event.target.files);
            // เพิ่มไฟล์ใหม่เข้าไปใน state เดิม
            setSelectedImages((prevFiles) => [...prevFiles, ...newFiles]);

            // สร้าง URL สำหรับ preview รูปใหม่
            const newFileUrls = newFiles.map((file) => URL.createObjectURL(file));
            setPreviewUrls((prevUrls) => [...prevUrls, ...newFileUrls]);
        }
        // Reset input value เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้ถ้าจำเป็น
        event.target.value = '';
    };

    // --- เพิ่มฟังก์ชัน: ลบรูปภาพที่เลือก ---
    const handleRemoveImage = (indexToRemove: number) => {
        URL.revokeObjectURL(previewUrls[indexToRemove]); // เคลียร์ memory
        setSelectedImages((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
        setPreviewUrls((prevUrls) => prevUrls.filter((_, index) => index !== indexToRemove));
    };
    // -----------------------------------------------------

    const handleStartJob = async () => {
        if (!(await confirmAction('เริ่มงาน?', 'ยืนยันที่จะเริ่มปฏิบัติงาน'))) return;
        const { error } = await supabase.from('Jobs').update({ status: 'IN_PROGRESS' }).eq('id', selectedJob.id);
        if (!error) { showSuccess('เริ่มงานแล้ว'); setOpenDetailDialog(false); fetchMyJobs(); }
    };

    const handlePreSubmit = () => {
        // ตรวจสอบว่ามีรูปอย่างน้อย 1 รูป
        if (selectedImages.length === 0) { showError("กรุณาแนบรูป", "ต้องถ่ายรูปหน้างานเพื่อยืนยันอย่างน้อย 1 รูป"); return; }
        if (selectedJob.is_feedback_required) { setOpenDetailDialog(false); setOpenFeedback(true); setActiveStep(0); }
        else { handleSubmitJob(); }
    };

    const handleCustomerSubmit = async () => {
      // เช็คว่าเซ็นชื่อหรือยัง
      if (sigPad.current && sigPad.current.isEmpty()) { 
          showError("กรุณาเซ็นชื่อ", "ลูกค้าต้องเซ็นชื่อรับรอง"); 
          return; 
      }
      
      if (!(await confirmAction('ยืนยันการประเมิน', 'ข้อมูลจะถูกบันทึกและไม่สามารถแก้ไขได้'))) return;

      // ✅ [เพิ่มใหม่] เซฟรูปลายเซ็นเก็บใส่ตัวแปรไว้ก่อนที่กระดานจะหายไป
      const canvas = sigPad.current.getCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      setSignatureData(dataUrl);

      // แสดงหน้าขอบคุณ
      setSubmitSuccess(true);
    };

  // 2. ฟังก์ชันสำหรับพนักงาน: รับเครื่องคืน -> กดปุ่มไปหน้าเตรียมส่ง
  const handleStaffCloseThankYou = () => {
      setSubmitSuccess(false);   // ปิดหน้าขอบคุณ
      setCustomerFinished(true); // เปิดหน้า "พร้อมส่งงาน" (Staff View)
  };

  // 3. ฟังก์ชันส่งงานจริง: พนักงานกดยืนยันครั้งสุดท้าย -> อัปโหลดขึ้น Server
    const handleFinalUpload = async () => {
      if (!signatureData) { showError("ผิดพลาด", "ไม่พบข้อมูลลายเซ็น"); return; }

      setUploading(true);
      try {
          const sigDataUrl = signatureData; 
          const sigBlob = await (await fetch(sigDataUrl)).blob(); 
          const sigFile = new File([sigBlob], "signature.png", { type: "image/png" }); 
          const sigName = `sig_${selectedJob.id}_${Date.now()}.png`;
          
          await supabase.storage.from('job-evidence').upload(sigName, sigFile);
          const { data: { publicUrl: sigUrl } } = supabase.storage.from('job-evidence').getPublicUrl(sigName);
          
          await supabase.from('JobFeedbacks').insert([{ job_id: selectedJob.id, ...feedback, signature_url: sigUrl }]);
          await handleSubmitJob(true); 

          // --- ช่วงการเคลียร์ค่า (Reset) ---
          setOpenFeedback(false);
          setCustomerFinished(false);
          setActiveStep(0);
          
          // ✅ [เพิ่มบรรทัดนี้ครับ] ล้างลายเซ็นทิ้ง เพื่อเตรียมพร้อมสำหรับงานถัดไป
          setSignatureData(null); 
          
      } catch (err: any) { 
          showError("เกิดข้อผิดพลาด", err.message); 
      } finally {
          setUploading(false); 
      }
    };

    // --- แก้ไข Point 5: ฟังก์ชันส่งงาน วนลูปอัปโหลดหลายไฟล์ ---
    const handleSubmitJob = async (skipConfirm = false) => {
        if (!skipConfirm && !(await confirmAction('ยืนยันการส่งงาน?', 'ตรวจสอบความเรียบร้อยแล้วใช่หรือไม่'))) return;
        
        if (selectedImages.length === 0) {
             showError("ไม่พบรูปภาพ", "กรุณาเลือกรูปภาพก่อนส่งงาน"); return;
        }

        setUploading(true);
        try {
            const uploadedUrls: string[] = [];

            // ใช้ Promise.all เพื่ออัปโหลดทุกไฟล์แบบขนาน (Parallel upload)
            await Promise.all(selectedImages.map(async (file, index) => {
                const fileExt = file.name.split('.').pop();
                // ตั้งชื่อไฟล์ให้ไม่ซ้ำกันโดยใส่ timestamp และ index
                const fileName = `${selectedJob.id}_${Date.now()}_${index}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage.from('job-evidence').upload(fileName, file);
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('job-evidence').getPublicUrl(fileName);
                uploadedUrls.push(publicUrl);
            }));

            // *** สำคัญ: Database Column 'image_url' ต้องเป็นชนิด jsonb หรือ text[] เพื่อรองรับการเก็บ array ***
            const { error: dbError } = await supabase.from('Jobs').update({ 
                status: 'WAITING_REVIEW', 
                image_url: uploadedUrls  // ส่งไปเป็น Array ของ URLs
            }).eq('id', selectedJob.id);

            if (dbError) throw dbError;
            showSuccess("ส่งงานเรียบร้อย!", "ขอบคุณครับ"); setOpenDetailDialog(false); fetchMyJobs();
        } catch (error: any) { 
            console.error(error);
            showError("เกิดข้อผิดพลาดในการอัปโหลด", error.message); 
        } finally { 
            setUploading(false); 
        }
    };
    // -----------------------------------------------------------

    const handleCancelSubmission = async () => {
        if (!(await confirmAction('ยกเลิกการส่งงาน?', 'สถานะจะกลับไปเป็น "กำลังดำเนินการ" เพื่อให้คุณแก้ไขรูปภาพหรือข้อมูลได้', 'ใช่, ยกเลิกการส่ง'))) return;
        // เคลียร์ image_url เมื่อยกเลิก
        const { error } = await supabase.from('Jobs').update({ status: 'IN_PROGRESS', image_url: null }).eq('id', selectedJob.id);
        if (!error) { showSuccess("ยกเลิกการส่งงานแล้ว"); setOpenDetailDialog(false); fetchMyJobs(); }
    };

    const renderStepContent = (step: number) => {
      // Component ย่อยสำหรับแถวดาว
      const RatingRow = ({ label, val, setter }: any) => (
          <Box display="flex" justifyContent="space-between" alignItems="center" my={1.5}>
              <Typography variant="body1" fontWeight={500}>{label}</Typography>
              <Rating 
                  value={val} 
                  onChange={(e, v) => setFeedback({ ...feedback, [setter]: v })} 
                  size="large" 
              />
          </Box>
      );

      switch (step) {
          case 0: // ขั้นตอนที่ 1: ให้คะแนน (6 หัวข้อตามที่ขอ)
              return (
                  <Box>
                      <Typography variant="h6" gutterBottom color="primary" sx={{mb: 2}}>
                          ส่วนที่ 1: ความพึงพอใจต่อการบริการ
                      </Typography>
                      
                      <RatingRow label="1. ความสุภาพของพนักงาน" val={feedback.politeness} setter="politeness" />
                      <RatingRow label="2. ความรวดเร็วในการให้บริการ" val={feedback.service_speed} setter="service_speed" />
                      <RatingRow label="3. ความเรียบร้อยของงาน" val={feedback.repair_quality} setter="repair_quality" />
                      <RatingRow label="4. ความสะอาดหลังจบงาน" val={feedback.testing_check} setter="testing_check" />
                      <RatingRow label="5. ความตรงต่อเวลา" val={feedback.contact_convenience} setter="contact_convenience" />
                      
                      <Divider sx={{ my: 2 }} />
                      <RatingRow label="6. ความพึงพอใจโดยรวม" val={feedback.overall_satisfaction} setter="overall_satisfaction" />
                  </Box>
              );

          case 1: // ขั้นตอนที่ 2: ข้อเสนอแนะ & เซ็นชื่อ
              return (
                  <Box>
                      <Typography variant="h6" gutterBottom color="primary">
                          ส่วนที่ 2: ข้อเสนอแนะและยืนยัน
                      </Typography>

                      <Typography variant="subtitle2" gutterBottom>ข้อเสนอแนะเพิ่มเติม:</Typography>
                      <TextField 
                          placeholder="พิมพ์ข้อเสนอแนะที่นี่ (ถ้ามี)..." 
                          multiline 
                          rows={3} 
                          fullWidth 
                          value={feedback.suggestion} 
                          onChange={e => setFeedback({ ...feedback, suggestion: e.target.value })} 
                          sx={{ mb: 3 }} 
                      />

                      <Typography variant="subtitle2" gutterBottom>ลายเซ็นลูกค้า:</Typography>
                      <Box sx={{ border: '1px solid #ccc', bgcolor: '#fff', borderRadius: 1, overflow: 'hidden' }}>
                          <SignatureCanvas 
                              ref={sigPad} 
                              penColor="black" 
                              canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }} 
                              backgroundColor="#fafafa"
                          />
                      </Box>
                      <Button size="small" onClick={() => sigPad.current?.clear()} sx={{ mt: 1 }}>
                          ล้างลายเซ็น
                      </Button>
                  </Box>
              );
          default: return "";
      }
  }

    // ฟังก์ชันช่วยแสดงรูปภาพที่ส่งงานไปแล้ว (รองรับทั้งแบบรูปเดียว String และหลายรูป Array)
    const renderSubmittedImages = (imageUrlData: any) => {
        if (!imageUrlData) return null;

        let urls: string[] = [];
        if (Array.isArray(imageUrlData)) {
            urls = imageUrlData; // ถ้าเป็น Array อยู่แล้ว
        } else if (typeof imageUrlData === 'string') {
             // ถ้าเป็น string (ข้อมูลเก่า) ให้ลอง parse JSON หรือใส่เป็น array เดี่ยว
             try {
                 const parsed = JSON.parse(imageUrlData);
                 urls = Array.isArray(parsed) ? parsed : [imageUrlData];
             } catch (e) {
                 urls = [imageUrlData];
             }
        }

        if (urls.length === 0) return null;

        return (
            <Box mt={2}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <ImageIcon color="action" /><Typography variant="subtitle2">รูปภาพส่งงาน ({urls.length} รูป):</Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                    {urls.map((url, index) => (
                        <img key={index} src={url} alt={`หลักฐาน ${index + 1}`} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
                    ))}
                </Stack>
            </Box>
        );
    };

    // [เพิ่มฟังก์ชันใหม่] สำหรับรีเซ็ตค่าเมื่อปิดหน้าต่างขอบคุณ
    const handleCloseFeedback = () => {
        setOpenFeedback(false);
        // รอให้ Dialog ปิดสนิทก่อน ค่อยรีเซ็ตค่า (เพื่อความเนียน)
        setTimeout(() => {
            setSubmitSuccess(false);
            setActiveStep(0);
            // รีเซ็ตค่าคะแนนกลับเป็นค่าเริ่มต้น
            setFeedback({
                contact_convenience: 5, service_speed: 5, repair_time: 5, repair_quality: 5, testing_check: 5, 
                politeness: 5, expertise: 5, understanding: 5, advice: 5, notification: 5, 
                overall_satisfaction: 5, staff_satisfaction: 5, suggestion: '' 
            });
            // ล้างลายเซ็น (ถ้ามี)
            if (sigPad.current) sigPad.current.clear();
        }, 300);
    };

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
                            
                            {/* แสดงรูปภาพที่ส่งงานไปแล้ว (ใช้ฟังก์ชันช่วย) */}
                            {renderSubmittedImages(selectedJob.image_url)}

                            <Divider />
                            <Box sx={{ textAlign: 'center' }}>
                                {selectedJob.status === 'APPROVED' ? (
                                    <Chip label="งานเสร็จสมบูรณ์แล้ว (ไม่สามารถแก้ไขได้)" color="success" icon={<DoneIcon />} />
                                ) : (
                                    <>
                                        {selectedJob.status === 'PENDING' && <Button variant="contained" color="warning" size="large" startIcon={<PlayIcon />} onClick={handleStartJob}>เริ่มปฏิบัติงาน</Button>}
                                        {selectedJob.status === 'IN_PROGRESS' && (
                                            <Box sx={{ p: 2, border: '2px dashed #ccc', borderRadius: 2, bgcolor: '#FAFAFA' }}>
                                                <Typography variant="subtitle2" gutterBottom color="primary">📸 อัปโหลดรูปผลงานเพื่อส่งงาน (เลือกได้หลายรูป)</Typography>
                                                
                                                {/* --- แก้ไข Point 4: ส่วนแสดง Preview หลายรูป --- */}
                                                {previewUrls.length > 0 && (
                                                    <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', py: 1 }}>
                                                        {previewUrls.map((url, index) => (
                                                            <Box key={index} sx={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
                                                                <img src={url} alt={`Preview ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleRemoveImage(index)}
                                                                    sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
                                                                >
                                                                    <CloseIcon fontSize="small" />
                                                                </IconButton>
                                                            </Box>
                                                        ))}
                                                    </Stack>
                                                )}

                                                {/* ปุ่มเลือกรูป เพิ่ม attribute 'multiple' */}
                                                <Button variant="outlined" component="label" startIcon={previewUrls.length > 0 ? <AddPhotoIcon/> : <CloudUploadIcon />} sx={{ mb: 2 }}>
                                                    {previewUrls.length > 0 ? "เพิ่มรูปภาพอีก" : "เลือกรูปภาพ"}
                                                    <input hidden accept="image/*" type="file" multiple onChange={handleImageSelect} />
                                                </Button>
                                                
                                                <Button variant="contained" fullWidth size="large" sx={{ bgcolor: '#0288D1', color: 'white' }} startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <DoneIcon />} disabled={selectedImages.length === 0 || uploading} onClick={handlePreSubmit}>{uploading ? `กำลังอัปโหลด (${selectedImages.length} รูป)...` : 'ยืนยันส่งงาน'}</Button>
                                            </Box>
                                        )}
                                        {selectedJob.status === 'WAITING_REVIEW' && <Stack spacing={2} alignItems="center"><Chip label="รอแอดมินตรวจสอบ" color="primary" variant="outlined" /><Button variant="text" color="error" size="small" startIcon={<CancelIcon />} onClick={handleCancelSubmission}>ยกเลิกการส่งงาน (แก้ไขใหม่)</Button></Stack>}
                                    </>
                                )}
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}><Button variant="outlined" onClick={() => setOpenDetailDialog(false)} disabled={uploading} color="inherit">ปิดหน้าต่าง</Button></DialogActions>
            </Dialog>

            <Dialog open={openFeedback} fullWidth maxWidth="md">
        
        {/* CASE 1: หน้าจอขอบคุณ (ลูกค้าเห็นหน้านี้) - เหมือนเดิม */}
        {submitSuccess ? (
            <Box sx={{ p: 5, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 80, color: '#2E7D32', mb: 2 }} />
                <Typography variant="h4" gutterBottom fontWeight="bold" color="#2E7D32">
                    ขอบคุณที่ใช้บริการครับ
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    ข้อมูลการประเมินถูกบันทึกแล้ว กรุณาส่งคืนโทรศัพท์ให้เจ้าหน้าที่
                </Typography>
                <Button 
                    variant="contained" 
                    size="large" 
                    onClick={handleStaffCloseThankYou} 
                    sx={{ bgcolor: '#424242', color: 'white', px: 4 }}
                >
                    พนักงานรับเครื่องคืน
                </Button>
            </Box>

        /* CASE 2: หน้าเตรียมส่งงาน (พนักงานเห็นหน้านี้) - เหมือนเดิม */
        ) : customerFinished ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <AssignmentIcon sx={{ fontSize: 60, color: '#1976D2', mb: 2 }} />
                <Typography variant="h5" gutterBottom fontWeight="bold">
                    พร้อมส่งงาน
                </Typography>
                
                <Box sx={{ bgcolor: '#E3F2FD', p: 2, borderRadius: 2, mb: 3, mx: 'auto', maxWidth: 400 }}>
                    <Stack direction="row" alignItems="center" spacing={1} justifyContent="center" mb={1}>
                        <DoneIcon color="success" />
                        <Typography variant="body1" fontWeight="bold">ลูกค้าทำแบบประเมินแล้ว</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1} justifyContent="center">
                        <DoneIcon color="success" />
                        <Typography variant="body1" fontWeight="bold">ลูกค้าลงลายมือชื่อแล้ว</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                        (ระบบซ่อนคะแนนประเมินเพื่อความเป็นส่วนตัวของลูกค้า)
                    </Typography>
                </Box>

                <Stack direction="row" spacing={2} justifyContent="center">

                    <Button 
                        variant="contained" 
                        color="primary" 
                        size="large" 
                        onClick={handleFinalUpload} 
                        disabled={uploading}
                        startIcon={uploading ? <CircularProgress size={20} color="inherit"/> : <CloudUploadIcon />}
                    >
                        {uploading ? 'กำลังอัปโหลด...' : 'ยืนยันและส่งงาน'}
                    </Button>
                </Stack>
            </Box>

        /* CASE 3: แบบฟอร์มปกติ (แก้ส่วนนี้ครับ!) */
        ) : (
            <>
                <DialogTitle sx={{ bgcolor: '#D32F2F', color: 'white' }}>แบบสอบถามความพึงพอใจ</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {/* ✅ แก้: เหลือแค่ 2 ขั้นตอน (ให้คะแนน -> ยืนยัน) */}
                    <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
                        <Step><StepLabel>ประเมินความพึงพอใจ</StepLabel></Step>
                        <Step><StepLabel>ข้อเสนอแนะและลงนาม</StepLabel></Step>
                    </Stepper>
                    <Box sx={{ px: 2 }}>{renderStepContent(activeStep)}</Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button disabled={activeStep === 0} onClick={() => setActiveStep((prev) => prev - 1)}>ย้อนกลับ</Button>
                    
                    {/* ✅ แก้: เงื่อนไขจบงานคือ activeStep === 1 (เพราะมีแค่ index 0 กับ 1) */}
                    {activeStep === 1 ? 
                        <Button variant="contained" color="primary" onClick={handleCustomerSubmit}>
                            ยืนยันการประเมิน
                        </Button> 
                        : 
                        <Button variant="contained" onClick={() => setActiveStep((prev) => prev + 1)}>ถัดไป</Button>
                    }
                </DialogActions>
            </>
        )}
      </Dialog>
        </Layout>
    );
}
export default MyJobsPage;