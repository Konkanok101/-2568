const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// กำหนด session
app.use(session({
  secret: 'admin-secret',
  resave: false,
  saveUninitialized: true,
}));

// รองรับการอ่านข้อมูล form
app.use(express.urlencoded({ extended: true }));

// ใช้ไฟล์ static เช่นรูป QR
app.use(express.static(__dirname));

// ตั้งค่า upload สลิป
const upload = multer({ dest: 'uploads/' });

// จำลองฐานข้อมูลเก็บรายการชำระเงิน
let payments = [];


// หน้าเว็บหลัก
app.get('/', (req, res) => {
  const isAdmin = req.session.isAdmin === true;

  res.send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>ระบบเก็บเงินนักศึกษา</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 font-sans">
      <div class="max-w-xl mx-auto p-6 bg-white shadow-lg rounded-lg mt-10">
        <h2 class="text-2xl font-bold text-center text-blue-600 mb-6">
          💰 ระบบเก็บเงินนักศึกษา
        </h2>

        <div class="mb-6 text-center">
          <img src="qr.png" alt="QR Code" class="w-48 mx-auto border rounded-md" />
          <p class="mt-2 text-sm text-gray-600">บัญชีกรุงไทย 123-4-56789-0</p>
        </div>

        <form action="/upload" method="POST" enctype="multipart/form-data" class="space-y-4">
          <div>
            <label class="block text-gray-700 font-medium">ชื่อผู้โอน</label>
            <input type="text" name="name" required
              class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-gray-700 font-medium">แนบสลิปโอนเงิน</label>
            <input type="file" name="slip" accept="image/*" required
              class="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" />
          </div>
          <button type="submit"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200">
            ✅ ส่งข้อมูล
          </button>
        </form>

        ${isAdmin ? `
        <form action="/download" method="GET" class="mt-6 text-center">
          <button type="submit"
            class="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-md transition duration-200">
            ⬇️ ดาวน์โหลด Excel
          </button>
        </form>
        <form action="/logout" method="POST" class="mt-2 text-center">
          <button type="submit"
            class="text-red-500 underline text-sm">ออกจากระบบ</button>
        </form>
        ` : `
        <div class="mt-6 text-center text-sm text-gray-500">
          🔒 สำหรับแอดมินเท่านั้น <a href="/admin/login" class="text-blue-500 underline">เข้าสู่ระบบ</a>
        </div>
        `}
      </div>
    </body>
    </html>
  `);
});

// อัปโหลดข้อมูลการโอน
app.post('/upload', upload.single('slip'), (req, res) => {
  const { name } = req.body;
  const date = new Date();

  payments.push({
    name,
    date: date.toISOString().split('T')[0],
    filename: req.file.originalname,
  });

  res.redirect('/');
});

// หน้า login
app.get('/admin/login', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>เข้าสู่ระบบแอดมิน</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 flex items-center justify-center min-h-screen">
        <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
          <h2 class="text-2xl font-bold text-center text-blue-600 mb-6">
            🔐 เข้าสู่ระบบแอดมิน
          </h2>
          <form method="POST" action="/admin/login" class="space-y-4">
            <div>
              <label class="block text-gray-700 font-medium mb-1">ชื่อผู้ใช้</label>
              <input type="text" name="username" required
                class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label class="block text-gray-700 font-medium mb-1">รหัสผ่าน</label>
              <input type="password" name="password" required
                class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <button type="submit"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200">
              ✅ เข้าสู่ระบบ
            </button>
          </form>
          <p class="text-center text-sm text-gray-500 mt-4">
            <a href="/" class="text-blue-500 underline">← กลับหน้าหลัก</a>
          </p>
        </div>
      </body>
      </html>
    `);
  });
  

// ตรวจสอบ login
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '1234') {
    req.session.isAdmin = true;
    res.redirect('/');
  } else {
    res.send('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง <a href="/admin/login">ลองใหม่</a>');
  }
});

// ออกจากระบบ
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ดาวน์โหลด excel (เฉพาะแอดมิน)
app.get('/download', async (req, res) => {
    if (!req.session.isAdmin) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>ไม่ได้รับอนุญาต</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-red-50 min-h-screen flex items-center justify-center">
          <div class="bg-white border border-red-200 p-8 rounded-lg shadow-lg max-w-md text-center">
            <div class="text-4xl text-red-500 mb-4">⛔</div>
            <h2 class="text-xl font-bold text-gray-800 mb-2">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
            <p class="text-gray-600 mb-6">โปรดเข้าสู่ระบบแอดมินเพื่อดำเนินการดาวน์โหลดไฟล์</p>
            <a href="/admin/login"
              class="inline-block bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium transition duration-200">
              🔑 เข้าสู่ระบบแอดมิน
            </a>
            <div class="mt-4">
              <a href="/" class="text-sm text-gray-500 underline">← กลับหน้าหลัก</a>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  
    // ส่วนนี้เหมือนเดิม: สร้าง Excel แล้วให้ดาวน์โหลด
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("ชำระเงิน");
  
    sheet.columns = [
      { header: 'ชื่อผู้โอน', key: 'name', width: 30 },
      { header: 'วันที่', key: 'date', width: 20 },
      { header: 'ชื่อไฟล์สลิป', key: 'filename', width: 40 }
    ];
  
    payments.forEach(p => sheet.addRow(p));
  
    const filePath = path.join(__dirname, 'report.xlsx');
    await workbook.xlsx.writeFile(filePath);
  
    res.download(filePath, 'รายงานการชำระเงิน.xlsx');
  });
  

// เริ่มต้นเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`✅ Server started at http://localhost:${PORT}`);
});
