import React, { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Link, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom'; // ตัวช่วยเปลี่ยนหน้า
import { supabase } from '../supabaseClient'; // เรียกใช้ตัวเชื่อม Supabase

function SignUpPage() {
    const navigate = useNavigate(); // สร้างตัวเปลี่ยนหน้า

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nickname, setNickname] = useState('');
    const [department, setDepartment] = useState('');
    const [loading, setLoading] = useState(false); // สถานะกำลังโหลด

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            alert("รหัสผ่านไม่ตรงกัน!");
            return;
        }

        if (!username || !password || !firstName || !lastName || !department) {
            alert("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        try {
            setLoading(true); // เริ่มโหลด (ทำให้ปุ่มกดไม่ได้)

            // 1. แปลง Username เป็น Email (เพราะ Supabase บังคับใช้อีเมล)
            // เช่น user กรอก "somchai" -> เราส่งไปเป็น "somchai@example.com"
            const fakeEmail = `${username}@example.com`;

            // 2. สร้าง User ในระบบ Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: fakeEmail,
                password: password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("ไม่สามารถสร้างผู้ใช้ได้");

            // 3. บันทึกข้อมูลส่วนตัวลงตาราง Profiles
            const { error: profileError } = await supabase.from('Profiles').insert([
                {
                    user_id: authData.user.id, // เชื่อมกับ ID ของ User ที่เพิ่งสร้าง
                    username: username,
                    first_name: firstName,
                    last_name: lastName,
                    nickname: nickname,
                    department: department,
                    role: 'STAFF', // บังคับเป็นพนักงานทั่วไป
                    approval_status: 'PENDING' // สถานะรออนุมัติ <-- ถูกต้อง
                }
            ]);

            if (profileError) throw profileError;

            // 4. ถ้าสำเร็จทั้งหมด
            alert("ลงทะเบียนสำเร็จ! กรุณารอแอดมินอนุมัติก่อนเข้าใช้งาน");
            navigate('/'); // ดีดกลับไปหน้า Login

        } catch (error: any) {
            console.error(error);
            alert("เกิดข้อผิดพลาด: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false); // หยุดโหลด
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h5">
                    ลงทะเบียน (สำหรับพนักงาน)
                </Typography>
                <Box component="form" onSubmit={handleSignUp} noValidate sx={{ mt: 3, width: '100%' }}>
                    
                    <Stack spacing={2}>
                        <TextField
                            required fullWidth
                            label="Username (สำหรับใช้ล็อกอิน)"
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
                                label="แผนก (เช่น ช่าง)"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            />
                        </Box>
                    </Stack>

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={loading} // ห้ามกดซ้ำขณะโหลด
                        sx={{ mt: 3, mb: 2 }}
                    >
                        {loading ? "กำลังบันทึก..." : "ลงทะเบียน (รอแอดมินอนุมัติ)"}
                    </Button>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                        <Link href="/" variant="body2">
                            มีบัญชีแล้ว? กลับไปหน้าเข้าสู่ระบบ
                        </Link>
                    </Box>

                </Box>
            </Box>
        </Container>
    );
}

export default SignUpPage;