import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAdzgsjcZN9XvT90Sh_cQBrw6LDBgVXYUU",
  authDomain: "mi-fereteria.firebaseapp.com",
  projectId: "mi-fereteria",
  storageBucket: "mi-fereteria.firebasestorage.app",
  messagingSenderId: "193372596401",
  appId: "1:193372596401:web:344cb9136c556ea3399a90"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let carrito = JSON.parse(localStorage.getItem('carritoFerreteria')) || [];
let productosGlobal = [];
let productoSeleccionadoActual = null;
let cantidadTemporal = 1;
let categoriaActual = 'Todas';

async function cargarProductosDesdeDB() {
    const contenedor = document.getElementById('lista-productos');
    contenedor.innerHTML = '<p style="text-align:center; grid-column: span 2;">Cargando productos...</p>';

    try {
        const querySnapshot = await getDocs(collection(db, "productos"));
        productosGlobal = [];
        querySnapshot.forEach((doc) => {
            productosGlobal.push({ id: doc.id, ...doc.data() });
        });

        generarCategorias();
        filtrarProductos(); 
        actualizarCarrito();
    } catch (error) {
        console.error("Error al cargar: ", error);
        contenedor.innerHTML = `<p style="text-align:center; color:red; grid-column: span 2;">ERROR: ${error.message}</p>`;
    }
}

function generarCategorias() {
    const contenedorCat = document.getElementById('botones-categorias');
    const categorias = ['Todas', ...new Set(productosGlobal.map(p => p.categoria).filter(Boolean))];
    
    contenedorCat.innerHTML = categorias.map(cat => 
        `<button class="${cat === categoriaActual ? 'activa' : ''}" onclick="cambiarCategoria('${cat}')">${cat}</button>`
    ).join('');
}

function cambiarCategoria(cat) {
    categoriaActual = cat;
    generarCategorias(); 
    filtrarProductos();
}

function filtrarProductos() {
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    
    const filtrados = productosGlobal.filter(p => {
        const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda);
        const coincideCategoria = categoriaActual === 'Todas' || p.categoria === categoriaActual;
        return coincideBusqueda && coincideCategoria;
    });

    mostrarProductos(filtrados);
}

function mostrarProductos(productos) {
    const contenedor = document.getElementById('lista-productos');
    contenedor.innerHTML = '';

    if (productos.length === 0) {
        contenedor.innerHTML = '<p style="grid-column: span 2; text-align:center;">No se encontraron productos.</p>';
        return;
    }

    productos.forEach(producto => {
        const div = document.createElement('div');
        div.classList.add('tarjeta-producto');
        div.onclick = () => abrirDetalles(producto);
        
        let etiquetasHTML = '';
        if (producto.precioAnterior) etiquetasHTML += `<span class="etiqueta tag-oferta">OFERTA</span>`;
        if (producto.masVendido) etiquetasHTML += `<span class="etiqueta tag-vendido">MÁS VENDIDO</span>`;

        let simbolo = producto.moneda === "MN" ? "MN " : "$";

        let precioHTML = `<span class="precio">${simbolo}${producto.precio.toFixed(2)}</span>`;
        if (producto.precioAnterior) {
            precioHTML = `<span class="precio" style="color:#d9534f;">${simbolo}${producto.precio.toFixed(2)} <span style="font-size:12px; text-decoration:line-through; color:#999;">${simbolo}${producto.precioAnterior.toFixed(2)}</span></span>`;
        }

        const fotoPrincipal = producto.imagenes && producto.imagenes.length > 0 ? producto.imagenes[0] : "https://via.placeholder.com/400?text=Sin+Foto";

        div.innerHTML = `
            ${etiquetasHTML}
            <img src="${fotoPrincipal}" alt="${producto.nombre}">
            <div class="info-producto">
                <h3>${producto.nombre}</h3>
                ${precioHTML}
                <button class="btn-comprar" onclick="event.stopPropagation(); agregarAlCarritoRapido('${producto.id}')">Añadir</button>
            </div>
        `;
        contenedor.appendChild(div);
    });
}

function abrirDetalles(producto) {
    productoSeleccionadoActual = producto;
    cantidadTemporal = 1;
    document.getElementById('cantidad-detalle').innerText = cantidadTemporal;

    document.getElementById('detalle-nombre').innerText = producto.nombre;
    
    let simbolo = producto.moneda === "MN" ? "MN " : "$";
    
    let precioHTML = `${simbolo}${producto.precio.toFixed(2)}`;
    if (producto.precioAnterior) {
        precioHTML += ` <span style="font-size:16px; text-decoration:line-through; color:#999;">${simbolo}${producto.precioAnterior.toFixed(2)}</span>`;
    }
    document.getElementById('detalle-precio').innerHTML = precioHTML;
    document.getElementById('detalle-descripcion').innerText = producto.descripcion || "Sin descripción.";

    const carrusel = document.getElementById('carrusel-imagenes');
    const indicadores = document.getElementById('indicadores-carrusel');
    const contadorFotos = document.getElementById('contador-fotos');
    
    carrusel.innerHTML = '';
    indicadores.innerHTML = '';

    if (producto.imagenes && producto.imagenes.length > 0) {
        producto.imagenes.forEach((img, index) => {
            carrusel.innerHTML += `<img src="${img}" alt="${producto.nombre}">`;
            // Creamos los puntitos
            const dot = document.createElement('div');
            dot.style.width = '8px';
            dot.style.height = '8px';
            dot.style.borderRadius = '50%';
            dot.style.backgroundColor = index === 0 ? '#ffffff' : 'rgba(255,255,255,0.5)';
            dot.style.transition = '0.3s';
            dot.dataset.index = index;
            indicadores.appendChild(dot);
        });

        // Lógica del contador y puntitos al deslizar
        if (producto.imagenes.length > 1) {
            contadorFotos.style.display = 'block';
            contadorFotos.innerText = `1 / ${producto.imagenes.length}`;

            // Escuchar el scroll del carrusel
            carrusel.onscroll = () => {
                const ancho = carrusel.clientWidth;
                const scroll = carrusel.scrollLeft;
                const index = Math.round(scroll / ancho);
                
                // Actualizar contador
                contadorFotos.innerText = `${index + 1} / ${producto.imagenes.length}`;
                
                // Actualizar puntitos
                Array.from(indicadores.children).forEach((dot, i) => {
                    dot.style.backgroundColor = i === index ? '#ffffff' : 'rgba(255,255,255,0.5)';
                });
            };
        } else {
            // Si solo hay una foto, ocultamos los controles
            contadorFotos.style.display = 'none';
            indicadores.style.display = 'none';
        }
    } else {
        carrusel.innerHTML = `<img src="https://via.placeholder.com/400?text=Sin+Foto" alt="Sin foto">`;
        contadorFotos.style.display = 'none';
        indicadores.style.display = 'none';
    }

    document.getElementById('modal-producto').classList.add('activo');
}

function cambiarCantidadDetalle(cambio) {
    if (cantidadTemporal + cambio >= 1) {
        cantidadTemporal += cambio;
        document.getElementById('cantidad-detalle').innerText = cantidadTemporal;
    }
}

function agregarDesdeDetalles() {
    agregarAlCarrito(productoSeleccionadoActual.id, cantidadTemporal);
    cerrarDetalles();
}

function agregarAlCarritoRapido(id) {
    agregarAlCarrito(id, 1);
}

function agregarAlCarrito(id, cantidad) {
    const producto = productosGlobal.find(p => p.id === id);
    const itemEnCarrito = carrito.find(item => item.id === id);

    if (itemEnCarrito) {
        itemEnCarrito.cantidad += cantidad;
    } else {
        carrito.push({ ...producto, cantidad: cantidad });
    }
    actualizarCarrito();
    mostrarNotificacion();
}

function actualizarCarrito() {
    localStorage.setItem('carritoFerreteria', JSON.stringify(carrito));

    const lista = document.getElementById('lista-carrito');
    const contador = document.getElementById('contador-carrito');
    const totalPrecio = document.getElementById('total-precio');
    lista.innerHTML = '';
    
    let totalUSD = 0;
    let totalMN = 0;
    let totalItems = 0;

    carrito.forEach((item, index) => {
        let simbolo = item.moneda === "MN" ? "MN " : "$";
        
        const li = document.createElement('li');
        li.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="flex: 1;"><strong>${item.nombre}</strong><br><span style="font-size: 12px; color: #666;">${simbolo}${item.precio.toFixed(2)} c/u</span></div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <button onclick="cambiarCantidadCarrito(${index}, -1)">-</button>
                    <span style="font-weight: bold;">${item.cantidad}</span>
                    <button onclick="cambiarCantidadCarrito(${index}, 1)">+</button>
                    <button class="btn-borrar" onclick="eliminarProductoCarrito(${index})">🗑️</button>
                </div>
            </div>
        `;
        lista.appendChild(li);
        
        if (item.moneda === "MN") {
            totalMN += item.precio * item.cantidad;
        } else {
            totalUSD += item.precio * item.cantidad;
        }
        totalItems += item.cantidad;
    });

    contador.innerText = totalItems;
    
    let textoTotal = "";
    if (totalUSD > 0) textoTotal += `<div>$${totalUSD.toFixed(2)}</div>`;
    if (totalMN > 0) textoTotal += `<div>MN ${totalMN.toFixed(2)}</div>`; // Corregido un pequeño typo aquí
    if (totalUSD === 0 && totalMN === 0) textoTotal = "<div>0.00</div>";

    totalPrecio.innerHTML = textoTotal;
}

function cambiarCantidadCarrito(index, cambio) {
    carrito[index].cantidad += cambio;
    if (carrito[index].cantidad <= 0) carrito.splice(index, 1);
    actualizarCarrito();
}

function eliminarProductoCarrito(index) { carrito.splice(index, 1); actualizarCarrito(); }

function abrirCarrito() { document.getElementById('modal-carrito').classList.add('activo'); }
function cerrarCarrito() { document.getElementById('modal-carrito').classList.remove('activo'); }
function cerrarDetalles() { document.getElementById('modal-producto').classList.remove('activo'); }

window.onclick = function(event) {
    const modalProd = document.getElementById('modal-producto');
    const modalCart = document.getElementById('modal-carrito');
    if (event.target === modalProd) cerrarDetalles();
    if (event.target === modalCart) cerrarCarrito();
}

function mostrarNotificacion() {
    const notificacion = document.getElementById("notificacion");
    notificacion.classList.add("mostrar");
    setTimeout(() => notificacion.classList.remove("mostrar"), 2000);
}

function enviarWhatsApp() {
    const nombre = document.getElementById('nombre-cliente').value.trim();
    const direccion = document.getElementById('direccion-cliente').value.trim();

    if (carrito.length === 0) { alert("Tu carrito está vacío."); return; }
    if (nombre === "" || direccion === "") { alert("Por favor, ingresa tu nombre y dirección."); return; }

    let mensaje = `*NUEVO PEDIDO* %0A%0A*Cliente:* ${nombre}%0A*Dirección:* ${direccion}%0A%0A*Productos:*%0A`;
    let totalUSD = 0;
    let totalMN = 0;

    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        const simbolo = item.moneda === "MN" ? "MN " : "$";
        
        if (item.moneda === "MN") {
            totalMN += subtotal;
        } else {
            totalUSD += subtotal;
        }

        const textoCodigo = item.codigo ? ` [Ref: ${item.codigo}]` : "";
        mensaje += `- ${item.cantidad}x ${item.nombre}${textoCodigo} = ${simbolo}${subtotal.toFixed(2)}%0A`;
    });

    mensaje += `%0A*Total a Pagar:*%0A`;
    if (totalUSD > 0) mensaje += `- $${totalUSD.toFixed(2)} USD%0A`;
    if (totalMN > 0) mensaje += `- ${totalMN.toFixed(2)} MN%0A`;
    
    const miNumero = "5351832765"; 
    window.open(`https://wa.me/${miNumero}?text=${mensaje}`, '_blank');
}

window.abrirCarrito = abrirCarrito;
window.cerrarCarrito = cerrarCarrito;
window.cerrarDetalles = cerrarDetalles;
window.cambiarCantidadDetalle = cambiarCantidadDetalle;
window.cambiarCantidadCarrito = cambiarCantidadCarrito;
window.eliminarProductoCarrito = eliminarProductoCarrito;
window.agregarAlCarritoRapido = agregarAlCarritoRapido;
window.cambiarCategoria = cambiarCategoria;
window.filtrarProductos = filtrarProductos;
window.enviarWhatsApp = enviarWhatsApp;

document.getElementById('btn-add-detalles').onclick = agregarDesdeDetalles;

cargarProductosDesdeDB();
