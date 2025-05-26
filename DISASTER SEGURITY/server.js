require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ---------------------- Conexión a la base de datos ----------------------
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Conectado a MySQL');
});

// ---------------------- Almacenamiento de archivos ----------------------
const storagePerfil = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/perfiles/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, req.params.cedula + ext);
  }
});
const uploadPerfil = multer({ storage: storagePerfil });

const storageEvidencias = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/evidencias/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + ext;
    cb(null, uniqueName);
  }
});
const uploadEvidencia = multer({ storage: storageEvidencias });

// ---------------------- Rutas API ----------------------
app.post('/api/registrar', (req, res) => {
  const { nombre, apellidos, direccion, celular, cedula, password } = req.body;
  const sql = `INSERT INTO usuarios (nombre, apellidos, direccion, celular, cedula, password) VALUES (?, ?, ?, ?, ?, ?)`;
  db.query(sql, [nombre, apellidos, direccion, celular, cedula, password], (err) => {
    if (err) return res.status(500).send("Error al registrar");
    res.send("Usuario registrado correctamente");
  });
});

app.post('/api/login', (req, res) => {
  const { nombre, cedula, password } = req.body;
  const sql = `SELECT * FROM usuarios WHERE nombre = ? AND cedula = ? AND password = ?`;
  db.query(sql, [nombre, cedula, password], (err, results) => {
    if (err) return res.status(500).send("Error al registrar");
    if (results.length > 0) res.send("Acceso concedido");
    else res.status(401).send("Datos incorrectos");
  });
});

app.get('/api/usuario/:cedula', (req, res) => {
  const { cedula } = req.params;
  const sql = 'SELECT * FROM usuarios WHERE cedula = ?';
  db.query(sql, [cedula], (err, results) => {
    if (err) return res.status(500).send("Error");
    if (results.length === 0) return res.status(404).send("No encontrado");
    res.json(results[0]);
  });
});

app.post('/api/usuario/:cedula/foto', uploadPerfil.single('foto'), (req, res) => {
  const cedula = req.params.cedula;
  const filename = req.file.filename;
  const ruta = `/perfiles/${filename}`;
  const sql = 'UPDATE usuarios SET foto = ? WHERE cedula = ?';
  db.query(sql, [ruta, cedula], err => {
    if (err) return res.status(500).send("Error al guardar foto");
    res.send("Foto actualizada correctamente");
  });
});

app.post('/api/notificaciones', (req, res) => {
  const { tipo, descripcion } = req.body;
  const sql = 'INSERT INTO notificaciones (tipo, descripcion) VALUES (?, ?)';
  db.query(sql, [tipo, descripcion], (err) => {
    if (err) return res.status(500).send("Error al guardar notificacion");
    res.send("Notificación guardada");
  });
});

app.get('/api/notificaciones', (req, res) => {
  db.query('SELECT * FROM notificaciones ORDER BY fecha DESC', (err, results) => {
    if (err) return res.status(500).send("Error al obtener notificaciones");
    res.json(results);
  });
});

app.post('/api/reportes', uploadEvidencia.single('evidencia'), (req, res) => {
  const { tipo, descripcion, cedula } = req.body;
  const evidencia = req.file ? `/evidencias/${req.file.filename}` : null;

  if (!tipo || !descripcion || !cedula) {
    return res.status(400).send("Faltan datos obligatorios");
  }

  const sqlReporte = 'INSERT INTO reportes (tipo, descripcion, evidencia, cedula) VALUES (?, ?, ?, ?)';
  db.query(sqlReporte, [tipo, descripcion, evidencia, cedula], (err) => {
    if (err) {
      console.error("❌ ERROR MYSQL:", err.sqlMessage);
      return res.status(500).send("Error al guardar reporte: " + err.sqlMessage);
    }

    const ubicacion = req.body.ubicacion || "Sin ubicación";
    const sqlNoti = 'INSERT INTO notificaciones (tipo, descripcion, ubicacion, autoridades) VALUES (?, ?, ?, ?)';
    const mensaje = `Nuevo reporte de tipo "${tipo}" - ${descripcion}`;
    db.query(sqlNoti, [tipo, mensaje, ubicacion, false], (err2) => {
      if (err2) {
        console.error("❌ ERROR al guardar notificación:", err2.sqlMessage);
        return res.status(500).send("Reporte guardado, pero falló notificación: " + err2.sqlMessage);
      }
      res.send("✅ Reporte y notificación guardados");
    });
  });
});

// ---------------------- Iniciar servidor ----------------------
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));