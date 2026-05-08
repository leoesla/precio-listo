const puppeteer = require('puppeteer');

async function extraerLaptops() {
    console.log("🤖 Robot: Iniciando búsqueda en la sombra...");
    
    // 1. Lo ponemos en headless: false para ver qué está pasando y parecer un navegador real
    const browser = await puppeteer.launch({ headless: false }); 
    const page = await browser.newPage();

    // 2. EL DISFRAZ: Le decimos a la tienda que somos un usuario humano usando Chrome en Windows
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 3. Viajamos a la página de Mercado Libre
    await page.goto('https://listado.mercadolibre.com.pe/laptop', { waitUntil: 'networkidle2' });
    
    // 4. Esperamos a que carguen las tarjetas de los productos
    await page.waitForSelector('.ui-search-result__wrapper');

    const productosExtraidos = await page.evaluate(() => {
        const cajasDeProductos = document.querySelectorAll('.ui-search-result__wrapper');
        const resultados = [];

        // Extraeremos los 6 primeros productos
        for (let i = 0; i < 6; i++) {
            if (cajasDeProductos[i]) {
                const titulo = cajasDeProductos[i].querySelector('.ui-search-item__title, .poly-component__title, h2')?.innerText || 'Laptop';
                const precio = cajasDeProductos[i].querySelector('.andes-money-amount__fraction')?.innerText || '0';
                
                const imagenElemento = cajasDeProductos[i].querySelector('img');
                const imagen = imagenElemento ? (imagenElemento.getAttribute('src') || imagenElemento.getAttribute('data-src')) : 'https://placehold.co/400x400?text=Sin+Imagen';

                // NUEVO: Buscamos la etiqueta "a" (enlace) y extraemos su atributo "href"
                const enlaceElemento = cajasDeProductos[i].querySelector('a');
                const enlaceReal = enlaceElemento ? enlaceElemento.getAttribute('href') : '#';

                resultados.push({ 
                    id: i + 1,
                    nombre: titulo, 
                    imagen: imagen,
                    enlace: enlaceReal, // <-- Agregamos el enlace aquí
                    precios: [
                        { tienda: "Mercado Libre", monto: `S/ ${precio}` }
                    ],
                    etiqueta: "Precio Real"
                });
            }
        }
        return resultados;
    });

    // 5. Cerramos el navegador del robot una vez extraídos los datos
    await browser.close();
    console.log("✅ Robot: Búsqueda completada.");
    
    return productosExtraidos; // En lugar de imprimir, DEVOLVEMOS los datos a server.js
}

// Exportamos la función para usarla en server.js
module.exports = { extraerLaptops };
