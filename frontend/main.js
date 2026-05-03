// Esperamos a que cargue la ventana para inicializar Google
window.onload = function () {
    // 1. Inicializar el sistema de autenticación de Google
    google.accounts.id.initialize({
        client_id: "1064703567271-a1fml4812297kedrj8qtjoq1l3l4ags2.apps.googleusercontent.com",
        callback: manejarRespuestaGoogle
    });

    // 2. Dibujar el botón en el contenedor que dejamos en el HTML
    google.accounts.id.renderButton(
        document.getElementById("googleBtnContainer"),
        { theme: "outline", size: "large", shape: "pill" } // Estilo del botón
    );

    // 3. Ejecutar nuestra función para traer los productos
    obtenerProductos();
};

// Función que se dispara mágicamente cuando el usuario inicia sesión con éxito
function manejarRespuestaGoogle(respuesta) {
    // Google nos devuelve un "Token" (un código encriptado con los datos del usuario)
    console.log("Token de seguridad recibido de Google:", respuesta.credential);
    alert("¡Sesión iniciada con éxito! Revisa la consola de desarrollador para ver tu Token.");
}

// Función asíncrona para buscar los datos
async function obtenerProductos() {
    try {
        // 1. Llamamos a nuestra API (el backend)
        const respuesta = await fetch('http://localhost:3000/api/productos');
        const productos = await respuesta.json(); // Convertimos la respuesta a JSON

        // 2. Seleccionamos la grilla vacía de nuestro HTML
        const contenedor = document.getElementById('contenedor-productos');
        contenedor.innerHTML = ''; // Limpiamos por seguridad

        // 3. Recorremos cada producto que nos mandó el backend
        productos.forEach(producto => {
            
            // Preparamos los precios dinámicamente
            let preciosHTML = '';
            producto.precios.forEach(precio => {
                preciosHTML += `
                    <div class="price-item">
                        <span class="store">${precio.tienda}</span>
                        <span class="amount">${precio.monto}</span>
                    </div>
                `;
            });

            // Construimos la tarjeta HTML usando los datos del producto
            const tarjetaHTML = `
                <article class="product-card">
                    <button class="fav-btn">🤍</button>
                    <div class="product-image">
                        <img src="${producto.imagen}" alt="${producto.nombre}">
                    </div>
                    <h3 class="product-title">${producto.nombre}</h3>
                    <div class="prices">
                        ${preciosHTML}
                    </div>
                    <span class="badge">${producto.etiqueta}</span>
                    <a href="#" target="_blank" class="store-btn">VER EN TIENDA</a>
                </article>
            `;

            // 4. Inyectamos la tarjeta en el HTML
            contenedor.innerHTML += tarjetaHTML;
        });

    } catch (error) {
        console.error("Error al cargar los productos:", error);
    }
}
