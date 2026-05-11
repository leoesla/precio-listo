const express = require('express');
const cors = require('cors');
const path = require('path'); 
const mysql = require('mysql2'); 

const { extraerProductos } = require('./scraper');

const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = '1064703567271-a1fml4812297kedrj8qtjoq1l3l4ags2.apps.googleusercontent.com';
const googleClient = new OAuth2Client(CLIENT_ID);

const app = express();
const PORT = 3000;

app.use(cors()); 
app.use(express.json()); 

// Servir los archivos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// --- CONEXIÓN E INICIALIZACIÓN DE BASE DE DATOS ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'precio_listo'
});

db.connect((error) => {
    if (error) {
        console.error('❌ Error conectando a MySQL:', error);
        return;
    }
    console.log('✅ ¡Conectado exitosamente a la base de datos MySQL!');

    // Definición de las 5 tablas del modelo lógico
    const sqlUsuarios = `CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        foto_perfil VARCHAR(255),
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    const sqlTiendas = `CREATE TABLE IF NOT EXISTS tiendas (
        id_tienda INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        url_base VARCHAR(255)
    )`;

    const sqlProductos = `CREATE TABLE IF NOT EXISTS productos (
        id_producto INT AUTO_INCREMENT PRIMARY KEY,
        nombre_base VARCHAR(255) NOT NULL,
        categoria VARCHAR(100),
        imagen_url TEXT
    )`;

    const sqlFavoritos = `CREATE TABLE IF NOT EXISTS favoritos (
        id_favorito INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        id_producto INT NOT NULL,
        alerta_activada BOOLEAN DEFAULT TRUE,
        fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
        FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
    )`;

    const sqlHistorial = `CREATE TABLE IF NOT EXISTS historial_precios (
        id_historial INT AUTO_INCREMENT PRIMARY KEY,
        id_producto INT NOT NULL,
        id_tienda INT NOT NULL,
        precio DECIMAL(10,2) NOT NULL,
        url_compra TEXT NOT NULL,
        fecha_captura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
        FOREIGN KEY (id_tienda) REFERENCES tiendas(id_tienda)
    )`;

    // Ejecución secuencial para respetar las dependencias
    db.query(sqlUsuarios, (err) => {
        if (err) return console.error("Error tabla usuarios:", err);
        db.query(sqlTiendas, (err) => {
            if (err) return console.error("Error tabla tiendas:", err);
            db.query(sqlProductos, (err) => {
                if (err) return console.error("Error tabla productos:", err);
                db.query(sqlFavoritos, (err) => {
                    if (err) return console.error("Error tabla favoritos:", err);
                    db.query(sqlHistorial, (err) => {
                        if (err) return console.error("Error tabla historial:", err);
                        console.log('✅ Arquitectura de datos completa y operativa.');
                    });
                });
            });
        });
    });
});

// --- RUTAS (API) ---

app.get('/', (req, res) => {
    res.send('¡El motor de Precio Listo está funcionando perfectamente!');
});

// Ruta para el Robot Puppeteer
app.get('/api/productos', async (req, res) => {
    try {
        const busqueda = req.query.q || 'laptop';
        const productos = await extraerProductos(busqueda);
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: 'Error en el scraping' });
    }
});

// Ruta de Login con Google
app.post('/api/login', async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();

        const googleId = payload['sub'];
        const nombre = payload['name'];
        const email = payload['email'];
        const foto = payload['picture'];

        const queryBuscar = 'SELECT * FROM usuarios WHERE google_id = ?';
        db.query(queryBuscar, [googleId], (err, resultados) => {
            if (err) return res.status(500).json({ error: 'Error en la base de datos' });

            if (resultados.length > 0) {
                console.log(`Usuario ha vuelto: ${nombre}`);
                res.json({ mensaje: 'Login exitoso', usuario: resultados[0] });
            } else {
                const queryInsertar = 'INSERT INTO usuarios (google_id, nombre, email, foto_perfil) VALUES (?, ?, ?, ?)';
                db.query(queryInsertar, [googleId, nombre, email, foto], (err, resInsert) => {
                    if (err) return res.status(500).json({ error: 'Error guardando usuario' });
                    console.log(`¡NUEVO usuario registrado!: ${nombre}`);
                    res.json({ mensaje: 'Usuario registrado', usuario: { nombre, email, foto_perfil: foto } });
                });
            }
        });

    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(401).json({ error: 'Token inválido' });
    }
});

// NUEVA RUTA: Guardar un producto en Favoritos
app.post('/api/favoritos', (req, res) => {
    // Recibimos los datos que nos mandará el botón del corazón
    const { usuario_id, nombre, imagen, enlace } = req.body;

    if (!usuario_id) {
        return res.status(401).json({ error: "Debes iniciar sesión para guardar favoritos" });
    }

    // 1. Buscamos si el producto ya existe en nuestra base de datos general
    const queryBuscarProd = 'SELECT id_producto FROM productos WHERE nombre_base = ?';
    db.query(queryBuscarProd, [nombre], (err, prodResultados) => {
        if (err) return res.status(500).json({ error: 'Error buscando producto' });

        if (prodResultados.length > 0) {
            // 2a. El producto ya existe, saltamos directo a enlazarlo con el usuario
            enlazarFavorito(prodResultados[0].id_producto, usuario_id, res);
        } else {
            // 2b. Es un producto nuevo, lo registramos primero
            const queryInsertarProd = 'INSERT INTO productos (nombre_base, categoria, imagen_url) VALUES (?, ?, ?)';
            db.query(queryInsertarProd, [nombre, 'General', imagen], (err, insertResult) => {
                if (err) return res.status(500).json({ error: 'Error creando producto' });
                // Lo enlazamos usando el nuevo ID que MySQL acaba de crear
                enlazarFavorito(insertResult.insertId, usuario_id, res);
            });
        }
    });
});

// Función auxiliar para conectar al usuario con el producto
function enlazarFavorito(id_producto, id_usuario, res) {
    // Verificamos que no lo haya guardado antes para no duplicar
    const queryCheck = 'SELECT * FROM favoritos WHERE id_usuario = ? AND id_producto = ?';
    db.query(queryCheck, [id_usuario, id_producto], (err, favResultados) => {
        if (favResultados.length > 0) {
            return res.json({ mensaje: 'Este producto ya estaba en tus favoritos 🤍' });
        }

        // Creamos el enlace final en la tabla favoritos
        const queryInsertarFav = 'INSERT INTO favoritos (id_usuario, id_producto) VALUES (?, ?)';
        db.query(queryInsertarFav, [id_usuario, id_producto], (err) => {
            if (err) return res.status(500).json({ error: 'Error guardando en favoritos' });
            res.json({ mensaje: '¡Producto guardado en tus favoritos! ❤️' });
        });
    });
}

app.listen(PORT, () => {
    console.log(`Servidor de Precio Listo corriendo en http://localhost:${PORT}`);
});
