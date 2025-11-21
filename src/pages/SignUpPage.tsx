import React, { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Link, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Badge as BadgeIcon, Phone as PhoneIcon } from '@mui/icons-material';
import { showError, showSuccess } from '../utils/alertUtils'; // ใช้ Alert สวยๆ

function SignUpPage() {
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nickname, setNickname] = useState('');
    const [department, setDepartment] = useState('');
    
    const [employeeId, setEmployeeId] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    
    const [loading, setLoading] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            showError("รหัสผ่านไม่ตรงกัน", "กรุณากรอกรหัสผ่านยืนยันใหม่อีกครั้ง");
            return;
        }

        if (!username || !password || !firstName || !lastName || !department || !employeeId || !phoneNumber) {
            showError("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง");
            return;
        }

        try {
            setLoading(true);

            // --- 🛑 1. เรียกฟังก์ชันตรวจสอบข้อมูลซ้ำ (จาก SQL ที่เราเพิ่งสร้าง) ---
            const { data: duplicateMsg, error: rpcError } = await supabase.rpc('check_duplicate_register', {
                p_username: username,
                p_employee_id: employeeId,
                p_phone: phoneNumber
            });

            if (rpcError) throw rpcError;

            // ถ้ามีข้อความกลับมา แปลว่ามีข้อมูลซ้ำ -> แจ้งเตือนและหยุดทันที
            if (duplicateMsg) {
                showError("ข้อมูลซ้ำ", duplicateMsg); // เช่น "รหัสพนักงานนี้มีอยู่ในระบบแล้ว"
                setLoading(false);
                return;
            }
            // ----------------------------------------------------------

            const fakeEmail = `${username}@example.com`;

            // 2. สร้าง User ในระบบ Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: fakeEmail,
                password: password,
            });

            if (authError) {
                // ดักจับกรณีอีเมลซ้ำ (เผื่อฟังก์ชันแรกหลุด)
                if (authError.message.includes("already registered")) {
                    throw new Error("Username นี้มีผู้ใช้งานแล้ว");
                }
                throw authError;
            }
            
            if (!authData.user) throw new Error("ไม่สามารถสร้างผู้ใช้ได้");

            // 3. บันทึกข้อมูลลงตาราง Profiles
            const { error: profileError } = await supabase.from('Profiles').insert([
                {
                    user_id: authData.user.id,
                    username: username,
                    first_name: firstName,
                    last_name: lastName,
                    nickname: nickname,
                    department: department,
                    employee_id: employeeId,
                    phone_number: phoneNumber,
                    role: 'STAFF',
                    approval_status: 'PENDING'
                }
            ]);

            if (profileError) throw profileError;

            showSuccess("ลงทะเบียนสำเร็จ!", "กรุณารอแอดมินอนุมัติก่อนเข้าใช้งาน");
            navigate('/');

        } catch (error: any) {
            console.error(error);
            showError("เกิดข้อผิดพลาด", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#D32F2F' }}>
                    ลงทะเบียนพนักงานใหม่
                </Typography>
                <Box component="form" onSubmit={handleSignUp} noValidate sx={{ width: '100%' }}>
                    
                    <Stack spacing={2}>
                        <TextField
                            required fullWidth
                            label="Username (สำหรับเข้าสู่ระบบ)"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                required fullWidth
                                label="รหัสผ่าน" type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <TextField
                                required fullWidth
                                label="ยืนยันรหัสผ่าน" type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                required fullWidth
                                label="รหัสพนักงาน"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                InputProps={{ startAdornment: <BadgeIcon color="action" sx={{ mr: 1 }} /> }}
                            />
                            <TextField
                                required fullWidth
                                label="เบอร์โทรศัพท์"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                InputProps={{ startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} /> }}
                            />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                required fullWidth
                                label="ชื่อจริง"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                            />
                            <TextField
                                required fullWidth
                                label="นามสกุล"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="ชื่อเล่น"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                            />
                            <TextField
                                required fullWidth
                                label="แผนก/ตำแหน่ง"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            />
                        </Box>
                    </Stack>

                    <Button
                        type="submit" fullWidth variant="contained"
                        disabled={loading}
                        sx={{ mt: 4, mb: 2, bgcolor: '#D32F2F' }}
                    >
                        {loading ? "กำลังบันทึก..." : "ลงทะเบียน"}
                    </Button>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                        <Link href="/" variant="body2" underline="hover">
                            มีบัญชีแล้ว? กลับไปหน้าเข้าสู่ระบบ
                        </Link>
                    </Box>

                </Box>
            </Box>
        </Container>
    );
}

export default SignUpPage;