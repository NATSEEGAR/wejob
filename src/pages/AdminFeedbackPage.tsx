import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Container, Grid, Paper, Chip, 
  Rating, LinearProgress, Stack, Avatar, Card, CardContent, 
  Divider, Button, FormControl, InputLabel, Select, MenuItem 
} from '@mui/material';
import { Star, SentimentVeryDissatisfied, SentimentSatisfiedAlt, SentimentVerySatisfied, EventNote, FilterList } from '@mui/icons-material';
import Layout from '../components/Layout';
// Import Supabase
import { supabase } from '../supabaseClient'; 

export default function AdminFeedbackPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]); // เก็บรายชื่อแผนกจาก DB
  const [filterRate, setFilterRate] = useState<number | null>(null);
  const [filterDept, setFilterDept] = useState<number>(0); // 0 = ดูทั้งหมด (ใช้ ID แทนชื่อ)
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        // 1. ดึงรายชื่อแผนก (Departments) มาใส่ Dropdown
        const { data: deptData } = await supabase.from('Departments').select('*');
        setDepartments(deptData || []);

        // 2. ดึง Feedback และ Join กับ Jobs เพื่อเอาชื่อและแผนก (ตามโค้ดเก่าของคุณ)
        const { data: fbData, error } = await supabase
            .from('JobFeedbacks')
            .select('*, Jobs(title, department_ids, customer_name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 3. แปลงข้อมูล (Map Data) ให้เข้ากับหน้า Dashboard ใหม่
        if (fbData) {
            const formattedData = fbData.map((fb: any) => {
                // หาชื่อแผนกจาก ID (สมมติว่างานหนึ่งมี 1 แผนกหลัก)
                const deptId = fb.Jobs?.department_ids?.[0] || 0; // เดาว่าเป็น Array [id]
                const deptName = deptData?.find(d => d.id === deptId)?.name || 'ไม่ระบุฝ่าย';

                return {
                    id: fb.id,
                    title: fb.Jobs?.title || 'ไม่ระบุงาน',
                    customer_name: fb.Jobs?.customer_name || 'ลูกค้าทั่วไป',
                    // แปลงคะแนน: ใช้ overall_satisfaction เป็นดาวหลัก
                    rating: fb.overall_satisfaction || 0, 
                    // แปลงคอมเมนต์: ใช้ suggestion
                    feedback_comment: fb.suggestion, 
                    updated_at: fb.created_at,
                    department: deptName,      // ชื่อแผนก (ไว้โชว์)
                    department_id: deptId,     // ID แผนก (ไว้กรอง)
                    // เก็บรายละเอียดคะแนนย่อยไว้เผื่ออยากใช้
                    details: {
                        politeness: fb.politeness,
                        speed: fb.service_speed,
                        quality: fb.repair_quality
                    }
                };
            });
            setReviews(formattedData);
        }

    } catch (error) {
        console.error("Error fetching data:", error);
    }
  };

  // --- Logic กรองข้อมูล ---
  const filteredReviews = reviews.filter(job => {
    const matchRate = filterRate ? job.rating === filterRate : true;
    
    // กรองตาม ID แผนก (ถ้า filterDept เป็น 0 คือเอาหมด)
    // เช็คว่า department_id ของงาน ตรงกับที่เลือกไหม
    // หรือถ้าโครงสร้างเก่า department_ids เป็น array ก็ต้องเช็คแบบ includes (แต่ในที่นี้ผม map มาเป็น single id แล้ว)
    const matchDept = filterDept !== 0 ? job.department_id === filterDept : true;
    
    return matchRate && matchDept;
  });

  // --- คำนวณ KPI ---
  const totalReviews = filteredReviews.length;
  const averageRating = totalReviews > 0 
    ? (filteredReviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / totalReviews).toFixed(1) 
    : '0.0';

  const starCounts = [5, 4, 3, 2, 1].map(star => {
    const count = filteredReviews.filter(r => r.rating === star).length;
    const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    return { star, count, percent };
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  // หาชื่อแผนกที่กำลังเลือกอยู่ (เพื่อมาแสดงใน Chip)
  const currentDeptName = departments.find(d => d.id === filterDept)?.name || 'ทั้งหมด';

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1E293B' }}>
            สรุปความพึงพอใจ
            </Typography>
            {filterDept !== 0 && (
                <Chip label={`ฝ่าย: ${currentDeptName}`} color="primary" onDelete={() => setFilterDept(0)} />
            )}
        </Stack>

        {/* --- Filter Bar --- */}
        <Paper sx={{ p: 2, mb: 4, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', color: '#64748B' }}>
                <FilterList sx={{ mr: 1 }} />
                <Typography fontWeight="bold">ตัวกรอง:</Typography>
            </Box>

            {/* Dropdown เลือกฝ่าย (ดึงจาก DB Departments) */}
            <FormControl size="small" sx={{ minWidth: 250 }}>
                <InputLabel>เลือกฝ่าย/แผนก</InputLabel>
                <Select
                    value={filterDept}
                    label="เลือกฝ่าย/แผนก"
                    onChange={(e) => setFilterDept(Number(e.target.value))}
                >
                    <MenuItem value={0}><em>ดูทั้งหมดทุกฝ่าย</em></MenuItem>
                    {departments.map((dept) => (
                        <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />

            {/* ปุ่มเลือกดาว */}
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto' }}>
                <Button 
                    variant={filterRate === null ? 'contained' : 'outlined'} 
                    onClick={() => setFilterRate(null)}
                    color="inherit"
                    size="small"
                    sx={{ borderRadius: 20 }}
                >
                    ทุกเรตติ้ง
                </Button>
                {[5, 4, 3, 2, 1].map(star => (
                    <Button 
                        key={star}
                        variant={filterRate === star ? 'contained' : 'outlined'}
                        onClick={() => setFilterRate(star)}
                        color={star >= 4 ? 'success' : star === 3 ? 'warning' : 'error'}
                        startIcon={<Star />}
                        size="small"
                        sx={{ borderRadius: 20 }}
                    >
                        {star}
                    </Button>
                ))}
            </Stack>
        </Paper>

        {/* --- Dashboard KPI --- */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4, height: '100%', bgcolor: '#fff', boxShadow: 3 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>คะแนนเฉลี่ย</Typography>
                    <Typography variant="h1" fontWeight="bold" sx={{ color: '#D32F2F' }}>
                        {averageRating}
                    </Typography>
                    <Rating value={parseFloat(averageRating)} precision={0.1} readOnly size="large" sx={{ my: 1, fontSize: '2.5rem' }} />
                    <Typography variant="body1" color="text.secondary">
                        จาก {totalReviews} งาน (ที่แสดงอยู่)
                    </Typography>
                </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
                <Paper sx={{ p: 4, borderRadius: 4, height: '100%', bgcolor: '#fff', boxShadow: 3 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>การกระจายคะแนน</Typography>
                    <Stack spacing={1.5}>
                        {starCounts.map((item) => (
                            <Stack key={item.star} direction="row" alignItems="center" spacing={2}>
                                <Stack direction="row" alignItems="center" sx={{ minWidth: 50 }}>
                                    <Typography fontWeight="bold" sx={{ mr: 0.5 }}>{item.star}</Typography>
                                    <Star fontSize="small" color="warning" />
                                </Stack>
                                <Box sx={{ flexGrow: 1 }}>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={item.percent} 
                                        sx={{ 
                                            height: 10, 
                                            borderRadius: 5,
                                            bgcolor: '#F1F5F9',
                                            '& .MuiLinearProgress-bar': {
                                                bgcolor: item.star >= 4 ? '#4CAF50' : item.star === 3 ? '#FFC107' : '#D32F2F'
                                            }
                                        }} 
                                    />
                                </Box>
                                <Typography variant="body2" sx={{ minWidth: 30, textAlign: 'right', color: 'text.secondary' }}>
                                    {item.count}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Paper>
            </Grid>
        </Grid>

        {/* --- Review Cards --- */}
        <Grid container spacing={2}>
            {filteredReviews.map((item) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={item.id}>
                    <Card sx={{ 
                        height: '100%', 
                        borderRadius: 3, 
                        boxShadow: 2,
                        transition: '0.3s',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
                    }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Avatar sx={{ bgcolor: item.rating >= 4 ? '#E8F5E9' : item.rating > 0 ? '#FFEBEE' : '#F5F5F5', color: item.rating >= 4 ? '#2E7D32' : item.rating > 0 ? '#C62828' : '#9E9E9E' }}>
                                        {item.rating >= 4 ? <SentimentVerySatisfied /> : item.rating === 3 ? <SentimentSatisfiedAlt /> : item.rating > 0 ? <SentimentVeryDissatisfied /> : <EventNote />}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight="bold">{item.customer_name}</Typography>
                                        <Rating value={item.rating} size="small" readOnly />
                                    </Box>
                                </Stack>
                                <Chip label={formatDate(item.updated_at)} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                            </Stack>

                            <Box sx={{ bgcolor: '#F8FAFC', p: 2, borderRadius: 2, mb: 2, minHeight: 80 }}>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#334155' }}>
                                    "{item.feedback_comment || '-'}"
                                </Typography>
                            </Box>

                            <Divider sx={{ mb: 1 }} />

                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block">งาน:</Typography>
                                    <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 160 }}>{item.title}</Typography>
                                </Box>
                                {/* แสดงชื่อแผนก */}
                                <Chip label={item.department} size="small" color="default" sx={{ height: 20, fontSize: '0.65rem', maxWidth: 120 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
        
        {filteredReviews.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 10, color: '#94A3B8' }}>
                <EventNote sx={{ fontSize: 60, opacity: 0.5, mb: 2 }} />
                <Typography>ไม่พบข้อมูลการประเมิน</Typography>
            </Box>
        )}

      </Container>
    </Layout>
  );
}