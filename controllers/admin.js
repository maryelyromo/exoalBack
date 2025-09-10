const mysql=require("mysql");

function proyectosEnEspera(connection,callbak){
    const sql='SELECT * FROM proyecto WHERE estado="En espera"';
    connection.query(sql,(err,result)=>{
        if(!result || result.length === 0) {
            //console.error('❌ No hay proyectos en espera');
            return callbak(null, {error: '❌ No hay proyectos en espera' });
        }
        if(err) {
            //console.error('❌ Error al obtener proyectos en espera:', err);
            return callbak(err, {error: '❌ No hay proyectos en espera' });
        }
        const criterio="SELECT * FROM criterios WHERE ID_PROYECTO IN (?)";
        const ids = result.map(proyecto => proyecto.ID_PROYECTO);
        connection.query(criterio, [ids], (err, criterios) => {
            if(err) {
                return callbak(err, {error: '❌ No se pudieron obtener los criterios' });
            }
            const proyectosConCriterios = result.map(proyecto => {
                return {
                    ...proyecto,
                    criterios: criterios.filter(criterio => criterio.ID_PROYECTO === proyecto.ID_PROYECTO)
                };
            });
            callbak(proyectosConCriterios);
        });
    });
}
function proyectosFinalizados(connection,callbak){
    const sql='SELECT * FROM proyecto WHERE estado="Aceptado" OR estado="Rechazado"';
    connection.query(sql,(err,result)=>{
        if(!result || result.length === 0) {
            //console.error('❌ No hay proyectos en espera');
            return callbak(null, {error: '❌ No hay proyectos en espera' });
        }
        if(err) {
            //console.error('❌ Error al obtener proyectos en espera:', err);
            return callbak(err, {error: '❌ No hay proyectos en espera' });
        }
        const criterio="SELECT * FROM criterios WHERE ID_PROYECTO IN (?)";
        const ids = result.map(proyecto => proyecto.ID_PROYECTO);
        connection.query(criterio, [ids], (err, criterios) => {
            if(err) {
                return callbak(err, {error: '❌ No se pudieron obtener los criterios' });
            }
            const proyectosConCriterios = result.map(proyecto => {
                return {
                    ...proyecto,
                    criterios: criterios.filter(criterio => criterio.ID_PROYECTO === proyecto.ID_PROYECTO)
                };
            });
            callbak(proyectosConCriterios);
        });
    });
}
function actualizarEstadoProyecto(connection, id_proyecto, status, callback) {
    const updatesql = "UPDATE proyecto SET ESTADO=? WHERE ID_PROYECTO=?";
    connection.query(updatesql, [status, id_proyecto], (err, result) => {
        if (err) {
            return callback(err);
        }
        callback(null, result);
    });
}
function updateUserStatus(connection, id_usuario, permiso, callback) {
    const sql = "UPDATE usuarios SET PERMISOS=? WHERE ID_USUARIO=?";
    connection.query(sql, [permiso, id_usuario], (err, result) => {
        if (err) {
            return callback(err,{mensaje: '❌ Error al actualizar permiso de usuario'});
        }
        callback(null, {mensaje: '✔️ Permiso de usuario actualizado correctamente', result});
    });
}

function getUsers(connection, callback) {
const sql = "SELECT ID_USUARIO, NOMBRE, APELLIDOS, CORREO, PERMISOS FROM usuarios";
    connection.query(sql, (err, result) => {
        if (err) {
            return callback(err);
        }
        callback(null, result);
    });
}
function cambioPassword(connection, id_usuario, newPassword, callback) {
    const sql = "UPDATE usuarios SET PASSWORD=SHA2(?,256) WHERE ID_USUARIO=?";
    connection.query(sql, [newPassword, id_usuario], (err, result) => {
        if (err) {
            return callback(err);
        }
        callback(null, {mensaje: '✔️ Contraseña actualizada correctamente', result});
    });
}
module.exports={proyectosEnEspera, actualizarEstadoProyecto, updateUserStatus, getUsers, proyectosFinalizados, cambioPassword};