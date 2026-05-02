# Estructura de la Base de Datos: Precio Listo

## Tabla 1: usuarios
(Para guardar a quienes inician sesión con Google)
- id_usuario (Clave Primaria, Autoincremental)
- google_email (Texto, Único)
- fecha_registro (Fecha)

## Tabla 2: productos
(Para almacenar lo que extraemos con Web Scraping)
- id_producto (Clave Primaria, Autoincremental)
- nombre_producto (Texto)
- precio_actual (Decimal)
- tienda_origen (Texto - ej: "Falabella", "Ripley")
- url_imagen (Texto)
- url_tienda (Texto - El enlace para redirigir)
- ultima_actualizacion (Fecha)

## Tabla 3: favoritos
(Para relacionar qué usuario guardó qué producto y poder enviarle correos)
- id_favorito (Clave Primaria, Autoincremental)
- id_usuario (Clave Foránea -> usuarios)
- id_producto (Clave Foránea -> productos)
