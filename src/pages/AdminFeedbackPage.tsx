import React, { useEffect, useState } from 'react';
import { 
  Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Box, Rating, Stack, Chip, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { supabase } from '../supabaseClient';
import Layout from '../components/Layout';
import { Star } from '@mui/icons-material';

function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState(0);

  useEffect(() => {
    const init = async () => {
        const { data } = await supabase.from('Departments').select('*');
        setDepartments(data || []);
        const { data: fbData } = await supabase.from('JobFeedbacks').select('*, Jobs(title, department_ids, customer_name)').order('created_at', { ascending: false });
        setFeedbacks(fbData || []);
    };
    init();
  }, []);

  const filteredFeedbacks = feedbacks.filter(f => {
      if (filterDept === 0) return true;
      return f.Jobs?.department_ids?.includes(filterDept);
  });

  const averageScore = filteredFeedbacks.length > 0 
      ? (filteredFeedbacks.reduce((acc, curr) => acc + curr.overall_satisfaction, 0) / filteredFeedbacks.length).toFixed(1)
      : "0.0";

  return (
    <Layout title="สรุปความพึงพอใจลูกค้า">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
              <Typography variant="h4">Customer Feedback</Typography>
              <Typography variant="subtitle1" color="text.secondary">คะแนนความพึงพอใจจากลูกค้า</Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white' }}>
              <InputLabel>กรองตามฝ่าย</InputLabel>
              <Select value={filterDept} label="กรองตามฝ่าย" onChange={(e) => setFilterDept(Number(e.target.value))}>
                  <MenuItem value={0}>-- ทุกฝ่าย --</MenuItem>
                  {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
          </FormControl>
      </Stack>

      <Paper sx={{ p: 3, mb: 4, bgcolor: '#E3F2FD', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Typography variant="h3" fontWeight="bold" color="primary">{averageScore}</Typography>
          <Box>
              <Rating value={Number(averageScore)} readOnly precision={0.1} size="large" />
              <Typography variant="body2">จากทั้งหมด {filteredFeedbacks.length} งาน</Typography>
          </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
              <TableHead sx={{ bgcolor: '#424242' }}>
                  <TableRow>
                      <TableCell sx={{ color: 'white' }}>วันที่</TableCell>
                      <TableCell sx={{ color: 'white' }}>ชื่องาน / ลูกค้า</TableCell>
                      <TableCell sx={{ color: 'white' }}>บริการ</TableCell>
                      <TableCell sx={{ color: 'white' }}>จนท.</TableCell>
                      <TableCell sx={{ color: 'white' }}>ภาพรวม</TableCell>
                      <TableCell sx={{ color: 'white' }}>ข้อเสนอแนะ</TableCell>
                  </TableRow>
              </TableHead>
              <TableBody>
                  {filteredFeedbacks.map((f) => (
                      <TableRow key={f.id} hover>
                          <TableCell>{new Date(f.created_at).toLocaleDateString('th-TH')}</TableCell>
                          <TableCell>
                              <Typography fontWeight={600}>{f.Jobs?.title}</Typography>
                              <Typography variant="caption" color="text.secondary">{f.Jobs?.customer_name}</Typography>
                          </TableCell>
                          <TableCell><Rating value={(f.contact_convenience + f.service_speed + f.repair_time + f.repair_quality)/4} readOnly size="small" precision={0.5} /></TableCell>
                          <TableCell><Rating value={(f.politeness + f.expertise)/2} readOnly size="small" precision={0.5} /></TableCell>
                          <TableCell>
                              <Chip icon={<Star sx={{ fontSize: 16 }} />} label={f.overall_satisfaction} color={f.overall_satisfaction >= 4 ? "success" : f.overall_satisfaction >= 3 ? "warning" : "error"} size="small" />
                          </TableCell>
                          <TableCell>{f.suggestion || "-"}</TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
      </TableContainer>
    </Layout>
  );
}
export default AdminFeedbackPage;