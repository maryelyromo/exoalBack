const mysql = require("mysql");

// ---
// ## Funciones de Autenticación y Gestión de Usuarios

/**
 * @description Valida las credenciales de un usuario. Compara el ID de usuario y el hash de la contraseña proporcionada con los de la base de datos.
 * @param {object} connection Objeto de conexión a la base de datos de MySQL.
 * @param {number} id_usuario ID del usuario.
 * @param {string} contrasena La contraseña en texto plano para ser validada.
 * @param {function} callback Función de retorno que se llama al finalizar la validación.
 * @returns {void}
 */
function validarCuenta(connection, id_usuario, contrasena, callback) {
    // Consulta SQL para buscar el usuario por su ID y la contraseña hasheada.
    const query = `
        SELECT * FROM \`usuarios\` 
        WHERE \`ID_USUARIO\` = ? 
        AND \`PASSWORD\` = SHA2(?, 256)
    `;
    const values = [id_usuario, contrasena];

    connection.query(query, values, (err, results) => {
        // Manejo de errores de la consulta.
        if (err) {
            console.error("❌ Error en la consulta:", err);
            return callback({ error: "Error en la consulta", detalles: err.message });
        }

        // Si no se encuentra un usuario con las credenciales, devuelve un error.
        if (results.length === 0) {
            return callback({ error: "Credenciales inválidas" });
        }

        // Si el usuario existe, se verifica si su estado es 'Bloqueado'.
        if (results[0].PERMISOS === 'Bloqueado') {
            return callback({ error: "Usuario bloqueado" });
        }

        // Si la validación es exitosa, se crea un objeto con los datos del usuario.
        // Se excluye la contraseña por seguridad.
        const usuario = {
            id_usuario: results[0].ID_USUARIO,
            nombre: results[0].NOMBRE,
            permisos: results[0].PERMISOS,
        };

        // Llama al callback con `null` como primer parámetro (sin error) y el objeto de usuario.
        callback(null, usuario);
    });
}

/**
 * @description Crea un nuevo usuario en la base de datos.
 * @param {object} connection Objeto de conexión a la base de datos de MySQL.
 * @param {string} contra Contraseña del usuario en texto plano.
 * @param {string} nombre Nombre del usuario.
 * @param {string} apellidos Apellidos del usuario.
 * @param {number} telefono Teléfono del usuario.
 * @param {string} correo Correo electrónico del usuario.
 * @param {number} grado Grado de estudio o nivel del usuario.
 * @param {string} cargo Cargo del usuario.
 * @param {string} area_adscripcion Área de adscripción del usuario.
 * @param {function} callback Función de retorno que se llama al finalizar la operación.
 * @returns {void}
 */
function crearUsuario(connection, contra, nombre, apellidos, telefono, correo, grado, cargo, area_adscripcion, callback) {
    const query = `
        INSERT INTO \`usuarios\`
        (\`PASSWORD\`, \`ID_PROYECTO\`, \`PERMISOS\`, \`NOMBRE\`, \`APELLIDOS\`, \`TELEFONO\`, \`CORREO\`, \`GRADO\`, \`CARGO\`, \`AREA_ADSCRIPCION\`) 
        VALUES (SHA2(?, 256), NULL, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Se define el array de valores que se pasarán a la consulta.
    const values = [contra, "Sustentante", nombre, apellidos, telefono, correo, grado, cargo, area_adscripcion];

    connection.query(query, values, (err, results) => {
        // Manejo de errores en la inserción.
        if (err) {
            console.error("❌ Error al crear usuario:", err);
            return callback({ error: "Error al crear usuario", detalles: err.message });
        }
        // Llama al callback con el ID del nuevo usuario.
        callback(null, { success: true, id: results.insertId });
    });
}

// ---
// ## Funciones de Proyectos

/**
 * @description Inserta un nuevo proyecto en la base de datos y asocia su ID al usuario sustentante.
 * @param {object} connection Objeto de conexión a la base de datos de MySQL.
 * @param {object} data Objeto con los datos del proyecto a insertar.
 * @param {function} callback Función de retorno que se llama al finalizar la operación.
 * @returns {void}
 */
function insertarProyecto(connection, data, callback) {
    const {
        DISCIPLINA, NAME_PROYECT, JUSTIFICACION, ANTECEDENTES,
        OBJ_GRAL, OBJ_ESP, ENTREGABLES, MONTO,
        PROGAMA, ADJUNTAR, INFO_ADD, ID_SUSTENTANTE
    } = data;

    const sql = `
        INSERT INTO proyecto (
            DISCIPLINA, NAME_PROYECT, JUSTIFICACION, ANTECEDENTES,
            OBJ_GRAL, OBJ_ESP, ENTREGABLES, MONTO,
            PROGAMA, ADJUNTAR, INFO_ADD, ESTADO, ID_REVISOR, ID_SUSTENTANTE
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        DISCIPLINA, NAME_PROYECT, JUSTIFICACION, ANTECEDENTES,
        OBJ_GRAL, OBJ_ESP, ENTREGABLES, MONTO,
        PROGAMA, ADJUNTAR, INFO_ADD, 'Pendiente', null, ID_SUSTENTANTE
    ];

    connection.query(sql, values, (err, result) => {
        // Manejo de errores de la primera consulta.
        if (err) {
            console.error("❌ Error al insertar el proyecto:", err);
            return callback(err);
        }

        // Actualiza el ID del proyecto en la tabla de usuarios.
        const queryupdate = `UPDATE usuarios SET ID_PROYECTO = ? WHERE ID_USUARIO = ?`;
        connection.query(queryupdate, [result.insertId, ID_SUSTENTANTE], (err) => {
            if (err) {
                console.error("❌ Error al actualizar el ID del proyecto en el usuario:", err);
                return callback(err);
            }
            callback(null, { success: true, mensaje: '✔️ Proyecto creado y asociado al usuario correctamente' });
        });
    });
}

/**
 * @description Cuenta los proyectos de un usuario que están en estado "Pendiente", "En espera" o "Revisado".
 * @param {object} connection Objeto de conexión a la base de datos de MySQL.
 * @param {number} ID_SUSTENTANTE ID del usuario sustentante.
 * @param {function} callback Función de retorno que devuelve el conteo de proyectos.
 * @returns {void}
 */
function valProyecto(connection, ID_SUSTENTANTE, callback) {
    const sql = `
        SELECT COUNT(*) AS proyectos_pendientes
        FROM proyecto
        WHERE ID_SUSTENTANTE = ? AND (ESTADO = 'Pendiente' OR ESTADO = 'En espera' OR ESTADO = 'Revisado')
    `;

    connection.query(sql, [ID_SUSTENTANTE], (err, results) => {
        if (err) {
            console.error("❌ Error al contar proyectos pendientes:", err);
            return callback(err);
        }
        // Devuelve el conteo de proyectos.
        const count = results[0].proyectos_pendientes;
        callback(null, count);
    });
}

/**
 * @description Obtiene los datos de un proyecto activo (pendiente, en espera o revisado) de un usuario.
 * @param {object} connection Objeto de conexión a la base de datos de MySQL.
 * @param {number} ID_SUSTENTANTE ID del usuario sustentante.
 * @param {function} callback Función de retorno que devuelve los datos del proyecto.
 * @returns {void}
 */
function proyecto(connection, ID_SUSTENTANTE, callback) {
    const sql = `
        SELECT * FROM proyecto 
        WHERE ID_SUSTENTANTE = ? 
        AND (ESTADO = 'Pendiente' OR ESTADO = 'En espera' OR ESTADO = 'Revisado') 
        LIMIT 1
    `;

    connection.query(sql, [ID_SUSTENTANTE], (err, results) => {
        if (err) {
            console.error("❌ Error al obtener el proyecto:", err);
            return callback(err);
        }
        if (results.length === 0) {
            return callback({ error: "Proyecto no encontrado" });
        }
        // Devuelve el primer (y único) proyecto activo.
        callback(null, results[0]);
    });
}

/**
 * @description Obtiene los proyectos finalizados (aceptados o rechazados) de un usuario, junto con sus criterios de revisión.
 * @param {object} connection Objeto de conexión a la base de datos de MySQL.
 * @param {number} ID_SUSTENTANTE ID del usuario sustentante.
 * @param {function} callback Función de retorno que devuelve los proyectos finalizados.
 * @returns {void}
 */
function obtenerFinalizados(connection, ID_SUSTENTANTE, callback) {
    const sql = 'SELECT * FROM proyecto WHERE (estado = "Aceptado" OR estado = "Rechazado") AND ID_SUSTENTANTE = ?';
    connection.query(sql, [ID_SUSTENTANTE], (err, result) => {
        if (err) {
            console.error('❌ Error al obtener proyectos:', err);
            return callback(err);
        }
        if (!result || result.length === 0) {
            console.warn('⚠️ No hay proyectos finalizados para este usuario.');
            return callback(null, { error: '❌ No hay proyectos finalizados' });
        }

        const criterioSql = "SELECT * FROM criterios WHERE ID_PROYECTO IN (?)";
        const ids = result.map(proyecto => proyecto.ID_PROYECTO);

        connection.query(criterioSql, [ids], (err, criterios) => {
            if (err) {
                console.error('❌ Error al obtener criterios:', err);
                return callback(err);
            }
            const proyectosConCriterios = result.map(proyecto => {
                const criteriosFiltrados = criterios.filter(c => c.ID_PROYECTO === proyecto.ID_PROYECTO);
                return {
                    ...proyecto,
                    criterios: criteriosFiltrados
                };
            });
            callback(null, proyectosConCriterios);
        });
    });
}

// ---
// ## Exportación de Módulos

// Se exportan todas las funciones para que puedan ser usadas desde otros archivos del proyecto.
module.exports = { validarCuenta, crearUsuario, insertarProyecto, valProyecto, proyecto, obtenerFinalizados };