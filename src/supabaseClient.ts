import { createClient } from '@supabase/supabase-js'

// 1. ดึง "Key" จากไฟล์ .env มาใช้
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY

// 2. ตรวจสอบว่ามี Key จริงๆ (กันพลาด)
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be provided in .env file")
}

// 3. สร้างตัวเชื่อมต่อ และ export ออกไปให้ไฟล์อื่นใช้
export const supabase = createClient(supabaseUrl, supabaseKey)