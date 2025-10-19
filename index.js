const express = require("express");  
const app = express();
const puerto=3000;
const mysql=require("mysql");
const {validarCuenta,crearUsuario,insertarProyecto,valProyecto,proyecto, obtenerFinalizados}=require("./controllers/consultas");
const {obtenerProyectos,asignarRevisor,revisorActivo,proyectoarevisar,proyectoRevisado} = require("./controllers/revisor");
const {proyectosEnEspera ,actualizarEstadoProyecto,updateUserStatus,getUsers,proyectosFinalizados,cambioPassword}=require("./controllers/admin");
const cors=require('cors');
const jwt = require('jsonwebtoken');
const SECRET_KEY = "tu_clave_secreta_aqui"; // Cambia esto por una clave segura
const bodyparse=require("body-parser");


app.use(cors());
// Parsea el cuerpo de las peticiones en formato JSON.
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
        return res.status(400).json({ error: "ID y contraseña son requeridos" });
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

/**
 * @api {post} /crearuser Creación de un nuevo usuario
 * @apiDescription Inserta un nuevo usuario en la base de datos.
 * @apiParam {String} contra Contraseña del usuario.
 * @apiParam {String} nombre Nombre del usuario.
 * @apiParam {String} apellidos Apellidos del usuario.
 * @apiParam {Number} telefono Teléfono del usuario.
 * @apiParam {String} correo Correo electrónico del usuario.
 * @apiParam {Number} grado Grado de estudio o nivel del usuario.
 * @apiParam {String} cargo Cargo del usuario.
 * @apiParam {String} area_adscripcion Área de adscripción.
 * @apiSuccess (201) {String} message Mensaje de confirmación.
 * @apiSuccess (201) {Number} id ID del usuario creado.
 * @apiError (400) {String} error Faltan campos requeridos.
 * @apiError (500) {String} error Error interno al crear el usuario.
 */
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

/**
 * @api {post} /nuevoProyecto Creación de un nuevo proyecto
 * @apiDescription Inserta un nuevo proyecto si el sustentante no tiene uno activo.
 * @apiParam {Object} proyecto Datos del proyecto.
 * @apiSuccess {String} message Mensaje de confirmación.
 * @apiSuccess {Number} id ID del proyecto creado.
 * @apiError (400) {String} error El usuario ya tiene un proyecto activo.
 * @apiError (500) {String} error Error interno al validar o insertar el proyecto.
 */
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

/**
 * @api {post} /proyectoActivo Verificación de proyecto activo
 * @apiDescription Verifica si un sustentante puede crear un nuevo proyecto.
 * @apiParam {Number} ID_SUSTENTANTE ID del usuario sustentante.
 * @apiSuccess {String} message Mensaje de confirmación.
 * @apiError (400) {String} error El usuario ya tiene un proyecto activo.
 * @apiError (500) {String} error Error interno al validar el proyecto.
 */
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

/**
 * @api {post} /data/proyecto Obtención de datos de un proyecto activo
 * @apiDescription Obtiene los datos de un proyecto pendiente, en espera o revisado de un sustentante.
 * @apiParam {Number} ID_SUSTENTANTE ID del usuario sustentante.
 * @apiSuccess {String} message Mensaje de confirmación.
 * @apiSuccess {Object} data Datos del proyecto.
 * @apiError (400) {String} error ID de sustentante es requerido.
 * @apiError (500) {String} error Error interno al obtener datos del proyecto.
 */
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

/**
 * @api {get} /data/proyectos Obtención de todos los proyectos pendientes
 * @apiDescription Obtiene una lista de todos los proyectos con estado "Pendiente".
 * @apiSuccess {Object[]} proyectos Lista de proyectos.
 * @apiError (500) {String} error Error interno al obtener proyectos.
 */
app.get('/data/proyectos', (req, res) => {
  obtenerProyectos(connection, (err, callback) => {
      if (err) {
          return res.status(500).json({ error: '❌ Error al obtener proyectos' });
      }
      res.status(200).json(callback);
  });
});

/**
 * @api {post} /asignarRevisor Asignación de revisor a un proyecto
 * @apiDescription Asigna un revisor disponible a un proyecto pendiente.
 * @apiParam {Number} id_revisor ID del revisor.
 * @apiParam {Number} id_proyecto ID del proyecto.
 * @apiSuccess {String} message Mensaje de confirmación.
 * @apiError (400) {String} error ID de revisor y ID de proyecto son requeridos.
 * @apiError (500) {String} error Error interno al asignar revisor.
 */
app.post('/asignarRevisor', (req, res) => {
  const { id_revisor, id_proyecto } = req.body;

  if (!id_revisor || !id_proyecto) {
    return res.status(400).json({ error: '❌ ID de revisor y ID de proyecto son requeridos' });
  }

  asignarRevisor(connection, id_revisor, id_proyecto, (err, result) => {
    if (err) {
      console.error('Error al asignar revisor:', err);
      return res.status(500).json({ error: '❌ Error interno al asignar revisor' });
    }
    res.status(200).json({ message: '✔️ Revisor asignado correctamente', result });
  });
});

/**
 * @api {post} /revisorActivo Verificación de revisor activo
 * @apiDescription Verifica si un revisor está disponible (no tiene un proyecto asignado).
 * @apiParam {Number} id_revisor ID del revisor.
 * @apiSuccess {Boolean} disponible Estado de disponibilidad.
 * @apiSuccess {String} message Mensaje de confirmación.
 * @apiError (400) {String} error ID de revisor es requerido.
 * @apiError (500) {String} error Error interno al verificar disponibilidad.
 */
app.post('/revisorActivo', (req, res) => {
  const { id_revisor } = req.body;

  if (!id_revisor) {
    return res.status(400).json({ error: '❌ ID de revisor es requerido' });
  }

  revisorActivo(connection, id_revisor, (err, result) => {
    if (err) {
      return res.status(500).json({ error: '❌ Error al verificar disponibilidad del revisor' });
    }

    res.status(200).json(result);
  });
});

/**
 * @api {post} /data/proyectoarevisar Obtención de proyecto para revisar
 * @apiDescription Obtiene el proyecto asignado a un revisor.
 * @apiParam {Number} id_revisor ID del revisor.
 * @apiSuccess {Object[]} proyectos Lista de proyectos asignados.
 * @apiError (400) {String} error ID de revisor es requerido.
 * @apiError (500) {String} error Error interno al obtener proyectos.
 */
app.post('/data/proyectoarevisar', (req, res) => {
  const { id_revisor } = req.body;

  if (!id_revisor) {
    return res.status(400).json({ error: '❌ ID de revisor es requerido' });
  }

  proyectoarevisar(connection, id_revisor, (err, result) => {
    if (err) {
      return res.status(500).json({ error: '❌ Error al obtener proyectos a revisar' });
    }

    res.status(200).json(result);
  });
});

app.post('/data/proyectoRevisado', (req, res) => {
  const data = {
    id_proyecto: req.body.ID_PROYECTO,
    relacion: req.body.RELACION,
    extension: req.body.EXTENSION,
    diseno: req.body.DISENO,
    riesgos: req.body.RIESGOS,
    forma: req.body.FORMA,
    analisis: req.body.ANALISIS,
    recomendaciones: req.body.RECOMENDACIONES,
    id_revisor: req.body.ID_REVISOR
  };

  proyectoRevisado(connection, data, (err, result) => {
    if (err) {
      console.error('❌ Error al procesar revisión:', err);
      return res.status(500).json({ success: false, message: 'Error al revisar proyecto', error: err });
    }
    res.status(200).json({ success: true, message: 'Proyecto revisado y actualizado correctamente' });
  });
});

app.get('/admin/enespera', (req, res) => {
    proyectosEnEspera(connection, (err, result) => {
        // Manejo de errores de la Base de Datos o de la función
        if (err) {
            console.error('❌ Error en el endpoint /api/admin/proyectos-en-espera:', err);
            // Se devuelve un error 500 (Error Interno del Servidor) en caso de fallo de BD.
            return res.status(500).json({ 
                mensaje: 'Error interno del servidor al obtener proyectos',
                detalle: err.message || err 
            });
        }
        
        if (result && result.error) {
            return res.status(200).json([]);
        }
        
        res.status(200).json(result);
        
        console.log(`✅ ${result.length} proyectos en espera enviados.`);
    });
});

app.post('/admin/updateStatus', (req, res) => {
    const { id_proyecto, status } = req.body;

    if (!id_proyecto || !status) {
        return res.status(400).json({ error: '❌ ID de proyecto y estado son requeridos' });
    }

    actualizarEstadoProyecto(connection, id_proyecto, status, (err, result) => {
        if (err) {
            console.error('❌ Error al actualizar estado del proyecto:', err);
            return res.status(500).json({ error: '❌ Error interno al actualizar estado del proyecto' });
        }
        res.status(200).json({ message: '✔️ Estado del proyecto actualizado correctamente', result });
    });
});

app.post('/admin/updateUserStatus', (req, res) => {
    const { id_usuario, permiso } = req.body;

    if (!id_usuario || !permiso) {
        return res.status(400).json({ error: '❌ ID de usuario y permiso son requeridos' });
    }

    updateUserStatus(connection, id_usuario, permiso, (err, result) => {
        if (err) {
            console.error('❌ Error al actualizar permiso de usuario:', err);
            return res.status(500).json({ error: '❌ Error interno al actualizar permiso de usuario' });
        }
        res.status(200).json({ message: '✔️ Permiso de usuario actualizado correctamente', result });
    });
});

app.get('/admin/getUsers', (req, res) => {
    getUsers(connection, (err, result) => {
        if (err) {
            console.error('❌ Error al obtener usuarios:', err);
            return res.status(500).json({ error: '❌ Error interno al obtener usuarios' });
        }
        res.status(200).json(result);
    });
});

app.post('/data/misProyectos', (req, res) => {
    const { ID_SUSTENTANTE } = req.body;

    if (!ID_SUSTENTANTE || isNaN(ID_SUSTENTANTE)) {
        return res.status(400).json({ error: 'ID_SUSTENTANTE inválido o faltante' });
    }

    obtenerFinalizados(connection, ID_SUSTENTANTE, (err, proyectos) => {
        if (err) {
            // Error real del servidor o BD
            return res.status(500).json({ error: 'Error al obtener proyectos error' });
        }

        if (proyectos.error) {
            // No se encontraron proyectos o mensaje no crítico
            return res.status(404).json(proyectos);
        }

        // Todo bien, se regresan los proyectos
        res.status(200).json(proyectos);
    });
});

app.get('/admin/proyectosFinalizados', (req, res) => {
    // La función ahora usa la función corregida (proyectosEnEspera)
    proyectosFinalizados(connection, (err, result) => {
        // 1. Manejo de error de base de datos
        if (err) {
            console.error('Error al responder la API /admin/proyectosFinalizados:', err);
            // Devolver un error 500 si la BD falla
            return res.status(500).json({ 
                mensaje: 'Error interno del servidor al consultar la BD', 
                error: err.message 
            });
        }

        res.status(200).json(result); 
    });
});

app.post('/admin/cambioPass',(req,res)=>{
    const { id_usuario, nueva_contra, antigua_contra } = req.body;
    console.log(id_usuario,nueva_contra,antigua_contra);
    if (!id_usuario || !nueva_contra || !antigua_contra) {
        return res.status(400).json({ error: '❌ ID de usuario, nueva contraseña y antigua contraseña son requeridos' });
    }
    if(nueva_contra===antigua_contra){
        return res.status(400).json({ error: '❌ La nueva contraseña no puede ser igual a la antigua' });
    }
    cambioPassword(connection, id_usuario, nueva_contra, (err, result) => {
        if (err) {
            console.error('❌ Error al cambiar la contraseña:', err);
            return res.status(500).json({ error: '❌ Error interno al cambiar la contraseña' });
        }
        console.log("Se ha actualizado contra");
        res.status(200).json({ message: '✔️ Contraseña actualizada correctamente', result });
        
    });
});
app.listen(puerto, () => {
  console.log(`Servidor corriendo en el puerto `+puerto);
});

