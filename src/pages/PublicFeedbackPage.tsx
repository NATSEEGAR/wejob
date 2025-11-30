import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Container, Paper, Typography, Box, Rating, TextField, Button, 
  Divider, Stack, Step, StepLabel, Stepper, CircularProgress
} from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';

function PublicFeedbackPage() {
  const { jobId } = useParams(); // รับ ID งานจาก URL
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  
  const sigPad = useRef<any>(null);

  // State เก็บค่าคะแนน (6 หัวข้อ)
  const [feedback, setFeedback] = useState({
      politeness: 5, service_speed: 5, repair_quality: 5, 
      testing_check: 5, contact_convenience: 5, overall_satisfaction: 5,
      suggestion: ''
  });

  useEffect(() => {
    const fetchJob = async () => {
        if (!jobId) return;
        const { data, error } = await supabase.from('Jobs').select('*').eq('id', jobId).single();
        if (error) {
            Swal.fire('ผิดพลาด', 'ไม่พบข้อมูลงาน หรือลิงก์ไม่ถูกต้อง', 'error');
        } else {
            setJob(data);
        }
        setLoading(false);
    };
    fetchJob();
  }, [jobId]);

  const handleSubmit = async () => {
      if (sigPad.current && sigPad.current.isEmpty()) { 
          Swal.fire('แจ้งเตือน', 'กรุณาเซ็นชื่อก่อนส่งครับ', 'warning'); return; 
      }
      
      const confirmResult = await Swal.fire({
          title: 'ยืนยันการประเมิน',
          text: 'ข้อมูลจะถูกบันทึกทันที',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'ยืนยัน',
          cancelButtonText: 'ยกเลิก'
      });

      if (!confirmResult.isConfirmed) return;

      setSubmitting(true);
      try {
          // 1. อัปโหลดลายเซ็น
          const canvas = sigPad.current.getCanvas();
          const sigDataUrl = canvas.toDataURL('image/png');
          const sigBlob = await (await fetch(sigDataUrl)).blob();
          const sigFile = new File([sigBlob], "signature.png", { type: "image/png" });
          const sigName = `sig_public_${jobId}_${Date.now()}.png`;

          await supabase.storage.from('job-evidence').upload(sigName, sigFile);
          const { data: { publicUrl: sigUrl } } = supabase.storage.from('job-evidence').getPublicUrl(sigName);

          // 2. บันทึกข้อมูล
          await supabase.from('JobFeedbacks').insert([{ 
              job_id: jobId, ...feedback, signature_url: sigUrl 
          }]);

          setSubmitted(true); // เปลี่ยนเป็นหน้าขอบคุณ

      } catch (err: any) {
          Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
      } finally {
          setSubmitting(false);
      }
  };

  const RatingRow = ({ label, val, setter }: any) => (
      <Box display="flex" justifyContent="space-between" alignItems="center" my={1.5}>
          <Typography variant="body2" fontWeight={500}>{label}</Typography>
          <Rating value={val} onChange={(e, v) => setFeedback({ ...feedback, [setter]: v })} />
      </Box>
  );

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
  if (!job) return <Box p={4} textAlign="center"><Typography color="error">ไม่พบข้อมูลงาน</Typography></Box>;

  // --- หน้าจอขอบคุณ (เมื่อส่งเสร็จ) ---
  if (submitted) {
      return (
          <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 80, color: 'green', mb: 2 }} />
              <Typography variant="h4" fontWeight="bold" gutterBottom color="success.main">ขอบคุณครับ</Typography>
              <Typography>การประเมินของท่านถูกบันทึกเรียบร้อยแล้ว</Typography>
              <Typography variant="caption" color="text.secondary">ท่านสามารถปิดหน้านี้ได้ทันที</Typography>
          </Container>
      );
  }

  // --- หน้าแบบฟอร์ม ---
  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
            <Box textAlign="center" mb={3}>
                 {/* ใส่โลโก้บริษัทตรงนี้ได้ */}
                 <img src="/logo_numchai.png" alt="Logo" style={{ height: 40, marginBottom: 10 }} />
                 <Typography variant="h6" fontWeight="bold">แบบประเมินความพึงพอใจ</Typography>
                 <Typography variant="body2" color="text.secondary">งาน: {job.title}</Typography>
                 <Typography variant="caption" color="text.secondary">ลูกค้า: {job.customer_name}</Typography>
            </Box>

            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
                <Step><StepLabel>ให้คะแนน</StepLabel></Step>
                <Step><StepLabel>ลงนาม</StepLabel></Step>
            </Stepper>

            {activeStep === 0 && (
                <Box>
                    <RatingRow label="1. ความสุภาพ" val={feedback.politeness} setter="politeness" />
                    <RatingRow label="2. ความรวดเร็ว" val={feedback.service_speed} setter="service_speed" />
                    <RatingRow label="3. ความเรียบร้อย" val={feedback.repair_quality} setter="repair_quality" />
                    <RatingRow label="4. ความสะอาด" val={feedback.testing_check} setter="testing_check" />
                    <RatingRow label="5. ตรงต่อเวลา" val={feedback.contact_convenience} setter="contact_convenience" />
                    <Divider sx={{ my: 1 }} />
                    <RatingRow label="6. ความพึงพอใจรวม" val={feedback.overall_satisfaction} setter="overall_satisfaction" />
                    
                    <Button fullWidth variant="contained" sx={{ mt: 3 }} onClick={() => setActiveStep(1)}>ถัดไป</Button>
                </Box>
            )}

            {activeStep === 1 && (
                <Box>
                    <Typography gutterBottom>ข้อเสนอแนะ:</Typography>
                    <TextField 
                        fullWidth multiline rows={2} 
                        placeholder="ระบุข้อเสนอแนะ..." 
                        value={feedback.suggestion} 
                        onChange={e => setFeedback({ ...feedback, suggestion: e.target.value })} 
                        sx={{ mb: 2 }}
                    />
                    
                    <Typography gutterBottom>ลายเซ็นลูกค้า:</Typography>
                    <Box sx={{ border: '1px solid #ccc', borderRadius: 1, bgcolor: '#fafafa' }}>
                        <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{ width: 300, height: 150, className: 'sigCanvas' }} />
                    </Box>
                    <Button size="small" onClick={() => sigPad.current?.clear()}>ล้างลายเซ็น</Button>

                    <Stack direction="row" spacing={2} mt={3}>
                        <Button fullWidth variant="outlined" onClick={() => setActiveStep(0)}>ย้อนกลับ</Button>
                        <Button fullWidth variant="contained" color="primary" onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'กำลังส่ง...' : 'ยืนยันการส่ง'}
                        </Button>
                    </Stack>
                </Box>
            )}
        </Paper>
    </Container>
  );
}

export default PublicFeedbackPage;