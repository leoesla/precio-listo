const puppeteer = require('puppeteer');

// Ahora la función es genérica y acepta un término de búsqueda (por defecto 'laptop')
async function extraerProductos(termino = 'laptop') {
    console.log(`🤖 Robot: Iniciando búsqueda de "${termino}"...`);
    
    // 1. Iniciamos el navegador (headless: false ayuda a evitar bloqueos iniciales)
    const browser = await puppeteer.launch({ headless: false }); 
    const page = await browser.newPage();

    // 2. EL DISFRAZ: Imprescindible para que Mercado Libre no nos bloquee de inmediato
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 3. CONSTRUIMOS LA URL DINÁMICAMENTE
    // Reemplazamos los espacios por guiones para que la URL sea válida
    const urlBusqueda = `https://listado.mercadolibre.com.pe/${termino.replace(/ /g, '-')}`;
    
    try {
        await page.goto(urlBusqueda, { waitUntil: 'networkidle2' });
        
        // 4. Esperamos a que carguen los resultados
        await page.waitForSelector('.ui-search-result__wrapper', { timeout: 10000 });

        const productosExtraidos = await page.evaluate(() => {
            const cajasDeProductos = document.querySelectorAll('.ui-search-result__wrapper');
            const resultados = [];

            // Extraeremos los 6 primeros productos
            for (let i = 0; i < 6; i++) {
                if (cajasDeProductos[i]) {
                    // Selectores para título, precio, imagen y enlace
                    const titulo = cajasDeProductos[i].querySelector('.ui-search-item__title, .poly-component__title, h2')?.innerText || 'Producto';
                    const precio = cajasDeProductos[i].querySelector('.andes-money-amount__fraction')?.innerText || '0';
                    
                    const imagenElemento = cajasDeProductos[i].querySelector('img');
                    const imagen = imagenElemento ? (imagenElemento.getAttribute('src') || imagenElemento.getAttribute('data-src')) : 'https://placehold.co/400x400?text=Sin+Imagen';

                    const enlaceElemento = cajasDeProductos[i].querySelector('a');
                    const enlaceReal = enlaceElemento ? enlaceElemento.getAttribute('href') : '#';

                    resultados.push({ 
                        id: i + 1,
                        nombre: titulo, 
                        imagen: imagen,
                        enlace: enlaceReal,
                        precios: [
                            { tienda: "Mercado Libre", monto: `S/ ${precio}` }
                        ],
                        etiqueta: "Precio Real"
                    });
                }
            }
            return resultados;
        });

        await browser.close();
        console.log(`✅ Robot: Búsqueda de "${termino}" completada con éxito.`);
        return productosExtraidos;

    } catch (error) {
        console.error("❌ El robot tuvo un problema:", error.message);
        await browser.close();
        return []; // Devolvemos lista vacía para que la app no se caiga
    }
}

// Exportamos la nueva función dinámica
module.exports = { extraerProductos };