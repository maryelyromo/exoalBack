const mysql = require("mysql");

// ---
// ## Funciones de Proyectos para Revisores

/**
 * @description Obtiene todos los proyectos que están en estado "Pendiente".
 * @param {object} connection - Objeto de conexión a la base de datos de MySQL.
 * @param {function} callback - Función de retorno que se ejecuta al finalizar la consulta.
 * @returns {void}
 */
function obtenerProyectos(connection, callback) {
    const sql = 'SELECT * FROM proyecto WHERE ESTADO="Pendiente"';
    connection.query(sql, (err, results) => {
        // Manejo de errores de la consulta.
        if (err) {
            console.error('❌ Error al obtener proyectos pendientes:', err);
            return callback(err);
        }
        // Devuelve los resultados de la consulta.
        callback(null, results);
    });
}

/**
 * @description Asigna un proyecto a un revisor, verificando su disponibilidad.
 * @param {object} connection - Objeto de conexión a la base de datos de MySQL.
 * @param {number} id_revisor - ID del revisor al que se le asignará el proyecto.
 * @param {number} id_proyecto - ID del proyecto a asignar.
 * @param {function} callback - Función de retorno que se ejecuta al finalizar la operación.
 * @returns {void}
 */
function asignarRevisor(connection, id_revisor, id_proyecto, callback) {
    // 1. Verifica si el revisor está disponible (no tiene un proyecto asignado).
    const sql = 'SELECT * FROM usuarios WHERE ID_USUARIO = ? AND ID_PROYECTO IS NULL AND PERMISOS = "Revisor"';
    connection.query(sql, [id_revisor], (err, results) => {
        if (err) {
            console.error('❌ Error al verificar la disponibilidad del revisor:', err);
            return callback(err);
        }

        if (results.length === 0) {
            // El revisor no está disponible o no tiene el permiso correcto.
            return callback(null, { success: false, message: '❌ Revisor no disponible o no tiene el permiso adecuado.' });
        }

        // 2. Si el revisor está disponible, actualiza el estado del proyecto y asigna el revisor.
        const updateSql = 'UPDATE proyecto SET ID_REVISOR = ?, ESTADO = "Revisado" WHERE ID_PROYECTO = ?';
        connection.query(updateSql, [id_revisor, id_proyecto], (updateErr) => {
            if (updateErr) {
                console.error('❌ Error al asignar el revisor al proyecto:', updateErr);
                return callback(updateErr);
            }

            // 3. Asocia el ID del proyecto al revisor en la tabla de usuarios.
            const updateRevisorSql = 'UPDATE usuarios SET ID_PROYECTO = ? WHERE ID_USUARIO = ?';
            connection.query(updateRevisorSql, [id_proyecto, id_revisor], (updateRevisorErr) => {
                if (updateRevisorErr) {
                    console.error('❌ Error al actualizar el proyecto del revisor:', updateRevisorErr);
                    return callback(updateRevisorErr);
                }
                // Si ambas actualizaciones son exitosas, se devuelve una respuesta positiva.
                callback(null, { success: true, message: '✔️ Revisor asignado al proyecto correctamente.' });
            });
        });
    });
}

/**
 * @description Verifica si un revisor específico está disponible para tomar un nuevo proyecto.
 * @param {object} connection - Objeto de conexión a la base de datos de MySQL.
 * @param {number} id_revisor - ID del revisor a verificar.
 * @param {function} callback - Función de retorno que devuelve el estado de disponibilidad.
 * @returns {void}
 */
function revisorActivo(connection, id_revisor, callback) {
    const sql = 'SELECT * FROM usuarios WHERE ID_USUARIO = ? AND ID_PROYECTO IS NULL';

    connection.query(sql, [id_revisor], (err, results) => {
        if (err) {
            console.error('❌ Error al verificar revisor activo:', err);
            return callback(err);
        }

        // Se verifica si se encontró un revisor disponible.
        const disponible = results.length > 0;
        if (!disponible) {
            console.warn('⚠️ Revisor no disponible (ya tiene un proyecto asignado).');
            return callback(null, { disponible: false, message: '❌ Revisor no disponible.' });
        }
        
        console.log('✅ Revisor disponible.');
        callback(null, { disponible: true, message: '✔️ Revisor disponible.', data: results[0] });
    });
}

/**
 * @description Obtiene el proyecto que un revisor tiene asignado para revisar.
 * @param {object} connection - Objeto de conexión a la base de datos de MySQL.
 * @param {number} id_revisor - ID del revisor.
 * @param {function} callback - Función de retorno que devuelve el proyecto.
 * @returns {void}
 */
function proyectoarevisar(connection, id_revisor, callback) {
    const sql = 'SELECT * FROM proyecto WHERE ID_REVISOR = ? AND ESTADO="Revisado"';
    connection.query(sql, [id_revisor], (err, results) => {
        if (err) {
            console.error('❌ Error al obtener proyectos a revisar:', err);
            return callback(err);
        }
        callback(null, results);
    });
}

/**
 * @description Registra los criterios de revisión de un proyecto y lo actualiza a estado "En espera".
 * @param {object} connection - Objeto de conexión a la base de datos de MySQL.
 * @param {object} data - Objeto con los datos de los criterios de revisión y el ID del revisor y proyecto.
 * @param {function} callback - Función de retorno que se ejecuta al finalizar la operación.
 * @returns {void}
 */
function proyectoRevisado(connection, data, callback) {
    // 1. Inserta los criterios de revisión en la tabla `criterios`.
    const insertsql = "INSERT INTO `criterios`(`ID_PROYECTO`, `RELACION`, `EXTENSION`, `DISENO`, `RIESGOS`, `FORMA`, `ANALISIS`, `RECOMENDACIONES`, `ID_REVISOR`) VALUES (?,?,?,?,?,?,?,?,?)";
    connection.query(insertsql, [data.id_proyecto, data.relacion, data.extension, data.diseno, data.riesgos, data.forma, data.analisis, data.recomendaciones, data.id_revisor], (err) => {
        if (err) {
            console.error('❌ Error al insertar los criterios de revisión:', err);
            return callback(err);
        }
        
        // 2. Actualiza el estado del proyecto a "En espera".
        const updatesql = "UPDATE proyecto SET ESTADO='En espera' WHERE ID_PROYECTO=?";
        connection.query(updatesql, [data.id_proyecto], (updateErr) => {
            if (updateErr) {
                console.error('❌ Error al actualizar estado del proyecto a "En espera":', updateErr);
                return callback(updateErr);
            }

            // 3. Libera al revisor, desasociando el ID del proyecto de su perfil.
            const updateRevisorSql = 'UPDATE usuarios SET ID_PROYECTO = NULL WHERE ID_USUARIO = ?';
            connection.query(updateRevisorSql, [data.id_revisor], (updateRevisorErr) => {
                if (updateRevisorErr) {
                    console.error('❌ Error al liberar al revisor:', updateRevisorErr);
                    return callback(updateRevisorErr);
                }
                
                console.log('✅ Proceso de revisión finalizado correctamente. Revisor liberado.');
                callback(null, { success: true, message: '✔️ Proceso de revisión completado.' });
            });
        });
    });
}

// ---
// ## Exportación de Módulos

// Se exportan las funciones para que puedan ser utilizadas en otros archivos del proyecto.
module.exports = { obtenerProyectos, asignarRevisor, revisorActivo, proyectoarevisar, proyectoRevisado };