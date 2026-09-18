import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHl7NavFblYUqlgavovW9xQXZpt9YjeRw",
  authDomain: "to-do-list-nueva.firebaseapp.com",
  projectId: "to-do-list-nueva",
  storageBucket: "to-do-list-nueva.firebasestorage.app",
  messagingSenderId: "43028841455",
  appId: "1:43028841455:web:9d296277f21b54f300ac1a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

enableIndexedDbPersistence(db).catch((err) => {
  console.warn("Persistencia offline no disponible:", err.code);
});

const tareasRef = collection(db, "tareas");

let liEditando = null;
let unsubscribeTareas = null; 

// ---------- Autenticación ----------

document.getElementById('btnLogin').addEventListener('click', () => {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errorBox = document.getElementById('authError');
  errorBox.textContent = '';

  signInWithEmailAndPassword(auth, email, password)
    .catch((error) => {
      errorBox.textContent = traducirErrorAuth(error.code);
    });
});

document.getElementById('btnRegistro').addEventListener('click', () => {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errorBox = document.getElementById('authError');
  errorBox.textContent = '';

  createUserWithEmailAndPassword(auth, email, password)
    .catch((error) => {
      errorBox.textContent = traducirErrorAuth(error.code);
    });
});

document.getElementById('btnLogout').addEventListener('click', () => {
  signOut(auth);
});

function traducirErrorAuth(codigo) {
  const mensajes = {
    'auth/invalid-email': 'Correo inválido.',
    'auth/missing-password': 'Ingresa una contraseña.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.'
  };
  return mensajes[codigo] || 'Ocurrió un error, intenta de nuevo.';
}

// ---------- Reacciona a login / logout ----------

onAuthStateChanged(auth, (usuario) => {
  const overlay = document.getElementById('authOverlay');

  if (usuario) {
    overlay.style.display = 'none';
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authError').textContent = '';

    escucharTareas(usuario.uid);
  } else {
    overlay.style.display = 'flex';
    document.querySelector('#display').innerHTML = '';

    if (unsubscribeTareas) {
      unsubscribeTareas(); 
      unsubscribeTareas = null;
    }
  }
});


function crearElementoTarea(texto, descripcion, id, completada = false) {
  let li = document.createElement('li');
  li.classList.add('tarea');
  if (completada) li.classList.add('completada');
  li.setAttribute('data-id', id);

  let contenedorTexto = document.createElement('div');
  contenedorTexto.classList.add('contenido-tarea');

  let spanTexto = document.createElement('span');
  spanTexto.classList.add('titulo');
  spanTexto.textContent = texto;

  let spanDescripcion = document.createElement('span');
  spanDescripcion.classList.add('descripcion');
  spanDescripcion.textContent = descripcion || '';

  contenedorTexto.appendChild(spanTexto);
  contenedorTexto.appendChild(spanDescripcion);

  let botonCompletar = document.createElement('button');
  botonCompletar.textContent = completada ? 'Deshacer' : 'Completar';
  botonCompletar.classList.add('btn-completar');
  botonCompletar.addEventListener('click', () => completarTarea(li, botonCompletar));

  let botonEditar = document.createElement('button');
  botonEditar.textContent = 'Editar tarea';
  botonEditar.classList.add('btn-editar');
  botonEditar.addEventListener('click', () => abrirModalEditar(li));

  let botonEliminar = document.createElement('button');
  botonEliminar.textContent = 'Eliminar tarea';
  botonEliminar.classList.add('btn-eliminar');
  botonEliminar.addEventListener('click', () => eliminarTarea(li));

  li.appendChild(contenedorTexto);
  li.appendChild(botonCompletar);
  li.appendChild(botonEliminar);
  li.appendChild(botonEditar);

  return li;
}

// ---------- Escuchar tareas SOLO del usuario actual ----------

function escucharTareas(uid) {
  const q = query(tareasRef, where("uid", "==", uid));

  unsubscribeTareas = onSnapshot(q, (snapshot) => {
    const display = document.querySelector('#display');
    display.innerHTML = '';

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const li = crearElementoTarea(data.texto, data.descripcion, docSnap.id, data.completada);
      display.appendChild(li);
    });
  }, (error) => {
    console.error("Error escuchando tareas:", error);
  });
}


function agregarTarea() {
  const usuario = auth.currentUser;
  if (!usuario) return; 

  let input = document.getElementById('taskContainer');
  let inputDesc = document.getElementById('descContainer');
  let tarea = input.value.trim();
  let descripcion = inputDesc.value.trim();

  if (tarea === '') return alert('Ingresa una tarea');

  addDoc(tareasRef, {
    texto: tarea,
    descripcion: descripcion,
    completada: false,
    uid: usuario.uid
  });

  input.value = '';
  inputDesc.value = '';
}


async function eliminarTarea(elementoLi) {
  const id = elementoLi.getAttribute('data-id');
  await deleteDoc(doc(db, "tareas", id));
}


async function completarTarea(li, boton) {
  const id = li.getAttribute('data-id');
  const nuevoEstado = !li.classList.contains('completada');

  await updateDoc(doc(db, "tareas", id), {
    completada: nuevoEstado
  });
}


function abrirModalEditar(li) {
  liEditando = li;
  document.getElementById('editTitulo').value = li.querySelector('.titulo').textContent;
  document.getElementById('editDescripcion').value = li.querySelector('.descripcion').textContent;
  document.getElementById('modalOverlay').classList.add('activo');
}

function cerrarModal() {
  document.getElementById('modalOverlay').classList.remove('activo');
  liEditando = null;
}

async function guardarEdicion() {
  const nuevoTitulo = document.getElementById('editTitulo').value.trim();
  const nuevaDescripcion = document.getElementById('editDescripcion').value.trim();

  if (nuevoTitulo === '') {
    alert('El título no puede estar vacío');
    return;
  }

  const id = liEditando.getAttribute('data-id');

  await updateDoc(doc(db, "tareas", id), {
    texto: nuevoTitulo,
    descripcion: nuevaDescripcion
  });

  cerrarModal();
}


document.getElementById('btnAgregar').addEventListener('click', agregarTarea);
document.getElementById('btnGuardar').addEventListener('click', guardarEdicion);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('Service Worker registrado'))
    .catch(err => console.error('Error registrando SW:', err));
}