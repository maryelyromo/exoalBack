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
    } else {
      callback(null, result.insertId);
    }
  });
}

function valProyecto(connection, ID_SUSTENTANTE, callback) {
    // Funcion que cuenta los proyectos activos de un usuario, en caso de ser 0 el usuario puede crear un nuevo proyecto
    const sql = `SELECT COUNT(*) AS proyectos_pendientes
            FROM proyecto
            WHERE ID_SUSTENTANTE = ?
            AND ESTADO = 'Pendiente';`;
    connection.query(sql, [ID_SUSTENTANTE], (err, results) => {
        if (err) {
            console.error("Error al contar proyectos pendientes:", err);
            return callback(err);
        }
        const count = results[0].proyectos_pendientes;
        callback(null, count);
    });
}

function proyecto(connection, ID_SUSTENTANTE, callback) {
    // Funcion que obtiene los datos de un proyecto por su ID
    const sql = `SELECT * FROM proyecto WHERE ID_SUSTENTANTE = ? and ESTADO = 'Pendiente'`;

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

module.exports={validarCuenta, crearUsuario, insertarProyecto, valProyecto, proyecto};