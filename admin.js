import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const auth = getAuth(app);

// --- TU LLAVE DE IMGBB ---
const IMGBB_API_KEY = "d354041f6e2130734c348eb4f0bc0e48";

// --- VERIFICAR LOGIN ---
window.verificarLogin = function() {
    const email = document.getElementById('admin-email').value;
    const pass = document.getElementById('admin-pass').value;
    const errorMsg = document.getElementById('login-error');
    
    errorMsg.style.display = 'none';

    signInWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            // Login exitoso
        })
        .catch((error) => {
            console.error(error);
            errorMsg.innerText = "Correo o contraseña incorrectos.";
            errorMsg.style.display = 'block';
        });
};

// --- OBSERVADOR DE ESTADO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        cargarProductosAdmin();
    } else {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('admin-panel').style.display = 'none';
    }
});

// --- GUARDAR / EDITAR PRODUCTO CON SUBIDA DE FOTOS ---
document.getElementById('form-producto').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('prod-id').value;
    const nombre = document.getElementById('prod-nombre').value;
    const codigo = document.getElementById('prod-codigo').value;
    const categoria = document.getElementById('prod-categoria').value;
    const precio = parseFloat(document.getElementById('prod-precio').value);
    const precioAnteriorVal = document.getElementById('prod-precio-anterior').value;
    const descripcion = document.getElementById('prod-descripcion').value;
    const masVendido = document.getElementById('prod-mas-vendido').checked;
    const moneda = document.getElementById('prod-moneda').value;
    
    const inputFotos = document.getElementById('prod-fotos');
    const archivos = inputFotos.files;

    const btn = document.getElementById('btn-guardar');
    btn.disabled = true;

    try {
        let urlsImagenes = [];

        // Si seleccionó fotos nuevas, las subimos a ImgBB
        if (archivos.length > 0) {
            btn.innerText = "Subiendo fotos (esto puede tardar)...";
            
            for (let i = 0; i < archivos.length; i++) {
                const file = archivos[i];
                const formData = new FormData();
                formData.append('image', file);
                
                const respuesta = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                
                const datos = await respuesta.json();
                
                if (datos.success) {
                    urlsImagenes.push(datos.data.url); 
                } else {
                    console.error("Error subiendo foto:", datos);
                }
            }
        }

        // Si estamos editando y no subió fotos nuevas, conservamos las que ya tenía
        let imagenesFinales = urlsImagenes;
        if (id && urlsImagenes.length === 0) {
            const prodExistente = window.productosAdminGlobal.find(p => p.id === id);
            imagenesFinales = prodExistente ? prodExistente.imagenes : [];
        }

        const datosProducto = {
            nombre,
            codigo,
            categoria,
            precio,
            descripcion,
            imagenes: imagenesFinales,
            masVendido,
            moneda
        };

        if (precioAnteriorVal.trim() !== '') {
            datosProducto.precioAnterior = parseFloat(precioAnteriorVal);
        }

        btn.innerText = "Guardando en base de datos...";

        if (id) {
            const productoRef = doc(db, "productos", id);
            await updateDoc(productoRef, datosProducto);
            alert("¡Producto actualizado exitosamente!");
        } else {
            await addDoc(collection(db, "productos"), datosProducto);
            alert("¡Producto guardado exitosamente!");
        }
        
        cancelarEdicion();
        cargarProductosAdmin();
        
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar. Revisa tu conexión a internet.");
    } finally {
        btn.innerText = "Guardar Producto en Firebase";
        btn.disabled = false;
    }
});

// --- CARGAR PRODUCTOS ---
async function cargarProductosAdmin() {
    const contenedor = document.getElementById('lista-productos-admin');
    contenedor.innerHTML = 'Cargando...';
    
    try {
        const querySnapshot = await getDocs(collection(db, "productos"));
        contenedor.innerHTML = '';
        
        if(querySnapshot.empty) {
            contenedor.innerHTML = '<p>No hay productos aún.</p>';
            return;
        }

        window.productosAdminGlobal = [];

        querySnapshot.forEach((docSnap) => {
            const prod = docSnap.data();
            prod.id = docSnap.id;
            window.productosAdminGlobal.push(prod);

            const div = document.createElement('div');
            div.className = 'item-admin';
            const textCodigo = prod.codigo ? ` [Ref: ${prod.codigo}]` : "";
            div.innerHTML = `
                <div>
                    <strong>${prod.nombre}${textCodigo}</strong> - ${prod.moneda === 'MN' ? 'MN ' : '$'}${prod.precio.toFixed(2)} <br>
                    <small style="color: #666;">${prod.categoria}</small>
                </div>
                <div class="acciones-admin">
                    <button class="btn-editar" onclick="prepararEdicion('${prod.id}')">Editar ✏️</button>
                    <button class="btn-eliminar" onclick="eliminarProducto('${prod.id}')">Eliminar 🗑️</button>
                </div>
            `;
            contenedor.appendChild(div);
        });
    } catch (error) {
        contenedor.innerHTML = '<p style="color:red;">Error al cargar productos.</p>';
    }
}

// --- PREPARAR EDICIÓN ---
window.prepararEdicion = function(id) {
    const producto = window.productosAdminGlobal.find(p => p.id === id);
    
    if (producto) {
        document.getElementById('prod-id').value = producto.id;
        document.getElementById('prod-nombre').value = producto.nombre;
        document.getElementById('prod-codigo').value = producto.codigo || "";
        document.getElementById('prod-categoria').value = producto.categoria;
        document.getElementById('prod-precio').value = producto.precio;
        document.getElementById('prod-precio-anterior').value = producto.precioAnterior || "";
        document.getElementById('prod-descripcion').value = producto.descripcion;
        document.getElementById('prod-mas-vendido').checked = producto.masVendido || false;
        document.getElementById('prod-moneda').value = producto.moneda || "USD";
        
        // Limpiamos el input de fotos al editar
        document.getElementById('prod-fotos').value = "";

        document.getElementById('titulo-formulario').innerText = "Editando Producto";
        document.getElementById('btn-guardar').innerText = "Actualizar Producto";
        document.getElementById('btn-cancelar').style.display = 'block';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// --- CANCELAR EDICIÓN ---
window.cancelarEdicion = function() {
    document.getElementById('form-producto').reset();
    document.getElementById('prod-id').value = "";
    document.getElementById('titulo-formulario').innerText = "Agregar Nuevo Producto";
    document.getElementById('btn-guardar').innerText = "Guardar Producto en Firebase";
    document.getElementById('btn-cancelar').style.display = 'none';
};

// --- ELIMINAR PRODUCTO ---
window.eliminarProducto = async function(id) {
    if(confirm("¿Estás seguro de que quieres eliminar este producto?")) {
        try {
            await deleteDoc(doc(db, "productos", id));
            alert("Producto eliminado");
            cargarProductosAdmin(); 
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("No se pudo eliminar el producto.");
        }
    }
};

// --- CERRAR SESIÓN ---
window.cerrarSesionAdmin = function() {
    signOut(auth).then(() => {
        alert("Sesión cerrada");
    });
};