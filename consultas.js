const mysql =require("mysql");

function validarCuenta(connection, numemp, contrasena, callback) {
    //console.log("Validando cuenta:", numemp);
    // Consulta que compara el hash SHA-256 de la contraseña proporcionada
    const query = `
        SELECT * FROM \`encargado\` 
        WHERE \`num_emp\` = ? 
        AND \`contrasena\` = SHA2(?, 256)
    `;
    const values = [numemp, contrasena];
    
    connection.query(query, values, (err, results) => {
        if (err) {
            console.error("Error en la consulta:", err);
            return callback({ error: "Error en la consulta", detalles: err.message });
        }
        if (results.length === 0) {
            return callback({ error: "Credenciales inválidas" });
        }
        
        // Devuelve solo los datos necesarios, excluyendo la contraseña
        const usuario = {
            num_emp: results[0].num_emp,
            nombre: results[0].nombre,
            userLevel: results[0].tipo_cuenta,
        };        
        //console.log("Cuenta validada:", usuario.num_emp);
        callback(null, usuario);
    });
}

module.exports={validarCuenta};