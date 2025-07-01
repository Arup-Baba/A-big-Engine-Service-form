// server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');
const app = express();
const port = 3000; // You can change this if needed

// Google Apps Script Endpoints
const DRIVE_UPLOAD_URL = 'https://script.google.com/macros/s/YOUR_DRIVE_DEPLOYMENT_ID/exec';
const SHEET_SUBMIT_URL = 'https://script.google.com/macros/s/YOUR_SHEET_DEPLOYMENT_ID/exec';

// Middleware
app.use(cors());
app.use(express.json());

// Multer for handling multipart/form-data
const upload = multer();

// File upload proxy to Google Drive Apps Script
app.post('/upload', upload.any(), async (req, res) => {
  try {
    const form = new FormData();
    req.files.forEach(file => {
      form.append(file.fieldname, file.buffer, file.originalname);
    });
    Object.entries(req.body).forEach(([key, value]) => {
      form.append(key, value);
    });

    const driveRes = await fetch(DRIVE_UPLOAD_URL, {
      method: 'POST',
      body: form
    });
    const result = await driveRes.json();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Sheet submission proxy to Google Sheets Apps Script
app.post('/submit', async (req, res) => {
  try {
    const sheetRes = await fetch(SHEET_SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const result = await sheetRes.json();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Proxy server running on http://localhost:${port}`);
});
