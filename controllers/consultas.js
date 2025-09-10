const mysql =require("mysql");

function validarCuenta(connection, numemp, contrasena, callback) {
    //console.log("Validando cuenta:", numemp);
    // Consulta que compara el hash SHA-256 de la contraseña proporcionada
    const query = `
        SELECT * FROM \`usuarios\` 
        WHERE \`ID_USUARIO\` = ? 
        AND \`PASSWORD\` = SHA2(?, 256)
    `;
    const values = [numemp, contrasena];
    
    connection.query(query, values, (err, results) => {
        if (err) {
            console.error("Error en la consulta:", err);x
            return callback({ error: "Error en la consulta", detalles: err.message });
        }
        if (results.length === 0) {
            return callback({ error: "Credenciales inválidas" });
        }
        
        // Devuelve solo los datos necesarios, excluyendo la contraseña
        const usuario = {
            id_usuario: results[0].ID_USUARIO,
            nombre: results[0].NOMBRE,
            permisos: results[0].PERMISOS,
        };        
        //console.log("Cuenta validada:", usuario.id_usuario);
        callback(null, usuario);
    });
}

function crearUsuario(connection, contra, nombre, apellidos, telefono, correo, grado, cargo, area_adscripcion, callback) {
    const query = `
        INSERT INTO \`usuarios\`
        (\`PASSWORD\`, \`ID_PROYECTO\`, \`PERMISOS\`, \`NOMBRE\`, \`APELLIDOS\`, \`TELEFONO\`, \`CORREO\`, \`GRADO\`, \`CARGO\`, \`AREA_ADSCRIPCION\`) 
        VALUES (SHA2(?, 256), NULL, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // El orden debe coincidir con el orden de columnas en la consulta
    const values = [contra, "Sustentante", nombre, apellidos, telefono, correo, grado, cargo, area_adscripcion];

    connection.query(query, values, (err, results) => {
        if (err) {
            console.error("Error al crear usuario:", err);
            return callback({ error: "Error al crear usuario", detalles: err.message });
        }
        callback(null, { success: true, id: results.insertId });
    });
}

function insertarProyecto(connection, data, callback) {
  let{
    DISCIPLINA,
    NAME_PROYECT,
    JUSTIFICACION,
    ANTECEDENTES,
    OBJ_GRAL,
    OBJ_ESP,
    ENTREGABLES,
    MONTO,
    PROGAMA,
    ADJUNTAR,
    INFO_ADD,
    ESTADO,
    ID_REVISOR,
    ID_SUSTENTANTE
  } = data;

  const sql = `
    INSERT INTO proyecto (
      DISCIPLINA, NAME_PROYECT, JUSTIFICACION, ANTECEDENTES,
      OBJ_GRAL, OBJ_ESP, ENTREGABLES, MONTO,
      PROGAMA, ADJUNTAR, INFO_ADD, ESTADO, ID_REVISOR, ID_SUSTENTANTE
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  let values = [
    DISCIPLINA,
    NAME_PROYECT,
    JUSTIFICACION,
    ANTECEDENTES,
    OBJ_GRAL,
    OBJ_ESP,
    ENTREGABLES,
    MONTO,
    PROGAMA,
    ADJUNTAR,
    INFO_ADD,
    ESTADO = 'Pendiente', 
    ID_REVISOR = null,
    ID_SUSTENTANTE
  ];

  connection.query(sql, values, (err, result) => {
    if (err) {
      callback(err);
    }

    const queryupdate = `UPDATE usuarios SET ID_PROYECTO = ? WHERE ID_USUARIO = ?`;
    connection.query(queryupdate, [result.insertId, ID_SUSTENTANTE], (err, res) => {
      if (err) {
        return callback(err);
      }
      callback(null, { success: true });
    });
  });
}

function valProyecto(connection, ID_SUSTENTANTE, callback) {
    // Funcion que cuenta los proyectos activos de un usuario, en caso de ser 0 el usuario puede crear un nuevo proyecto
    const sql = `SELECT COUNT(*) AS proyectos_pendientes
            FROM proyecto
            WHERE ID_SUSTENTANTE = ?
            AND (ESTADO = 'Pendiente' OR ESTADO = 'En espera' OR ESTADO = 'Revisado');`;
    connection.query(sql, [ID_SUSTENTANTE], (err, results) => {
        if (err) {
            console.error("Error al contar proyectos pendientes:", err);
            return callback(err);
        }
        //console.log("Proyectos pendientes encontrados:", results[0].proyectos_pendientes);
        const count = results[0].proyectos_pendientes;
        callback(null, count);
    });
}

function proyecto(connection, ID_SUSTENTANTE, callback) {
    // Funcion que obtiene los datos de un proyecto por su ID
    const sql = `SELECT * FROM proyecto WHERE ID_SUSTENTANTE = ? AND (ESTADO = 'Pendiente' OR ESTADO = 'En espera' OR ESTADO = 'Revisado') LIMIT 1`;

    connection.query(sql, [ID_SUSTENTANTE], (err, results) => {
        if (err) {
            console.error("Error al obtener proyecto:", err);
            return callback(err);
        }
        if (results.length === 0) {
            return callback({ error: "Proyecto no encontrado" });
        }
        callback(null, results[0]);
    });
}

function obtenerFinalizados(connection, ID_SUSTENTANTE, callbak) {
    const sql = 'SELECT * FROM proyecto WHERE (estado="Aceptado" OR estado="Rechazado") AND ID_SUSTENTANTE = ?';
    connection.query(sql, [ID_SUSTENTANTE], (err, result) => {
        if (err) {
            console.error('❌ Error al obtener proyectos:', err);
            return callbak(err);  // primer parámetro error, segundo opcional
        }

        if (!result || result.length === 0) {
            console.error('❌ No hay proyectos en espera length 0');
            return callbak(null, { error: '❌ No hay proyectos en espera' });  // sin error, pero avisas que no hay datos
        }

        const criterio = "SELECT * FROM criterios WHERE ID_PROYECTO IN (?)";
        const ids = result.map(proyecto => proyecto.ID_PROYECTO);

        connection.query(criterio, [ids], (err, criterios) => {
            if (err) {
                console.error('❌ Error al obtener criterios:', err);
                return callbak(err);
            }

            const proyectosConCriterios = result.map(proyecto => {
                return {
                    ...proyecto,
                    criterios: criterios.filter(c => c.ID_PROYECTO === proyecto.ID_PROYECTO)
                };
            });

            // Aquí el primer parámetro es null porque no hay error
            callbak(null, proyectosConCriterios);
        });
    });
}

module.exports = { validarCuenta, crearUsuario, insertarProyecto, valProyecto, proyecto, obtenerFinalizados };