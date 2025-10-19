// Importa el módulo de MySQL.
const mysql = require("mysql");

/**
 * @description Obtiene todos los proyectos que están en estado "En espera" junto con sus criterios asociados.
 * @param {object} connection - Objeto de conexión a la base de datos de MySQL.
 * @param {function} callback - Función de retorno (callback) que se ejecuta al finalizar la consulta.
 * @returns {void}
 */
function proyectosEnEspera(connection, callback) {
    // 1. Obtiene los proyectos con estado "En espera".
    const sql = "SELECT * FROM proyecto WHERE estado = 'En espera'";

    connection.query(sql, (err, result) => {
        // Manejo de errores en la primera consulta.
        if (err) {
            console.error('❌ Error al obtener proyectos en espera:', err);
            return callback(err); // Devolvemos el error en el callback.
        }

        // Si no se encuentran resultados, se maneja de forma explícita.
        if (!result || result.length === 0) {
            console.warn('⚠️ No hay proyectos en espera.'); // Cambio a 'warn' ya que no es un error crítico.
            // Se envía un objeto de error para mayor claridad en el cliente.
            return callback(null, { error: '❌ No hay proyectos en espera' });
        }

        // 2. Extrae los IDs de los proyectos para la siguiente consulta.
        const ids = result.map(proyecto => proyecto.ID_PROYECTO);
        const criterioSql = "SELECT * FROM criterios WHERE ID_PROYECTO IN (?)";

        // 3. Obtiene los criterios correspondientes a los IDs de los proyectos.
        connection.query(criterioSql, [ids], (err, criterios) => {
            // Manejo de errores en la segunda consulta.
            if (err) {
                console.error('❌ Error al obtener los criterios:', err);
                return callback(err);
            }

            // 4. Combina los proyectos con sus criterios asociados.
            const proyectosConCriterios = result.map(proyecto => {
                // Filtra los criterios que corresponden al ID del proyecto actual.
                const criteriosFiltrados = criterios.filter(criterio => criterio.ID_PROYECTO === proyecto.ID_PROYECTO);
                return {
                    ...proyecto,
                    criterios: criteriosFiltrados
                };
            });

            // 5. Devuelve el resultado final en el callback.
            console.log(proyectosConCriterios)
            callback(null, proyectosConCriterios);
        });
    });
}

/**
 * @description Obtiene todos los proyectos que han sido "Aceptados" o "Rechazados" junto con sus criterios.
 * @param {object} connection - Objeto de conexión a la base de datos de MySQL.
 * @param {function} callback - Función de retorno (callback) que se ejecuta al finalizar la consulta.
 * @returns {void}
 */
function proyectosFinalizados(connection, callback) {
    // 1. Obtiene los proyectos con estado "Aceptado" o "Rechazado".
    const sql = 'SELECT * FROM proyecto WHERE (estado = "Aceptado" OR estado = "Rechazado")';

    connection.query(sql, (err, result) => {
        // Manejo de errores en la primera consulta.
        if (err) {
            console.error('❌ Error al obtener proyectos finalizados:', err);
            return callback(err);
        }

        // Si no se encuentran resultados.
        if (!result || result.length === 0) {
            console.warn('⚠️ No hay proyectos finalizados.');
            return callback(null, { error: '❌ No hay proyectos finalizados' });
        }

        // 2. Extrae los IDs de los proyectos.
        const ids = result.map(proyecto => proyecto.ID_PROYECTO);
        const criterioSql = "SELECT * FROM criterios WHERE ID_PROYECTO IN (?)";

        // 3. Obtiene los criterios correspondientes a los IDs.
        connection.query(criterioSql, [ids], (err, criterios) => {
            // Manejo de errores en la segunda consulta.
            if (err) {
                console.error('❌ Error al obtener los criterios:', err);
                return callback(err);
            }

            // 4. Combina los proyectos con sus criterios asociados.
            const proyectosConCriterios = result.map(proyecto => {
                const criteriosFiltrados = criterios.filter(criterio => criterio.ID_PROYECTO === proyecto.ID_PROYECTO);
                return {
                    ...proyecto,
                    criterios: criteriosFiltrados
                };
            });

            // 5. Devuelve el resultado final en el callback.
            //console.log(proyectosConCriterios)
            callback(null, proyectosConCriterios);
        });
    });
}

/**
 * @description Actualiza el estado de un proyecto específico.
 * @param {object} connection - Objeto de conexión a la base de datos de MySQL.
 * @param {number} id_proyecto - ID del proyecto a actualizar.
 * @param {string} status - Nuevo estado para el proyecto.
 * @param {function} callback - Función de retorno (callback) que se ejecuta al finalizar la consulta.
 * @returns {void}
 */
function actualizarEstadoProyecto(connection, id_proyecto, status, callback) {
    const updatesql = "UPDATE proyecto SET ESTADO = ? WHERE ID_PROYECTO = ?";
    connection.query(updatesql, [status, id_proyecto], (err, result) => {
        if (err) {
            console.error('❌ Error al actualizar el estado del proyecto:', err);
            return callback(err);
        }
        // Se envía un mensaje de éxito en el callback.
        callback(null, { mensaje: '✔️ Estado del proyecto actualizado correctamente', result });
    });
}

/**
 * @description Actualiza el permiso de un usuario específico.
 * @param {object} connection - Objeto de conexión a la base de datos de MySQL.
 * @param {number} id_usuario - ID del usuario a actualizar.
 * @param {string} permiso - Nuevo permiso para el usuario.
 * @param {function} callback - Función de retorno (callback) que se ejecuta al finalizar la consulta.
 * @returns {void}
 */
function updateUserStatus(connection, id_usuario, permiso, callback) {
    const sql = "UPDATE usuarios SET PERMISOS = ? WHERE ID_USUARIO = ?";
    connection.query(sql, [permiso, id_usuario], (err, result) => {
        if (err) {
            console.error('❌ Error al actualizar el permiso de usuario:', err);
            return callback(err, { mensaje: '❌ Error al actualizar permiso de usuario' });
        }
        // Se envía un mensaje de éxito en el callback.
        callback(null, { mensaje: '✔️ Permiso de usuario actualizado correctamente', result });
    });
}

/**
 * @description Obtiene la lista de todos los usuarios con su información básica.
 * @param {object} connection - Objeto de conexión a la base de datos de MySQL.
 * @param {function} callback - Función de retorno (callback) que se ejecuta al finalizar la consulta.
 * @returns {void}
 */
function getUsers(connection, callback) {
    const sql = "SELECT ID_USUARIO, NOMBRE, APELLIDOS, CORREO, PERMISOS FROM usuarios";
    connection.query(sql, (err, result) => {
        if (err) {
            console.error('❌ Error al obtener los usuarios:', err);
            return callback(err);
        }
        callback(null, result);
    });
}

/**
 * @description Actualiza la contraseña de un usuario encriptándola con SHA256.
 * @param {object} connection - Objeto de conexión a la base de datos de MySQL.
 * @param {number} id_usuario - ID del usuario a quien se le cambiará la contraseña.
 * @param {string} newPassword - La nueva contraseña en texto plano.
 * @param {function} callback - Función de retorno (callback) que se ejecuta al finalizar la consulta.
 * @returns {void}
 */
function cambioPassword(connection, id_usuario, newPassword, callback) {
    const sql = "UPDATE usuarios SET PASSWORD = SHA2(?, 256) WHERE ID_USUARIO = ?";
    connection.query(sql, [newPassword, id_usuario], (err, result) => {
        if (err) {
            console.error('❌ Error al cambiar la contraseña:', err);
            return callback(err);
        }
        // Se envía un mensaje de éxito en el callback.
        callback(null, { mensaje: '✔️ Contraseña actualizada correctamente', result });
    });
}

// Exporta las funciones para que puedan ser utilizadas en otros módulos.
module.exports = { proyectosEnEspera, actualizarEstadoProyecto, updateUserStatus, getUsers, proyectosFinalizados, cambioPassword };