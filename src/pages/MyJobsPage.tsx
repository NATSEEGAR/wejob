import React, { useEffect, useState, useRef } from 'react';
import {
    Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Stack,
    Dialog, DialogTitle, DialogContent, DialogActions, Divider, Box, CircularProgress, TextField, InputAdornment, Rating, IconButton, Stepper, Step, StepLabel,
    MenuItem, Select, FormControl, TablePagination
} from '@mui/material';
import imageCompression from 'browser-image-compression';
import { supabase } from '../supabaseClient';
import {
    LocationOn, Visibility,
    PlayArrow as PlayIcon, Done as DoneIcon, CloudUpload as CloudUploadIcon,
    Person as PersonIcon, Phone as PhoneIcon, Image as ImageIcon,
    Search as SearchIcon, Map as MapIcon, Assignment as AssignmentIcon,
    Close as CloseIcon, AddPhotoAlternate as AddPhotoIcon, CalendarMonth as CalendarIcon,
    CheckCircle as CheckCircleIcon 
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { confirmAction, showSuccess, showError } from '../utils/alertUtils';
import SignatureCanvas from 'react-signature-canvas';
import QRCode from "react-qr-code";
import dayjs from 'dayjs';

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

const getStatusColor = (status: string) => {
    switch (status) {
        case 'PENDING': return '#D32F2F';
        case 'IN_PROGRESS': return '#FBC02D';
        case 'WAITING_REVIEW': return '#66BB6A';
        case 'APPROVED': return '#1B5E20';
        case 'DONE': return '#1B5E20';
        default: return '#757575';
    }
};

function MyJobsPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [page, setPage] = useState(0); 
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ✅ [NEW] State ตัวกรองสถานะ
    const [uploading, setUploading] = useState(false);
    const [signatureData, setSignatureData] = useState<string | null>(null);

    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    const [openFeedback, setOpenFeedback] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [isCustomerFinished, setIsCustomerFinished] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const sigPad = useRef<any>(null);

    const [feedback, setFeedback] = useState({
        politeness: 5, service_speed: 5, repair_quality: 5, testing_check: 5, contact_convenience: 5, overall_satisfaction: 5,
        repair_time: 5, expertise: 5, understanding: 5, advice: 5, notification: 5, staff_satisfaction: 5,
        suggestion: ''
    });

    useEffect(() => { fetchMyJobs(); }, []);

    useEffect(() => {
        let subscription: any;
        if (showQR && selectedJob) {
            setIsCustomerFinished(false); 

            // เช็คก่อนว่ามีข้อมูลในฐานข้อมูลหรือยัง
            const checkStatus = async () => {
                const { data } = await supabase.from('JobFeedbacks').select('id').eq('job_id', selectedJob.id).single();
                if (data) setIsCustomerFinished(true);
            };
            checkStatus();

            // เปิดหูฟัง (Real-time)
            subscription = supabase.channel('check-feedback')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'JobFeedbacks', filter: `job_id=eq.${selectedJob.id}` }, () => {
                    setIsCustomerFinished(true);
                    showSuccess("ลูกค้าประเมินเสร็จแล้ว", "กดปิดงานได้เลยครับ");
                })
                .subscribe();
        }
        return () => { if (subscription) supabase.removeChannel(subscription); };
    }, [showQR, selectedJob]);

    const fetchMyJobs = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('JobAssignments').select(`job_id, Jobs:job_id (*)`).eq('user_id', user.id).order('id', { ascending: false });
        const myJobList = data?.map((item: any) => item.Jobs).filter((j: any) => j !== null) || [];
        myJobList.sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        setJobs(myJobList);
    };

    const filteredJobs = jobs.filter((job) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = ((job.title?.toLowerCase().includes(query)) || (job.location?.toLowerCase().includes(query)) || (job.customer_name?.toLowerCase().includes(query)));
        
        // ✅ [NEW] กรองตามสถานะ
        const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const openJobDetail = (job: any) => {
        const info = getDisplayTimeInfo(job.start_time, job.end_time);
        const dateFormatted = dayjs(job.start_time).format('DD/MM/YYYY');
        setSelectedJob({ ...job, display_date: dateFormatted, display_slot: info.label });
        setSelectedImages([]); setPreviewUrls([]);
        setOpenDetailDialog(true);
    };

    const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            // 1. เปิดสถานะ Loading (ล็อกปุ่มส่งงานชั่วคราว ขณะบีบอัด)
            setUploading(true);
            
            const originalFiles = Array.from(event.target.files);
            const compressedFiles: File[] = [];
            const newPreviewUrls: string[] = [];

            // 2. ตั้งค่าการบีบอัด (ปรับจูนได้ตามใจชอบ)
            const options = {
                maxSizeMB: 0.5,          // 📉 บีบให้ไฟล์ไม่เกิน 0.5 MB (500KB)
                maxWidthOrHeight: 1280,  // 🖼️ ย่อขนาดภาพด้านที่ยาวที่สุดไม่เกิน 1280px (ชัดพอสำหรับงานตรวจ)
                useWebWorker: true,      // 🚀 ใช้ WebWorker เพื่อไม่ให้หน้าเว็บค้างขณะบีบอัด
                fileType: "image/jpeg"   // 📷 แปลงเป็น JPEG เสมอ (ไฟล์เล็กกว่า PNG)
            };

            try {
                // 3. วนลูปบีบอัดทีละรูป
                for (const file of originalFiles) {
                    // เช็คว่าเป็นไฟล์รูปไหม
                    if (file.type.startsWith('image/')) {
                        // console.log(`ขนาดเดิม: ${file.size / 1024 / 1024} MB`); // เอาไว้ดูเล่นใน Console
                        
                        const compressedFile = await imageCompression(file, options);
                        
                        // console.log(`ขนาดใหม่: ${compressedFile.size / 1024 / 1024} MB`); // ดูผลลัพธ์
                        
                        compressedFiles.push(compressedFile);
                        newPreviewUrls.push(URL.createObjectURL(compressedFile));
                    } else {
                        // ถ้าไม่ใช่รูป (เช่น PDF) ก็เก็บไว้เหมือนเดิม
                        compressedFiles.push(file);
                        newPreviewUrls.push(URL.createObjectURL(file));
                    }
                }

                // 4. อัปเดตลง State
                setSelectedImages((prevFiles) => [...prevFiles, ...compressedFiles]);
                setPreviewUrls((prevUrls) => [...prevUrls, ...newPreviewUrls]);

            } catch (error) {
                console.error("Compression Error:", error);
                showError("เกิดข้อผิดพลาด", "ไม่สามารถบีบอัดรูปภาพได้ แต่รูปเดิมยังอยู่");
                // ถ้าบีบไม่ได้ ให้ใช้รูปเดิมไปก่อน
                setSelectedImages((prevFiles) => [...prevFiles, ...originalFiles]);
                const fallbackUrls = originalFiles.map((f) => URL.createObjectURL(f));
                setPreviewUrls((prevUrls) => [...prevUrls, ...fallbackUrls]);
            } finally {
                // 5. ปิดสถานะ Loading และเคลียร์ช่องเลือกไฟล์
                setUploading(false);
                event.target.value = '';
            }
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        URL.revokeObjectURL(previewUrls[indexToRemove]);
        setSelectedImages((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
        setPreviewUrls((prevUrls) => prevUrls.filter((_, index) => index !== indexToRemove));
    };

    const handleStartJob = async () => {
        if (!(await confirmAction('เริ่มงาน?', 'ยืนยันที่จะเริ่มปฏิบัติงาน'))) return;
        const { error } = await supabase.from('Jobs').update({ status: 'IN_PROGRESS' }).eq('id', selectedJob.id);
        if (!error) { showSuccess('เริ่มงานแล้ว'); setOpenDetailDialog(false); fetchMyJobs(); }
    };

    const handlePreSubmit = () => {
        if (selectedImages.length === 0) { 
            showError("กรุณาแนบรูป", "ต้องถ่ายรูปหน้างานเพื่อยืนยันอย่างน้อย 1 รูป"); 
            return; 
        }
        if (selectedJob.is_feedback_required) { 
            setOpenDetailDialog(false); 
            setShowQR(true); 
        } else { 
            handleSubmitJob(); 
        }
    };

    const handleCheckAndSubmit = async () => {
        // 1. เช็คจาก State (เร็วสุด)
        if (isCustomerFinished) {
            setShowQR(false);
            handleSubmitJob(true);
            return;
        }

        // 2. ถ้า State ยังไม่เปลี่ยน ให้เช็คกับ Database อีกที (กันเหนียว)
        const { data } = await supabase.from('JobFeedbacks').select('id').eq('job_id', selectedJob.id).single();
        if (data) {
            setShowQR(false);
            handleSubmitJob(true);
        } else {
            // 3. ถ้ายังไม่มีข้อมูลจริงๆ ให้แจ้งเตือน
            showError("ยังปิดงานไม่ได้", "ลูกค้ายังประเมินไม่เสร็จสิ้น");
        }
    };

    const handleCustomerSubmit = async () => {
      if (sigPad.current && sigPad.current.isEmpty()) { 
          showError("กรุณาเซ็นชื่อ", "ลูกค้าต้องเซ็นชื่อรับรอง"); 
          return; 
      }
      if (!(await confirmAction('ยืนยันการประเมิน', 'ข้อมูลจะถูกบันทึกและไม่สามารถแก้ไขได้'))) return;

      const canvas = sigPad.current.getCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      setSignatureData(dataUrl);
      setSubmitSuccess(true);
    };

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

          setOpenFeedback(false); setSubmitSuccess(false); setActiveStep(0); setSignatureData(null);
      } catch (err: any) { showError("เกิดข้อผิดพลาด", err.message); } finally { setUploading(false); }
    };

    const handleSubmitJob = async (skipConfirm = false) => {
        if (!skipConfirm && !(await confirmAction('ยืนยันการส่งงาน?', 'ตรวจสอบความเรียบร้อยแล้วใช่หรือไม่'))) return;
        
        if (selectedImages.length === 0) {
             showError("ไม่พบรูปภาพ", "กรุณาเลือกรูปภาพก่อนส่งงาน"); return;
        }

        setUploading(true);
        try {
            const uploadedUrls: string[] = [];
            await Promise.all(selectedImages.map(async (file, index) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${selectedJob.id}_${Date.now()}_${index}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('job-evidence').upload(fileName, file);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('job-evidence').getPublicUrl(fileName);
                uploadedUrls.push(publicUrl);
            }));

            const { error: dbError } = await supabase.from('Jobs').update({ status: 'WAITING_REVIEW', image_url: uploadedUrls }).eq('id', selectedJob.id);
            if (dbError) throw dbError;
            showSuccess("ส่งงานเรียบร้อย!", "ขอบคุณครับ"); setOpenDetailDialog(false); fetchMyJobs();
        } catch (error: any) { showError("เกิดข้อผิดพลาดในการอัปโหลด", error.message); } finally { setUploading(false); }
    };

    const handleCancelSubmission = async () => {
        if (!(await confirmAction('ยกเลิกการส่งงาน?', 'สถานะจะกลับไปเป็น "กำลังดำเนินการ" เพื่อให้คุณแก้ไขรูปภาพหรือข้อมูลได้', 'ใช่, ยกเลิกการส่ง'))) return;
        const { error } = await supabase.from('Jobs').update({ status: 'IN_PROGRESS', image_url: null }).eq('id', selectedJob.id);
        if (!error) { showSuccess("ยกเลิกการส่งงานแล้ว"); setOpenDetailDialog(false); fetchMyJobs(); }
    };

    const handleCloseFeedback = () => {
        setOpenFeedback(false);
        setTimeout(() => {
            setSubmitSuccess(false); setActiveStep(0);
            setFeedback({ politeness: 5, service_speed: 5, repair_quality: 5, testing_check: 5, contact_convenience: 5, overall_satisfaction: 5, repair_time: 5, expertise: 5, understanding: 5, advice: 5, notification: 5, staff_satisfaction: 5, suggestion: '' });
            if (sigPad.current) sigPad.current.clear();
        }, 300);
    };

    const renderStepContent = (step: number) => {
        const RatingRow = ({ label, val, setter }: any) => (
            <Box display="flex" justifyContent="space-between" alignItems="center" my={1.5}>
                <Typography variant="body1" fontWeight={500}>{label}</Typography>
                <Rating value={val} onChange={(e, v) => setFeedback({ ...feedback, [setter]: v })} size="large" />
            </Box>
        );
        switch (step) {
            case 0: return (<Box><Typography variant="h6" gutterBottom color="primary" sx={{mb: 2}}>ส่วนที่ 1: ความพึงพอใจต่อการบริการ</Typography><RatingRow label="1. ความสุภาพของพนักงาน" val={feedback.politeness} setter="politeness" /><RatingRow label="2. ความรวดเร็วในการให้บริการ" val={feedback.service_speed} setter="service_speed" /><RatingRow label="3. ความเรียบร้อยของงาน" val={feedback.repair_quality} setter="repair_quality" /><RatingRow label="4. ความสะอาดหลังจบงาน" val={feedback.testing_check} setter="testing_check" /><RatingRow label="5. ความตรงต่อเวลา" val={feedback.contact_convenience} setter="contact_convenience" /><Divider sx={{ my: 2 }} /><RatingRow label="6. ความพึงพอใจโดยรวม" val={feedback.overall_satisfaction} setter="overall_satisfaction" /></Box>);
            case 1: return (<Box><Typography variant="h6" gutterBottom color="primary">ส่วนที่ 2: ข้อเสนอแนะและยืนยัน</Typography><Typography variant="subtitle2" gutterBottom>ข้อเสนอแนะเพิ่มเติม:</Typography><TextField placeholder="พิมพ์ข้อเสนอแนะที่นี่ (ถ้ามี)..." multiline rows={3} fullWidth value={feedback.suggestion} onChange={e => setFeedback({ ...feedback, suggestion: e.target.value })} sx={{ mb: 3 }} /><Typography variant="subtitle2" gutterBottom>ลายเซ็นลูกค้า:</Typography><Box sx={{ border: '1px solid #ccc', bgcolor: '#fff', borderRadius: 1, overflow: 'hidden' }}><SignatureCanvas ref={sigPad} penColor="black" canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }} backgroundColor="#fafafa" /></Box><Button size="small" onClick={() => sigPad.current?.clear()} sx={{ mt: 1 }}>ล้างลายเซ็น</Button></Box>);
            default: return "";
        }
    }

    const renderSubmittedImages = (imageUrlData: any) => {
        if (!imageUrlData) return null;
        let urls: string[] = [];
        if (Array.isArray(imageUrlData)) { urls = imageUrlData; } 
        else if (typeof imageUrlData === 'string') { try { const parsed = JSON.parse(imageUrlData); urls = Array.isArray(parsed) ? parsed : [imageUrlData]; } catch (e) { urls = [imageUrlData]; } }
        if (urls.length === 0) return null;
        return (<Box mt={2}><Stack direction="row" alignItems="center" spacing={1} mb={1}><ImageIcon color="action" /><Typography variant="subtitle2">รูปภาพส่งงาน ({urls.length} รูป):</Typography></Stack><Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>{urls.map((url, index) => (<img key={index} src={url} alt={`หลักฐาน ${index + 1}`} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />))}</Stack></Box>);
    };

    return (
        <Layout title="งานของฉัน">
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', md: 'center' }} mb={3} spacing={2}>
                <Typography variant="h4">งานที่ได้รับมอบหมาย</Typography>
                <Stack direction="row" spacing={2}>
                    {/* ✅ [NEW] ตัวกรองสถานะ */}
                    <FormControl size="small" sx={{ minWidth: 150, bgcolor: 'white', borderRadius: 1 }}>
                        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} displayEmpty>
                            <MenuItem value="ALL">ทุกสถานะ</MenuItem>
                            <MenuItem value="PENDING">รอดำเนินการ</MenuItem>
                            <MenuItem value="IN_PROGRESS">กำลังดำเนินการ</MenuItem>
                            <MenuItem value="WAITING_REVIEW">รอตรวจงาน</MenuItem>
                            <MenuItem value="APPROVED">เสร็จสมบูรณ์</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField placeholder="ค้นหางาน..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>) }} sx={{ bgcolor: 'white', borderRadius: 1, minWidth: 200 }} />
                </Stack>
            </Stack>
            
            <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: '#424242' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'white' }}>งาน / สถานที่</TableCell>
                                <TableCell sx={{ color: 'white' }}>สถานะ</TableCell>
                                <TableCell sx={{ color: 'white' }}>วันที่ / ช่วงเวลา</TableCell>
                                <TableCell align="center" sx={{ color: 'white' }}>จัดการ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredJobs
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((job) => {
                                const start = dayjs(job.start_time);
                                const end = dayjs(job.end_time);
                                const isMultiDay = !start.isSame(end, 'day');

                                // ✅ 2. สร้างข้อความแสดงผล
                                const dateShow = isMultiDay 
                                    ? `${start.format('DD/MM/YYYY')} - ${end.format('DD/MM/YYYY')}` 
                                    : start.format('DD/MM/YYYY');

                                const slotLabel = TIME_SLOTS.find(s => s.value === getSlotFromTime(job.start_time))?.label;

                                return (
                                <TableRow key={job.id} hover>
                                    <TableCell>
                                        <Typography fontWeight={600}>{job.title}</Typography>
                                        <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5} color="text.secondary">
                                            <LocationOn fontSize="small" color="action" />
                                            <Typography variant="caption">{job.location || '-'}</Typography>
                                        </Stack>
                                        {job.is_feedback_required && <Chip label="ต้องประเมิน" size="small" color="warning" variant="outlined" icon={<AssignmentIcon />} sx={{ mt: 0.5, height: 20, fontSize: 10 }} />}
                                    </TableCell>
                                    <TableCell><Chip label={getStatusLabel(job.status)} size="small" sx={{ bgcolor: getStatusColor(job.status), color: 'white', fontWeight: 'bold', minWidth: '90px' }} /></TableCell>
                                    <TableCell>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <CalendarIcon fontSize="small" color="primary" />
                                            <Typography variant="body2" fontWeight="bold" sx={{ whiteSpace: 'nowrap' }}>{dateShow}</Typography>
                                        </Stack>
                                        
                                        {/* ✅ ต้องเรียกใช้ฟังก์ชัน getDisplayTimeInfo เพื่อให้เช็คนาทีได้ */}
                                        {(() => {
                                            const info = getDisplayTimeInfo(job.start_time, job.end_time);
                                            return (
                                                <Chip 
                                                    label={info.label} 
                                                    size="small" 
                                                    variant={info.isSlot ? "filled" : "outlined"} 
                                                    color={info.isSlot ? "default" : "info"} 
                                                    sx={{ mt: 0.5, fontSize: '0.75rem' }} 
                                                />
                                            );
                                        })()}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Button variant="outlined" size="small" startIcon={<Visibility />} onClick={() => openJobDetail(job)}>รายละเอียด</Button>
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                            {/* ... (ส่วนแสดงเมื่อไม่มีข้อมูล เหมือนเดิม) ... */}
                        </TableBody>
                    </Table>
                </TableContainer>
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
            </Paper>

            <Dialog open={showQR} onClose={() => setShowQR(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ textAlign: 'center', bgcolor: '#1976D2', color: 'white' }}>📱 สแกนเพื่อประเมินงาน</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                    <Typography variant="h6" gutterBottom fontWeight="bold" align="center">{selectedJob?.title}</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>ให้ลูกค้าสแกน QR Code นี้เพื่อทำแบบสอบถาม</Typography>
                    {selectedJob && (
                        <Box sx={{ p: 3, border: '2px dashed #1976D2', borderRadius: 4, bgcolor: 'white', mb: 3 }}>
                            <QRCode value={`${window.location.origin}/feedback/${selectedJob.id}`} size={200} level="H" />
                        </Box>
                    )}
                    <Stack spacing={2} width="100%">
                        <Button 
                        variant="contained" 
                        // เปลี่ยนสีปุ่ม: ถ้าเสร็จแล้วเป็นสีเขียว (success), ยังไม่เสร็จเป็นสีน้ำเงิน (primary)
                        color={isCustomerFinished ? "success" : "primary"}
                        size="large" 
                        // ✅ เรียกใช้ฟังก์ชันตรวจสอบที่เราเพิ่งสร้าง
                        onClick={handleCheckAndSubmit}
                        fullWidth
                        sx={{ mt: 3 }}
                    >
                        {/* เปลี่ยนข้อความปุ่มตามสถานะ */}
                        {isCustomerFinished ? "ยืนยันปิดงาน (เสร็จสิ้น)" : "ลูกค้าทำเสร็จแล้ว (ปิดงาน)"}
                    </Button>
                        
                        
                    </Stack>
                </DialogContent>
            </Dialog>

            <Dialog open={openFeedback} onClose={handleCloseFeedback} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: '#1976D2', color: 'white' }}>📋 แบบประเมินความพึงพอใจ</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {!submitSuccess ? (
                        <><Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}><Step><StepLabel>ให้คะแนน</StepLabel></Step><Step><StepLabel>ข้อเสนอแนะ & เซ็นชื่อ</StepLabel></Step></Stepper>{renderStepContent(activeStep)}</>
                    ) : (
                        <Box textAlign="center" py={4}><CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} /><Typography variant="h5" color="success.main" gutterBottom>ขอบคุณสำหรับการประเมิน</Typography><Typography variant="body1" color="text.secondary">ข้อมูลถูกบันทึกเรียบร้อยแล้ว</Typography></Box>
                    )}
                </DialogContent>
                <DialogActions>{!submitSuccess ? (<><Button disabled={activeStep === 0} onClick={() => setActiveStep(prev => prev - 1)}>ย้อนกลับ</Button>{activeStep === 0 ? <Button variant="contained" onClick={() => setActiveStep(1)}>ถัดไป</Button> : <Button variant="contained" color="success" onClick={handleCustomerSubmit}>ยืนยันการประเมิน</Button>}</>) : (<Button variant="contained" color="primary" onClick={handleFinalUpload}>เสร็จสิ้น (ส่งงาน)</Button>)}</DialogActions>
            </Dialog>

            <Dialog open={openDetailDialog} onClose={() => !uploading && setOpenDetailDialog(false)} fullWidth maxWidth="sm">
                <Box sx={{ bgcolor: selectedJob ? getStatusColor(selectedJob.status) : 'grey', height: 8, width: '100%' }} />
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h5" fontWeight="bold">{selectedJob?.title}</Typography>
                    <Stack direction="row" alignItems="center" spacing={1} mt={1}><LocationOn fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">{selectedJob?.location || 'ไม่ระบุสถานที่'}</Typography></Stack>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {selectedJob && (
                        <Stack spacing={3}>
                            <Box sx={{ p: 2, bgcolor: '#E3F2FD', borderRadius: 2, border: '1px solid #BBDEFB', textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary">เวลานัดหมาย</Typography>
                                <Typography variant="h6" color="primary" fontWeight="bold">{selectedJob.display_date}</Typography>
                                <Chip label={selectedJob.display_slot} color="info" sx={{ mt: 0.5 }} />
                            </Box>
                            {selectedJob.map_url && <Button variant="outlined" color="primary" startIcon={<MapIcon />} href={selectedJob.map_url} target="_blank">ดูแผนที่</Button>}
                            <Box sx={{ p: 2, bgcolor: '#FFF3E0', borderRadius: 2, border: '1px solid #FFE0B2' }}><Stack direction="row" spacing={1} alignItems="center" mb={1}><PersonIcon color="warning" /><Typography variant="subtitle2" fontWeight="bold">ติดต่อลูกค้า</Typography></Stack><Typography variant="body1">คุณ {selectedJob.customer_name || '-'}</Typography><Stack direction="row" spacing={1} alignItems="center" mt={0.5}><PhoneIcon fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">{selectedJob.customer_phone || '-'}</Typography></Stack></Box>
                            <Box sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2, border: '1px solid #eee' }}><Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{selectedJob.description || "-"}</Typography></Box>
                            {renderSubmittedImages(selectedJob.image_url)}
                            <Divider />
                            <Box sx={{ textAlign: 'center' }}>
                                {selectedJob.status === 'APPROVED' ? (
                                    <Chip label="งานเสร็จสมบูรณ์แล้ว" color="success" icon={<DoneIcon />} />
                                ) : (
                                    <>
                                        {selectedJob.status === 'PENDING' && <Button variant="contained" color="warning" size="large" startIcon={<PlayIcon />} onClick={handleStartJob}>เริ่มปฏิบัติงาน</Button>}
                                        {selectedJob.status === 'IN_PROGRESS' && (
                                            <Box sx={{ p: 2, border: '2px dashed #ccc', borderRadius: 2, bgcolor: '#FAFAFA' }}>
                                                <Typography variant="subtitle2" gutterBottom color="primary">📸 อัปโหลดรูปผลงานเพื่อส่งงาน</Typography>
                                                {previewUrls.length > 0 && (
                                                    <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', py: 1 }}>
                                                        {previewUrls.map((url, index) => (
                                                            <Box key={index} sx={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
                                                                <img src={url} alt={`Preview ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                                                                <IconButton size="small" onClick={() => handleRemoveImage(index)} sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}><CloseIcon fontSize="small" /></IconButton>
                                                            </Box>
                                                        ))}
                                                    </Stack>
                                                )}
                                                <Button variant="outlined" component="label" startIcon={previewUrls.length > 0 ? <AddPhotoIcon/> : <CloudUploadIcon />} sx={{ mb: 2 }}>
                                                    {previewUrls.length > 0 ? "เพิ่มรูปภาพอีก" : "เลือกรูปภาพ"}
                                                    <input hidden accept="image/*" type="file" multiple onChange={handleImageSelect} />
                                                </Button>
                                                <Button variant="contained" fullWidth size="large" sx={{ bgcolor: '#0288D1', color: 'white' }} startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <DoneIcon />} disabled={selectedImages.length === 0 || uploading} onClick={handlePreSubmit}>{uploading ? `กำลังอัปโหลด...` : 'ยืนยันส่งงาน'}</Button>
                                            </Box>
                                        )}
                                        {selectedJob.status === 'WAITING_REVIEW' && (
                                            <Stack spacing={1} alignItems="center">
                                                <Chip label="รอแอดมินตรวจสอบ" color="primary" variant="outlined" />
                                                <Button variant="text" color="error" size="small" onClick={handleCancelSubmission}>ยกเลิกการส่ง (เพื่อแก้ไข)</Button>
                                            </Stack>
                                        )}
                                    </>
                                )}
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDetailDialog(false)}>ปิด</Button></DialogActions>
            </Dialog>
        </Layout>
    );
}

export default MyJobsPage;