const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors()); 
app.use(express.json()); 

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

// --- ENCENDIDO DEL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor de Precio Listo corriendo en http://localhost:${PORT}`);
});
