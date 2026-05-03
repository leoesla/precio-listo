const express = require('express');
const cors = require('cors');
const path = require('path'); // <-- NUEVO: Herramienta para manejar rutas de carpetas
const mysql = require('mysql2'); // <-- NUEVO: Importamos la herramienta de MySQL


const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = '1064703567271-a1fml4812297kedrj8qtjoq1l3l4ags2.apps.googleusercontent.com';
const googleClient = new OAuth2Client(CLIENT_ID);


const app = express();
const PORT = 3000;

app.use(cors()); 
app.use(express.json()); 

// --- NUEVO: Servir los archivos del frontend ---
// Le decimos a Node que exponga públicamente la carpeta "frontend"
app.use(express.static(path.join(__dirname, '../frontend')));


// --- CONEXIÓN A BASE DE DATOS MYSQL ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // Usuario por defecto en XAMPP
    password: '',      // Contraseña por defecto (vacía)
    database: 'precio_listo' // Asegúrate de que este sea el nombre exacto de tu BD
});

db.connect((error) => {
    if (error) {
        console.error('❌ Error conectando a MySQL:', error);
        return;
    }
    console.log('✅ ¡Conectado exitosamente a la base de datos MySQL!');

    // Creamos la tabla de usuarios automáticamente si no existe
    const crearTablaUsuarios = `
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            google_id VARCHAR(255) UNIQUE NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            foto_perfil VARCHAR(255),
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.query(crearTablaUsuarios, (error, resultado) => {
        if (error) {
            console.error('❌ Error verificando la tabla usuarios:', error);
        } else {
            console.log('✅ Tabla de usuarios lista y operativa.');
        }
    });
});





// ... (Aquí abajo sigue tu Base de Datos Simulada y tus Rutas de /api/productos que ya tenías) ...

// --- BASE DE DATOS SIMULADA ---
// (Más adelante, estos datos los extraeremos con Web Scraping de las tiendas reales)
const listaDeProductos = [
    {
        id: 1,
        nombre: "Smartphone Samsung Galaxy A54 5G",
        imagen: "https://placehold.co/400x400/eeeeee/333333?text=Foto+Celular",
        precios: [
            { tienda: "Falabella", monto: "S/ 1,399" },
            { tienda: "Ripley", monto: "S/ 1,419" }
        ],
        etiqueta: "Mejor precio"
    },
    {
        id: 2,
        nombre: "Laptop HP Pavilion 15.6 pulgadas Intel Core i5",
        imagen: "https://placehold.co/400x400/eeeeee/333333?text=Foto+Laptop",
        precios: [
            { tienda: "Curacao", monto: "S/ 2,499" },
            { tienda: "Hiraoka", monto: "S/ 2,550" }
        ],
        etiqueta: "Mejor precio"
    }
];

// --- RUTAS (API) ---

// Ruta de prueba (la que ya tenías)
app.get('/', (req, res) => {
    res.send('¡El motor de Precio Listo está funcionando perfectamente!');
});

// NUEVA RUTA: Aquí el frontend vendrá a pedir la lista de productos
app.get('/api/productos', (req, res) => {
    res.json(listaDeProductos); // Enviamos los datos en formato JSON
});


// NUEVA RUTA: Recibe el Token de Google, lo valida y guarda al usuario
app.post('/api/login', async (req, res) => {
    const { token } = req.body; // Recibimos el token que nos manda el frontend

    try {
        // 1. Le pedimos a Google que desencripte y valide el token
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload(); // Aquí vienen los datos limpios!

        const googleId = payload['sub'];
        const nombre = payload['name'];
        const email = payload['email'];
        const foto = payload['picture'];

        // 2. Buscamos si el usuario ya existe en nuestra base de datos MySQL
        const queryBuscar = 'SELECT * FROM usuarios WHERE google_id = ?';
        db.query(queryBuscar, [googleId], (err, resultados) => {
            if (err) return res.status(500).json({ error: 'Error en la base de datos' });

            if (resultados.length > 0) {
                // 3a. El usuario ya existe, simplemente lo dejamos pasar
                console.log(`Usuario existente ha vuelto a entrar: ${nombre}`);
                res.json({ mensaje: 'Login exitoso', usuario: resultados[0] });
            } else {
                // 3b. El usuario es NUEVO. Lo guardamos en la tabla de MySQL
                const queryInsertar = 'INSERT INTO usuarios (google_id, nombre, email, foto_perfil) VALUES (?, ?, ?, ?)';
                db.query(queryInsertar, [googleId, nombre, email, foto], (err, resultadoInsert) => {
                    if (err) return res.status(500).json({ error: 'Error guardando usuario' });

                    console.log(`¡NUEVO usuario registrado!: ${nombre}`);
                    res.json({ mensaje: 'Usuario registrado exitosamente', usuario: { nombre, email, foto } });
                });
            }
        });

    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
});

// --- ENCENDIDO DEL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor de Precio Listo corriendo en http://localhost:${PORT}`);
});
