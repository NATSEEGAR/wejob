import React, { useEffect, useState } from 'react';
import { 
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Box, Rating, Stack, Chip, Select, MenuItem, FormControl, InputLabel, Tooltip
} from '@mui/material';
import { supabase } from '../supabaseClient';
import Layout from '../components/Layout';
import { Star, Info } from '@mui/icons-material';

function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState(0);

  useEffect(() => {
    const init = async () => {
        const { data } = await supabase.from('Departments').select('*');
        setDepartments(data || []);
        
        // ดึง Feedback ทั้งหมด และ Join กับตาราง Jobs เพื่อเอาชื่อและฝ่าย
        const { data: fbData } = await supabase
            .from('JobFeedbacks')
            .select('*, Jobs(title, department_ids, customer_name)')
            .order('created_at', { ascending: false });
        setFeedbacks(fbData || []);
    };
    init();
  }, []);

  const filteredFeedbacks = feedbacks.filter(f => {
      if (filterDept === 0) return true;
      // เช็คว่า department_ids ของงานนั้น มีฝ่ายที่เราเลือกอยู่ไหม
      return f.Jobs?.department_ids?.includes(filterDept);
  });

  // ฟังก์ชันช่วยแสดงคะแนนเป็นดาวขนาดเล็ก
  const ScoreCell = ({ value }: { value: number }) => (
    <Box display="flex" flexDirection="column" alignItems="center">
       <Rating value={value} readOnly size="small" sx={{ fontSize: '1rem' }} />
       <Typography variant="caption" color="text.secondary">({value})</Typography>
    </Box>
  );

  return (
    <Layout title="รายงานการประเมิน (Feedback)">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4">ผลการประเมินความพึงพอใจ</Typography>
            <Typography variant="body2" color="text.secondary">คะแนนประเมินจากลูกค้าเมื่องานเสร็จสิ้น</Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white' }}>
              <InputLabel>กรองตามฝ่าย</InputLabel>
              <Select value={filterDept} label="กรองตามฝ่าย" onChange={(e) => setFilterDept(Number(e.target.value))}>
                  <MenuItem value={0}>-- ดูทั้งหมด --</MenuItem>
                  {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
          </FormControl>
      </Stack>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
          <Table size="small">
              <TableHead sx={{ bgcolor: '#424242' }}>
                  <TableRow>
                      <TableCell sx={{ color: 'white' }}>วันที่</TableCell>
                      <TableCell sx={{ color: 'white', minWidth: 150 }}>งาน / ลูกค้า</TableCell>
                      
                      {/* --- หัวข้อการประเมินใหม่ 6 ข้อ --- */}
                      <TableCell align="center" sx={{ color: 'white' }}>
                          <Tooltip title="ความสุภาพของพนักงาน"><Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center"><Typography variant="caption">สุภาพ</Typography><Info fontSize="inherit" /></Stack></Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ color: 'white' }}>
                          <Tooltip title="ความรวดเร็วในการให้บริการ"><Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center"><Typography variant="caption">รวดเร็ว</Typography><Info fontSize="inherit" /></Stack></Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ color: 'white' }}>
                          <Tooltip title="ความเรียบร้อยของงาน"><Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center"><Typography variant="caption">เรียบร้อย</Typography><Info fontSize="inherit" /></Stack></Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ color: 'white' }}>
                          <Tooltip title="ความสะอาดหลังจบงาน"><Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center"><Typography variant="caption">สะอาด</Typography><Info fontSize="inherit" /></Stack></Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ color: 'white' }}>
                          <Tooltip title="ความตรงต่อเวลา"><Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center"><Typography variant="caption">ตรงเวลา</Typography><Info fontSize="inherit" /></Stack></Tooltip>
                      </TableCell>
                      
                      <TableCell align="center" sx={{ color: 'white', bgcolor: '#616161' }}>
                          <Typography variant="caption" fontWeight="bold">ภาพรวม</Typography>
                      </TableCell>
                      
                      <TableCell sx={{ color: 'white' }}>ข้อเสนอแนะ</TableCell>
                  </TableRow>
              </TableHead>
              <TableBody>
                  {filteredFeedbacks.map((f) => (
                      <TableRow key={f.id} hover>
                          <TableCell sx={{ verticalAlign: 'top' }}>{new Date(f.created_at).toLocaleDateString('th-TH')}</TableCell>
                          <TableCell sx={{ verticalAlign: 'top' }}>
                              <Typography variant="body2" fontWeight={600}>{f.Jobs?.title}</Typography>
                              <Typography variant="caption" color="text.secondary">{f.Jobs?.customer_name}</Typography>
                          </TableCell>
                          
                          {/* --- คะแนนตามหัวข้อที่ Map ไว้ --- */}
                          <TableCell align="center"><ScoreCell value={f.politeness} /></TableCell>
                          <TableCell align="center"><ScoreCell value={f.service_speed} /></TableCell>
                          <TableCell align="center"><ScoreCell value={f.repair_quality} /></TableCell>
                          <TableCell align="center"><ScoreCell value={f.testing_check} /></TableCell>       {/* สะอาด */}
                          <TableCell align="center"><ScoreCell value={f.contact_convenience} /></TableCell> {/* ตรงเวลา */}
                          
                          <TableCell align="center" sx={{ bgcolor: '#fafafa' }}>
                              <Chip 
                                icon={<Star sx={{ fontSize: 16 }} />} 
                                label={f.overall_satisfaction} 
                                color={f.overall_satisfaction >= 4 ? "success" : f.overall_satisfaction >= 3 ? "warning" : "error"} 
                                size="small" 
                                variant="outlined"
                              />
                          </TableCell>
                          
                          <TableCell sx={{ maxWidth: 200 }}>
                              {f.suggestion ? <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>"{f.suggestion}"</Typography> : <Typography variant="caption" color="text.secondary">-</Typography>}
                          </TableCell>
                      </TableRow>
                  ))}
                  {filteredFeedbacks.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>ยังไม่มีข้อมูลการประเมิน</TableCell></TableRow>}
              </TableBody>
          </Table>
      </TableContainer>
    </Layout>
  );
}
export default AdminFeedbackPage;