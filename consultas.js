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

module.exports={validarCuenta, crearUsuario};