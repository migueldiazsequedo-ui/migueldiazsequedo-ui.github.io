# Informe técnico — Mineral Trading Dashboard

## 1. Introducción

Mineral Trading Dashboard es una aplicación web frontend que simula una plataforma de trading de minerales con estética de dashboard financiero. Está diseñada para ejecutarse sin backend, usando únicamente HTML5, CSS3, JavaScript ES6+ y Chart.js como librería externa.

## 2. Objetivos

- Construir una aplicación funcional sin backend.
- Simular una experiencia de trading de minerales con interfaz moderna.
- Integrar APIs externas mediante `fetch()`.
- Aplicar POO con clases de responsabilidad única.
- Mantener persistencia local con `localStorage`.
- Incorporar filtros técnicos, carrito, stock, gráfico y tema dinámico.

## 3. Tecnologías utilizadas

- HTML5
- CSS3
- JavaScript ES6+
- Chart.js
- Open-Meteo
- exchangerate.host
- GoldPrice
- MetalPriceAPI

## 4. Arquitectura del software

- `index.html`: estructura semántica del dashboard.
- `css/styles.css`: estilos globales, componentes y temas.
- `js/data.js`: configuración y dataset inicial.
- `js/models.js`: modelos de dominio.
- `js/storage.js`: persistencia con `localStorage`.
- `js/api.js`: servicios externos de clima, mercado y divisas.
- `js/charts.js`: encapsulación de Chart.js.
- `js/ui.js`: renderizado y modales.
- `js/app.js`: orquestación general.

## 5. Aplicación de POO

### `Mineral`
Representa un mineral con propiedades de mercado, stock e histórico.

### `CurrencyConverter`
Gestiona conversión de divisas y formateo monetario.

### `ShoppingCart`
Administra la cartera, cantidades, subtotales, impuestos y comisiones.

### `StorageManager`
Aísla la lectura y escritura de `localStorage`.

### `WeatherService`
Gestiona la geolocalización y la obtención del clima.

### `MarketService`
Gestiona proveedores de precios y fallbacks.

### `ChartManager`
Encapsula el gráfico histórico.

### `UIManager`
Se ocupa del renderizado y de la interacción con el DOM.

## 6. Integración de APIs

### Clima
Se usa Open-Meteo para obtener el tiempo actual según geolocalización. Si falla, se usa Madrid por defecto.

### Divisas
Se usa exchangerate.host. Si el endpoint falla o requiere clave no configurada, se usan tasas de respaldo.

### Mercado
Se intenta primero GoldPrice. Si no está configurada o falla, se usa MetalPriceAPI. Si un proveedor no cubre todos los minerales, los símbolos faltantes se completan con valores simulados, y se informa al usuario.

## 7. Gráfico histórico con Chart.js

Se usa un gráfico de líneas para mostrar la evolución de precios de los últimos 7 días. Si no hay datos históricos reales, se genera una serie sintética coherente a partir del precio actual.

## 8. Gestión del inventario

Cada mineral tiene stock limitado y un stock original. Al añadir al carrito, el stock disminuye. Al eliminar, se restaura. Se muestran estados visuales: disponible, stock bajo y agotado.

## 9. Persistencia con localStorage

Se guarda:

- cartera
- moneda seleccionada
- subtotales y totales
- fecha de actualización
- stock actual
- tema

Todo se restaura al recargar la página.

## 10. Cálculo de impuestos y comisiones

- Impuesto fijo del 21%.
- Comisión:
  - 1% compras pequeñas
  - 2% compras medias
  - 3% compras grandes

## 11. Buscador predictivo y filtros

Incluye:

- búsqueda por nombre y símbolo
- sugerencias predictivas
- filtro por dureza Mohs
- filtro por sistema cristalino
- filtro por valor de mercado
- orden por nombre, precio o dureza

Se usan `filter()`, `map()`, `reduce()` y `sort()` de forma real.

## 12. Modo oscuro dinámico

La interfaz usa variables CSS y guarda el tema elegido en `localStorage`.

## 13. Manejo de errores

Se implementa mediante modales visuales para:

- errores de red
- fallos de API
- geolocalización no disponible
- errores en `localStorage`
- cobertura parcial de precios
- fallos totales de mercado

## 14. Decisiones de diseño UI/UX

Se adoptó un diseño tipo dashboard financiero con:

- header superior
- ticker animado
- tarjetas informativas
- panel lateral fijo
- modo oscuro elegante
- responsive design

## 15. Limitaciones

- Sin backend, las API keys quedan expuestas si se usan en producción.
- Algunos proveedores no cubren todos los minerales del dataset.
- El histórico es sintético si no hay acceso a datos históricos reales.

## 16. Mejoras futuras

- Watchlists
- Alertas de precio
- Exportación PDF/CSV
- Más minerales
- Comparador de activos
- Service Worker
- Datos históricos reales

## 17. Conclusión

La aplicación cumple los requisitos principales del proyecto: frontend puro, diseño profesional, APIs externas, persistencia local, POO real, control de inventario, filtros técnicos, gráfico histórico y manejo de errores visible.