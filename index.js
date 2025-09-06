const express = require("express");  
const app = express();
const puerto=3000;
const mysql=require("mysql");
const {validarCuenta,crearUsuario,insertarProyecto,valProyecto,proyecto}=require("./consultas");
const cors=require('cors');
const jwt = require('jsonwebtoken');
const SECRET_KEY = "tu_clave_secreta_aqui"; // Cambia esto por una clave segura
const bodyparse=require("body-parser");


app.use(cors());
app.use(bodyparse.json());
app.use(bodyparse.urlencoded({extended:false}));

const connection =mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"",
    database:"exoal",
});

connection.connect((err)=>{
    if(err) throw err;
    console.log("Coneccion con la base de datos");
})
app.get("/",(req,res)=>{
    res.send("Servidor corriendo");
})

app.post('/login', (req, res) => {
    const { id, password } = req.body;

    if (!id || !password) {
        return res.status(400).json({ error: "Número de empleado y contraseña son requeridos" });
    }

    console.log("Intento de login para:", id);

    validarCuenta(connection, id, password, (err, usuario) => {
        if (err) {
            console.error("Error en autenticación:", err.error);
            return res.status(401).json(err); // 401 Unauthorized
        }

        console.log("Login exitoso para:", usuario);

        // ✅ Generar JWT con datos básicos del usuario
        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                permisos: usuario.permisos
            },
            SECRET_KEY,
            { expiresIn: '2h' } // expira en 2 horas
        );
        // ✅ Respuesta con token y usuario
        res.status(200).json({
            success: true,
            message: "Autenticación exitosa",
            token,  
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                permisos: usuario.permisos
            }
        });
    });
});

app.post('/crearuser', (req, res) => {
  // Extraemos todos los campos necesarios desde el body
  const { contra, nombre, apellidos, telefono, correo, grado, cargo, area_adscripcion } = req.body;

  // Validamos que los campos obligatorios estén presentes
  if (!contra || !nombre || !apellidos || !telefono || !correo || !grado || !cargo || !area_adscripcion) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  // Llama a la función que inserta en la base de datos
  crearUsuario(connection, contra, nombre, apellidos, telefono, correo, grado, cargo, area_adscripcion, (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }
    res.status(201).json({ message: "Usuario creado exitosamente", id: result.id });
  });
});

app.post('/nuevoProyecto', (req, res) => {
  const proyecto = req.body;
  // Validar si ya tiene un proyecto pendiente
  valProyecto(connection, proyecto.ID_SUSTENTANTE, (err, count) => {
    if (err) {
      console.error('❌ Ya tienes un proyecto activo. Debes cerrarlo antes de crear uno nuevo.', err);
      return res.status(500).json({ error: 'Error al validar proyecto existente' });
    }
    if (count > 0) {
      return res.status(400).json({ error: '❌ Ya tienes un proyecto activo. Debes cerrarlo antes de crear uno nuevo.' });
    }
    //Insertar si no hay proyecto pendiente
    insertarProyecto(connection, proyecto, (err, insertId) => {
      if (err) {
        console.error('❌ Error al insertar proyecto:', err);
        return res.status(500).json({ error: 'Error al insertar proyecto' });
      }
      res.status(200).json({ message: '✔️ Proyecto creado correctamente', id: insertId });
    });
  });
});

app.post('/proyectoActivo', (req, res) => {
  const { ID_SUSTENTANTE } = req.body;

  valProyecto(connection, ID_SUSTENTANTE, (err, count) => {
    if (err) {
      return res.status(500).json({ error: ' ❌ Error al validar proyecto' });
    }
    if (count > 0) {
      return res.status(400).json({ error: ' ❌ Ya tienes un proyecto activo' });
    }
    res.status(200).json({ message: '✔️ Puedes crear un nuevo proyecto' });
  });
});

app.post('/data/proyecto', (req, res) => {
  const { ID_SUSTENTANTE } = req.body;
  if (!ID_SUSTENTANTE) {
    return res.status(400).json({ error: '❌ ID de sustentante es requerido' });
  }

  proyecto(connection, ID_SUSTENTANTE, (err, data) => {
    if (err) {
      return res.status(500).json({ error: '❌ Error al obtener datos del proyecto' });
    }
    res.status(200).json({ message: '✔️ Datos del proyecto', data });
  });
});



app.listen(puerto, () => {
  console.log(`Servidor corriendo en el puerto `+puerto);
});

