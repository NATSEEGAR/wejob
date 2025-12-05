import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Container, Grid, Paper, Chip, 
  Rating, LinearProgress, Stack, Avatar, Card, CardContent, 
  Divider, Button, FormControl, InputLabel, Select, MenuItem,
  ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow
} from '@mui/material';
import { 
  Star, SentimentVeryDissatisfied, SentimentSatisfiedAlt, SentimentVerySatisfied, 
  EventNote, FilterList, BarChart as BarChartIcon, TableChart as TableChartIcon 
} from '@mui/icons-material';
import Layout from '../components/Layout';
// Import Supabase
import { supabase } from '../supabaseClient'; 

export default function AdminFeedbackPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]); 
  
  // State สำหรับตัวกรองและมุมมอง
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [page, setPage] = useState(0); 
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
      setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
  };
  const [filterRate, setFilterRate] = useState<number | 'ALL'>('ALL');
  const [filterDept, setFilterDept] = useState<number>(0); 
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        // 1. ดึงรายชื่อแผนก
        const { data: deptData } = await supabase.from('Departments').select('*');
        
        // 🤖 Pilot Test: กรองเอาเฉพาะ "ฝ่ายหุ่นยนต์" เท่านั้น
        if (deptData) {
            const onlyRobot = deptData.filter(d => d.name.includes('หุ่นยนต์'));
            setDepartments(onlyRobot);
        } else {
            setDepartments([]);
        }

        // 2. ดึง Feedback และ Join กับ Jobs
        const { data: fbData, error } = await supabase
            .from('JobFeedbacks')
            .select('*, Jobs(title, department_ids, customer_name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 3. แปลงข้อมูล
        if (fbData) {
            const formattedData = fbData.map((fb: any) => {
                const deptId = fb.Jobs?.department_ids?.[0] || 0;
                // ใช้ deptData ตัวเต็มในการหาชื่อ (เผื่อมีข้อมูลเก่าที่ไม่ได้อยู่ในฝ่ายหุ่นยนต์)
                const deptName = deptData?.find(d => d.id === deptId)?.name || 'ไม่ระบุฝ่าย';

                return {
                    id: fb.id,
                    title: fb.Jobs?.title || 'ไม่ระบุงาน',
                    customer_name: fb.Jobs?.customer_name || 'ลูกค้าทั่วไป',
                    rating: fb.overall_satisfaction || 0, 
                    feedback_comment: fb.suggestion, 
                    updated_at: fb.created_at,
                    department: deptName,      
                    department_id: deptId,     
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
    const matchRate = filterRate === 'ALL' || job.rating === filterRate;
    const matchDept = filterDept !== 0 ? job.department_id === filterDept : true;
    return matchRate && matchDept;
  });

  // --- คำนวณ KPI (สำหรับหน้า Chart) ---
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

  const currentDeptName = departments.find(d => d.id === filterDept)?.name || 'ทั้งหมด';

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', sm: 'center' }} mb={3} spacing={2}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1E293B' }}>
                    สรุปความพึงพอใจ
                </Typography>
                {filterDept !== 0 && (
                    <Chip label={`ฝ่าย: ${currentDeptName}`} color="primary" onDelete={() => setFilterDept(0)} />
                )}
            </Stack>

            {/* ✅ ปุ่มสลับมุมมอง (Chart / Table) */}
            <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, v) => v && setViewMode(v)}
                size="small"
                sx={{ bgcolor: 'white' }}
            >
                <ToggleButton value="chart" aria-label="chart view">
                    <BarChartIcon sx={{ mr: 1 }} /> กราฟ
                </ToggleButton>
                <ToggleButton value="table" aria-label="table view">
                    <TableChartIcon sx={{ mr: 1 }} /> ตาราง
                </ToggleButton>
            </ToggleButtonGroup>
        </Stack>

        {/* --- Filter Bar --- */}
        <Paper sx={{ p: 2, mb: 4, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', color: '#64748B' }}>
                <FilterList sx={{ mr: 1 }} />
                <Typography fontWeight="bold">ตัวกรอง:</Typography>
            </Box>

            {/* Dropdown เลือกฝ่าย */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
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

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

            {/* ✅ Dropdown เลือกดาว */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>คะแนนดาว</InputLabel>
                <Select
                    value={filterRate}
                    label="คะแนนดาว"
                    onChange={(e) => setFilterRate(e.target.value as number | 'ALL')}
                >
                    <MenuItem value="ALL">ทุกเรตติ้ง (1-5 ดาว)</MenuItem>
                    <MenuItem value={5}>⭐⭐⭐⭐⭐ (5 ดาว)</MenuItem>
                    <MenuItem value={4}>⭐⭐⭐⭐ (4 ดาว)</MenuItem>
                    <MenuItem value={3}>⭐⭐⭐ (3 ดาว)</MenuItem>
                    <MenuItem value={2}>⭐⭐ (2 ดาว)</MenuItem>
                    <MenuItem value={1}>⭐ (1 ดาว)</MenuItem>
                </Select>
            </FormControl>
        </Paper>

        {/* --- เนื้อหาตาม ViewMode --- */}
        {viewMode === 'chart' ? (
            <>
                {/* --- 1. มุมมองกราฟ (Dashboard KPI) --- */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4, height: '100%', bgcolor: '#fff', boxShadow: 3 }}>
                            <Typography variant="h6" color="text.secondary" gutterBottom>คะแนนเฉลี่ย</Typography>
                            <Typography variant="h1" fontWeight="bold" sx={{ color: '#D32F2F' }}>
                                {averageRating}
                            </Typography>
                            <Rating value={parseFloat(averageRating)} precision={0.1} readOnly size="large" sx={{ my: 1, fontSize: '2.5rem' }} />
                            <Typography variant="body1" color="text.secondary">
                                จาก {totalReviews} งาน
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
                                        <Chip label={item.department} size="small" color="default" sx={{ height: 20, fontSize: '0.65rem', maxWidth: 120 }} />
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </>
        ) : (
            // --- 2. มุมมองตาราง (Table View) ---
            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                        <TableRow>
                            <TableCell>วันที่</TableCell>
                            <TableCell>งาน</TableCell>
                            <TableCell>ลูกค้า</TableCell>
                            <TableCell>คะแนน</TableCell>
                            <TableCell>ข้อเสนอแนะ</TableCell>
                            <TableCell>ฝ่าย</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredReviews
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((item) => (
                            <TableRow key={item.id} hover>
                                <TableCell>{formatDate(item.updated_at)}</TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">{item.title}</Typography>
                                </TableCell>
                                <TableCell>{item.customer_name}</TableCell>
                                <TableCell>
                                    <Rating value={item.rating} size="small" readOnly />
                                </TableCell>
                                <TableCell sx={{ maxWidth: 300 }}>
                                    <Typography variant="body2" noWrap title={item.feedback_comment}>
                                        {item.feedback_comment || '-'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip label={item.department} size="small" />
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredReviews.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                    ไม่พบข้อมูลการประเมิน
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            
         )}
        <TablePagination
                    component="div"
                    count={filteredReviews.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25]}
                    labelRowsPerPage="แสดงหน้าละ:"
                    sx={{ bgcolor: 'white', borderRadius: 2, boxShadow: 1 }}
                />
            
        {/* แสดงเมื่อไม่มีข้อมูลในโหมด Chart (ในโหมด Table มี Row ว่างให้แล้ว) */}
        {filteredReviews.length === 0 && viewMode === 'chart' && (
            <Box sx={{ textAlign: 'center', py: 10, color: '#94A3B8' }}>
                <EventNote sx={{ fontSize: 60, opacity: 0.5, mb: 2 }} />
                <Typography>ไม่พบข้อมูลการประเมิน</Typography>
            </Box>
        )}

      </Container>
    </Layout>
  );
}