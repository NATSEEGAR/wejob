import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, TextField, Button, Link, Stack, MenuItem, Select, FormControl, InputLabel, InputAdornment, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Badge as BadgeIcon, Phone as PhoneIcon, Person as PersonIcon, Lock as LockIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { showError, showSuccess } from '../utils/alertUtils';

function SignUpPage() {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState<any[]>([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nickname, setNickname] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        const fetchDepts = async () => {
            const { data } = await supabase.from('Departments').select('*').order('id');
            setDepartments(data || []);
        };
        fetchDepts();
    }, []);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) { showError("รหัสผ่านไม่ตรงกัน", "กรุณากรอกใหม่"); return; }
        if (!username || !password || !firstName || !lastName || !departmentId || !employeeId || !phoneNumber) { showError("ข้อมูลไม่ครบ", "กรุณากรอกให้ครบ"); return; }

        try {
            setLoading(true);
            const { data: duplicateMsg, error: rpcError } = await supabase.rpc('check_duplicate_register', { p_username: username, p_employee_id: employeeId, p_phone: phoneNumber });
            if (rpcError) throw rpcError;
            if (duplicateMsg) { showError("ข้อมูลซ้ำ", duplicateMsg); setLoading(false); return; }

            const fakeEmail = `${username}@example.com`;
            const { data: authData, error: authError } = await supabase.auth.signUp({ email: fakeEmail, password: password });
            if (authError) { if (authError.message.includes("already registered")) throw new Error("Username นี้มีผู้ใช้แล้ว"); throw authError; }
            if (!authData.user) throw new Error("สร้างผู้ใช้ไม่ได้");

            const { error: profileError } = await supabase.from('Profiles').insert([{
                user_id: authData.user.id, username, first_name: firstName, last_name: lastName, nickname,
                department_id: parseInt(departmentId), employee_id: employeeId, phone_number: phoneNumber,
                role: 'STAFF', is_head: false, approval_status: 'PENDING'
            }]);
            if (profileError) throw profileError;

            showSuccess("ลงทะเบียนสำเร็จ!", "รอแอดมินอนุมัติ");
            navigate('/');
        } catch (error: any) { showError("เกิดข้อผิดพลาด", error.message); } finally { setLoading(false); }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#D32F2F' }}>ลงทะเบียนพนักงานใหม่</Typography>
                <Box component="form" onSubmit={handleSignUp} noValidate sx={{ width: '100%' }}>
                    <Stack spacing={2}>
                        <TextField required fullWidth label="Username" value={username} onChange={(e) => setUsername(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon color="action" /></InputAdornment> }} />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField required fullWidth label="รหัสผ่าน" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon color="action" /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
                            <TextField required fullWidth label="ยืนยันรหัสผ่าน" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">{showConfirmPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField required fullWidth label="รหัสพนักงาน" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon color="action" /></InputAdornment> }} />
                            <TextField required fullWidth label="เบอร์โทรศัพท์" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon color="action" /></InputAdornment> }} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField required fullWidth label="ชื่อจริง" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                            <TextField required fullWidth label="นามสกุล" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField fullWidth label="ชื่อเล่น" value={nickname} onChange={(e) => setNickname(e.target.value)} />
                            <FormControl fullWidth required>
                                <InputLabel id="dept-label">สังกัดฝ่าย</InputLabel>
                                <Select labelId="dept-label" value={departmentId} label="สังกัดฝ่าย" onChange={(e) => setDepartmentId(e.target.value)}>
                                    {departments.map((dept) => <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Box>
                    </Stack>
                    <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 4, mb: 2, bgcolor: '#D32F2F' }}>{loading ? "กำลังบันทึก..." : "ลงทะเบียน"}</Button>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}><Link href="/" variant="body2" underline="hover">มีบัญชีแล้ว? กลับไปหน้าเข้าสู่ระบบ</Link></Box>
                </Box>
            </Box>
        </Container>
    );
}
export default SignUpPage;