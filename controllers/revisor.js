const mysql =require("mysql");

function obtenerProyectos(connection, callback) {
    const sql = 'SELECT * FROM proyecto where ESTADO="Pendiente"';
    connection.query(sql, (err, results) => {
        if (err) {
            return callback(err);
        }
        callback(null, results);
    });
}

function asignarRevisor(connection, id_revisor, id_proyecto, callback) {
    const sql = 'SELECT * FROM usuarios WHERE ID_USUARIO = ? AND ID_PROYECTO IS NULL AND PERMISOS = "Revisor"';
    connection.query(sql, [id_revisor], (err, results) => {
        if (err) {
            ////console.error('Error al verificar revisor:', err);
            return callback(err);
        } else {
            if (results.length === 0) {
                return callback(null, { message: '❌ Revisor no disponible' });
            }
            //console.log(results);
            const updateSql = 'UPDATE proyecto SET ID_REVISOR = ? ,ESTADO = "Revisado" WHERE ID_PROYECTO = ?';
            connection.query(updateSql, [id_revisor, id_proyecto], (updateErr, updateResults) => {
                if (updateErr) {
                    ////console.error('Error al asignar revisor:', updateErr);
                    return callback(updateErr);
                }
                const updateRevisorSql = 'UPDATE usuarios SET ID_PROYECTO = ? WHERE ID_USUARIO = ?';
                connection.query(updateRevisorSql, [id_proyecto, id_revisor], (updateRevisorErr, updateRevisorResults) => {
                    if (updateRevisorErr) {
                        //console.error('Error al actualizar revisor:', updateRevisorErr);
                        return callback(updateRevisorErr);
                    }
                    callback(null, true);
                });
            });
        }
    });
}

function revisorActivo(connection, id_revisor, callback) {
    const sql = 'SELECT * FROM usuarios WHERE ID_USUARIO = ? AND ID_PROYECTO IS NULL';

    ////console.log(`🔍 Verificando disponibilidad del revisor con ID: ${id_revisor}`);

    connection.query(sql, [id_revisor], (err, results) => {
        if (err) {
            //console.error('❌ Error al verificar revisor activo:', err);
            return callback(err);
        }

        if (results.length === 0) {
            //console.warn('⚠️ Revisor no disponible (ya tiene proyecto asignado)');
            return callback(null, { disponible: false, message: '❌ Revisor no disponible' });
        }

        //console.log('✅ Revisor disponible:', results[0]);
        callback(null, { disponible: true, message: '✔️ Revisor disponible', data: results[0] });
    });
}

function proyectoarevisar(connection, id_revisor, callback) {
    const sql = 'SELECT * FROM proyecto WHERE ID_REVISOR = ? AND ESTADO="Revisado"';
    connection.query(sql, [id_revisor], (err, results) => {
        if (err) {
            //console.error('❌ Error al obtener proyectos a revisar:', err);
            return callback(err);
        }
        callback(null, results);
    });
}

function proyectoRevisado(connection, data, callback) {
    const insertsql = "INSERT INTO `criterios`(`ID_PROYECTO`, `RELACION`, `EXTENSION`, `DISENO`, `RIESGOS`, `FORMA`, `ANALISIS`, `RECOMENDACIONES`, `ID_REVISOR`) VALUES (?,?,?,?,?,?,?,?,?)";
    connection.query(insertsql, [data.id_proyecto, data.relacion, data.extension, data.diseno, data.riesgos, data.forma, data.analisis, data.recomendaciones, data.id_revisor], (err, results) => {
        if (err) {
            //console.error('❌ Error al obtener proyecto revisado:', err);
            return callback(err);
        }
        const updatesql = "UPDATE proyecto SET ESTADO='En espera' WHERE ID_PROYECTO=?";
        connection.query(updatesql, [data.id_proyecto], (updateErr, updateResults) => {
            if (updateErr) {
                //console.error('❌ Error al actualizar estado de proyecto:', updateErr);
                return callback(updateErr);
            }
            const updateRevisorSql = 'UPDATE usuarios SET ID_PROYECTO = NULL WHERE ID_USUARIO = ?';
            connection.query(updateRevisorSql, [data.id_revisor], (updateRevisorErr, updateRevisorResults) => {
                if (updateRevisorErr) {
                    //console.error('❌ Error al actualizar revisor:', updateRevisorErr);
                    return callback(updateRevisorErr);
                }
                console.log('✅ Revisor actualizado correctamente');
                callback(null, true);
            });
        });
    });
}

module.exports = { obtenerProyectos, asignarRevisor, revisorActivo, proyectoarevisar, proyectoRevisado };