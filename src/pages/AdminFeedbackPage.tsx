import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Container, Paper, Chip, 
  Rating, LinearProgress, Stack, Avatar, Card, CardContent, 
  FormControl, InputLabel, Select, MenuItem,
  ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow,
  Grid // ✅ ใช้ Grid แบบ MUI v6
} from '@mui/material';
import { 
  Star, EventNote, FilterList, Person,
  BarChart as BarChartIcon, TableChart as TableChartIcon 
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { supabase } from '../supabaseClient'; 

export default function AdminFeedbackPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [users, setUsers] = useState<any[]>([]); 
  const [currentTab, setCurrentTab] = useState(0); 
  
  const [filterDept, setFilterDept] = useState<any>('ALL');
  const [filterStar, setFilterStar] = useState<any>('ALL'); 
  const [selectedUser, setSelectedUser] = useState<string>('ALL'); 

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        // 1. ดึงแผนก
        const { data: deptData } = await supabase.from('Departments').select('*');
        if (deptData) {
            const onlyRobot = deptData.filter(d => d.name.includes('หุ่นยนต์'));
            setDepartments(onlyRobot);
        } else {
            setDepartments([]);
        }

        // 2. ดึงรายชื่อพนักงาน (ไม่เอา Admin)
        const { data: userData } = await supabase
            .from('Profiles')
            .select('*')
            .eq('approval_status', 'APPROVED')
            .neq('role', 'ADMIN');
            
        setUsers(userData || []);

        // 3. ดึง Feedback
        const { data: fbData, error } = await supabase
            .from('JobFeedbacks')
            .select(`
                *, 
                Jobs (
                    title, 
                    department_ids, 
                    customer_name,
                    JobAssignments ( user_id ) 
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 4. แปลงข้อมูล
        if (fbData) {
            const formattedData = fbData.map((fb: any) => {
                const deptId = fb.Jobs?.department_ids?.[0] || 0;
                const deptName = deptData?.find(d => d.id === deptId)?.name || 'ไม่ระบุฝ่าย';
                const assignees = fb.Jobs?.JobAssignments?.map((a: any) => a.user_id) || [];

                return {
                    id: fb.id,
                    title: fb.Jobs?.title || 'ไม่ระบุงาน',
                    customer_name: fb.Jobs?.customer_name || 'ลูกค้าทั่วไป',
                    rating: fb.overall_satisfaction || 0, 
                    feedback_comment: fb.suggestion, 
                    updated_at: fb.created_at,
                    department: deptName,      
                    department_id: deptId,
                    assigned_to: assignees,
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

  // --- Logic 1: กรอง User ตามแผนก ---
  const filteredUsers = users.filter(user => {
      if (filterDept === 'ALL') return true;
      return user.department_id === filterDept;
  });

  // --- Logic 2: กรอง Reviews (สำหรับหน้าภาพรวม) ---
  const filteredReviews = reviews.filter((review) => {
      // กรองแผนก
      if (filterDept !== 'ALL') {
          const deptIds = review.department_id ? [review.department_id] : [];
          if (!deptIds.includes(filterDept)) return false;
      }
      // กรองดาว
      if (filterStar !== 'ALL') {
          if (Math.round(review.rating) !== Number(filterStar)) return false;
      }
      // กรองพนักงาน
      if (selectedUser !== 'ALL') {
          const assignments = review.assigned_to || [];
          if (!assignments.includes(selectedUser)) return false;
      }
      return true;
  });

  const totalRating = filteredReviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = filteredReviews.length > 0 ? (totalRating / filteredReviews.length).toFixed(1) : "0.0";
  
  const starCounts = [0, 0, 0, 0, 0];
  filteredReviews.forEach(r => {
      const starIndex = Math.round(r.rating) - 1;
      if (starIndex >= 0 && starIndex < 5) starCounts[starIndex]++;
  });

  // --- Logic 3: คำนวณคะแนนรายบุคคล ---
  const calculateStaffPerformance = () => {
    const staffStats: any = {};
    
    // เตรียมข้อมูล User
    users.forEach(user => {
        if (filterDept !== 'ALL' && user.department_id !== filterDept) return;
        staffStats[user.user_id] = {
            id: user.user_id,
            name: `${user.first_name} (${user.nickname})`,
            jobCount: 0,
            totalScore: 0,
            average: "0.00"
        };
    });

    // หยอดคะแนน
    reviews.forEach(review => {
        // กรองเฉพาะแผนก (แต่ไม่กรองดาว เพื่อให้ได้ค่าเฉลี่ยรวมทั้งหมดจริงๆ)
        if (filterDept !== 'ALL' && review.department_id !== filterDept) return;
        
        // ✅ ตัดการกรอง filterStar ออก เพื่อให้คิดคะแนนจากทุกงาน
        
        const assignees = review.assigned_to || []; 
        const score = review.rating || 0;
        assignees.forEach((userId: string) => {
            if (staffStats[userId]) {
                staffStats[userId].jobCount += 1;
                staffStats[userId].totalScore += score;
            }
        });
    });

    return Object.values(staffStats)
        .map((staff: any) => ({
            ...staff,
            average: staff.jobCount > 0 ? (staff.totalScore / staff.jobCount).toFixed(2) : "0.00"
        }))
        // เรียงตามเกรดเฉลี่ย จากมากไปน้อย
        .sort((a: any, b: any) => b.average - a.average);
  };

  const staffPerformanceData = calculateStaffPerformance();

  return (
    <Layout title="ผลประเมิน">
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        
        {/* Header & Tabs */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
            <Typography variant="h4" fontWeight="bold">
                ผลการประเมินคุณภาพ
            </Typography>
            
            <ToggleButtonGroup
                color="primary"
                value={currentTab}
                exclusive
                onChange={(e, val) => val !== null && setCurrentTab(val)}
                size="small"
            >
                <ToggleButton value={0}>ภาพรวม</ToggleButton>
                <ToggleButton value={1}>รายบุคคล</ToggleButton>
            </ToggleButtonGroup>
        </Stack>

        {/* Filter Bar */}
        <Paper sx={{ p: 2, mb: 4, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FilterList color="action" />
            <Typography variant="subtitle2">ตัวกรอง:</Typography>
            
            {/* 1. เลือกแผนก (แสดงตลอด) */}
            <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white', borderRadius: 1 }}>
                <InputLabel>เลือกแผนก</InputLabel>
                <Select value={filterDept} label="เลือกแผนก" onChange={(e) => { setFilterDept(e.target.value); setSelectedUser('ALL'); }}>
                    <MenuItem value="ALL">ทุกแผนก</MenuItem>
                    {departments.map((dept) => <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>)}
                </Select>
            </FormControl>

            {/* 2. ✅ เลือกจำนวนดาว (แสดงเฉพาะ Tab 0: ภาพรวม) */}
            {currentTab === 0 && (
                <FormControl size="small" sx={{ minWidth: 150, bgcolor: 'white', borderRadius: 1 }}>
                    <InputLabel>คะแนนดาว</InputLabel>
                    <Select value={filterStar} label="คะแนนดาว" onChange={(e) => setFilterStar(e.target.value)}>
                        <MenuItem value="ALL">ทั้งหมด</MenuItem>
                        <MenuItem value={5}>5 ดาว (ดีเยี่ยม)</MenuItem>
                        <MenuItem value={4}>4 ดาว (ดี)</MenuItem>
                        <MenuItem value={3}>3 ดาว (ปานกลาง)</MenuItem>
                        <MenuItem value={2}>2 ดาว (พอใช้)</MenuItem>
                        <MenuItem value={1}>1 ดาว (ปรับปรุง)</MenuItem>
                    </Select>
                </FormControl>
            )}

            {/* 3. เลือกพนักงาน (แสดงเฉพาะ Tab 0: ภาพรวม) */}
            {currentTab === 0 && (
                <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white', borderRadius: 1 }}>
                    <InputLabel>เลือกพนักงาน</InputLabel>
                    <Select value={selectedUser} label="เลือกพนักงาน" onChange={(e) => setSelectedUser(e.target.value)}>
                        <MenuItem value="ALL">-- พนักงานทั้งหมด --</MenuItem>
                        {filteredUsers.map((user) => (
                            <MenuItem key={user.user_id} value={user.user_id}>{user.first_name} ({user.nickname})</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}
            
            {/* View Mode Toggle (เฉพาะ Tab 0) */}
            {currentTab === 0 && (
                <Box sx={{ ml: 'auto' }}>
                    <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)}>
                        <ToggleButton value="chart"><BarChartIcon /></ToggleButton>
                        <ToggleButton value="table"><TableChartIcon /></ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            )}
        </Paper>

        {/* ================= TAB 0: ภาพรวม ================= */}
        {currentTab === 0 && (
            <>
                {viewMode === 'chart' ? (
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Paper sx={{ p: 4, textAlign: 'center', height: '100%', borderRadius: 3, bgcolor: '#FFF8E1' }}>
                                <Typography variant="h6" color="text.secondary" gutterBottom>คะแนนเฉลี่ยรวม</Typography>
                                <Typography variant="h2" fontWeight="bold" color="primary">{avgRating}</Typography>
                                <Rating value={parseFloat(avgRating)} precision={0.1} readOnly size="large" sx={{ my: 2 }} />
                                <Typography variant="body2" color="text.secondary">จากทั้งหมด {filteredReviews.length} การประเมิน</Typography>
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, md: 8 }}>
                            <Paper sx={{ p: 3, height: '100%', borderRadius: 3 }}>
                                <Typography variant="h6" gutterBottom>สัดส่วนคะแนน (ดาว)</Typography>
                                <Stack spacing={1.5}>
                                    {[5, 4, 3, 2, 1].map((star) => {
                                        const count = starCounts[star - 1];
                                        const percent = filteredReviews.length > 0 ? (count / filteredReviews.length) * 100 : 0;
                                        return (
                                            <Stack key={star} direction="row" alignItems="center" spacing={2}>
                                                <Typography sx={{ minWidth: 20 }}>{star}★</Typography>
                                                <LinearProgress variant="determinate" value={percent} sx={{ flexGrow: 1, height: 10, borderRadius: 5 }} color={star >= 4 ? "success" : star === 3 ? "warning" : "error"} />
                                                <Typography variant="body2" sx={{ minWidth: 30, textAlign: 'right' }}>{count}</Typography>
                                            </Stack>
                                        );
                                    })}
                                </Stack>
                            </Paper>
                        </Grid>
                        
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>ข้อเสนอแนะล่าสุด</Typography>
                            <Grid container spacing={2}>
                                {filteredReviews.slice(0, 6).map((review) => (
                                    <Grid size={{ xs: 12, md: 6 }} key={review.id}>
                                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                            <CardContent>
                                                <Stack direction="row" justifyContent="space-between" mb={1}>
                                                    <Chip label={review.department} size="small" color="primary" variant="outlined" />
                                                    <Rating value={review.rating} readOnly size="small" />
                                                </Stack>
                                                <Typography variant="subtitle1" fontWeight="bold">{review.title}</Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                                                    "{review.feedback_comment || 'ไม่มีข้อเสนอแนะเพิ่มเติม'}"
                                                </Typography>
                                                <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'right', color: '#999' }}>
                                                    โดย {review.customer_name} • {new Date(review.updated_at).toLocaleDateString('th-TH')}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Grid>
                    </Grid>
                ) : (
                    <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: '#424242' }}>
                                <TableRow>
                                    <TableCell sx={{ color: 'white' }}>วันที่</TableCell>
                                    <TableCell sx={{ color: 'white' }}>งาน / ฝ่าย</TableCell>
                                    <TableCell sx={{ color: 'white' }}>ลูกค้า</TableCell>
                                    <TableCell sx={{ color: 'white' }}>คะแนน</TableCell>
                                    <TableCell sx={{ color: 'white' }}>ข้อเสนอแนะ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredReviews.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((review) => (
                                    <TableRow key={review.id} hover>
                                        <TableCell>{new Date(review.updated_at).toLocaleDateString('th-TH')}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">{review.title}</Typography>
                                            <Chip label={review.department} size="small" sx={{ mt: 0.5, fontSize: 10 }} />
                                        </TableCell>
                                        <TableCell>{review.customer_name}</TableCell>
                                        <TableCell><Rating value={review.rating} readOnly size="small" /></TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                                {review.feedback_comment || '-'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredReviews.length === 0 && (
                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>ไม่พบข้อมูล</TableCell></TableRow>
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
            
                {filteredReviews.length === 0 && viewMode === 'chart' && (
                    <Box sx={{ textAlign: 'center', py: 10, color: '#94A3B8' }}>
                        <EventNote sx={{ fontSize: 60, opacity: 0.5, mb: 2 }} />
                        <Typography>ไม่พบข้อมูลการประเมิน</Typography>
                    </Box>
                )}
            </>
        )}

        {/* ================= TAB 1: รายบุคคล ================= */}
        {currentTab === 1 && (
            <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                     ประสิทธิภาพรายบุคคล {filterDept !== 'ALL' && `(เฉพาะ ${departments.find(d => d.id === filterDept)?.name})`}
                </Typography>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell>พนักงาน</TableCell>
                                <TableCell align="center">จำนวนงานที่ประเมิน</TableCell>
                                <TableCell align="center">คะแนนเฉลี่ย</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {staffPerformanceData.map((staff: any) => (
                                <TableRow key={staff.id} hover>
                                    <TableCell>
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Avatar sx={{ bgcolor: '#1976D2', width: 35, height: 35, fontSize: 16 }}>
                                                <Person fontSize="small" />
                                            </Avatar>
                                            <Typography fontWeight="bold">{staff.name}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip label={`${staff.jobCount} งาน`} size="small" />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                                            <Star sx={{ color: '#FAAF00', fontSize: 20 }} />
                                            <Typography fontWeight="bold" color="primary" fontSize="1.1rem">{staff.average}</Typography>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {staffPerformanceData.length === 0 && (
                                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>ไม่พบข้อมูลพนักงาน (ตามเงื่อนไขที่เลือก)</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        )}

      </Container>
    </Layout>
  );
}