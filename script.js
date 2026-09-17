// ---------- Configuración de Firebase ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

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

enableIndexedDbPersistence(db).catch((err) => {
  console.warn("Persistencia offline no disponible:", err.code);
});

const tareasRef = collection(db, "tareas");

let liEditando = null;

// ---------- Crear elemento ----------

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

// ---------- Cargar tareas desde Firestore ----------

function escucharTareas() {
  onSnapshot(tareasRef, (snapshot) => {
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

// ---------- Agregar tarea ----------

function agregarTarea() {
  let input = document.getElementById('taskContainer');
  let inputDesc = document.getElementById('descContainer');
  let tarea = input.value.trim();
  let descripcion = inputDesc.value.trim();

  if (tarea === '') return alert('Ingresa una tarea');

  addDoc(tareasRef, {
    texto: tarea,
    descripcion: descripcion,
    completada: false
  });

  input.value = '';
  inputDesc.value = '';
}

// ---------- Eliminar tarea ----------

async function eliminarTarea(elementoLi) {
  const id = elementoLi.getAttribute('data-id');
  await deleteDoc(doc(db, "tareas", id));
  elementoLi.remove();
}

// ---------- Completar tarea ----------

async function completarTarea(li, boton) {
  const id = li.getAttribute('data-id');
  const nuevoEstado = !li.classList.contains('completada');

  await updateDoc(doc(db, "tareas", id), {
    completada: nuevoEstado
  });

  li.classList.toggle('completada');
  boton.textContent = nuevoEstado ? 'Deshacer' : 'Completar';
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

  liEditando.querySelector('.titulo').textContent = nuevoTitulo;
  liEditando.querySelector('.descripcion').textContent = nuevaDescripcion;

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

escucharTareas();