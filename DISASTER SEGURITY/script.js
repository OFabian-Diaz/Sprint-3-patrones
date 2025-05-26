// ✅ Mostrar cualquier pantalla
function mostrarVista(idVista) {
  const vistas = document.querySelectorAll('.pantalla');
  vistas.forEach(vista => vista.style.display = 'none');
  document.getElementById(idVista).style.display = 'block';
}

function registrar() {
  const data = {
    nombre: document.getElementById("nombre").value,
    apellidos: document.getElementById("apellidos").value,
    direccion: document.getElementById("direccion").value,
    celular: document.getElementById("celular").value,
    cedula: document.getElementById("cedula").value,
    password: document.getElementById("password").value
  };

  if (data.celular.length !== 10 || isNaN(data.celular)) {
    alert("El celular debe tener 10 dígitos numéricos.");
    return;
  }

  if (data.cedula.length !== 10 || isNaN(data.cedula)) {
    alert("La cédula debe tener 10 dígitos numéricos.");
    return;
  }

  fetch('http://localhost:3000/api/registrar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => {
    if (res.ok) {
      alert("¡Registro exitoso!");
      mostrarVista("login");
    } else {
      alert("Error al registrar.");
    }
  });
}

function iniciarSesion() {
  const data = {
    nombre: document.getElementById("login-nombre").value,
    cedula: document.getElementById("login-cedula").value,
    password: document.getElementById("login-password").value
  };

  fetch("http://localhost:3000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
    .then(res => {
      if (res.ok) {
        localStorage.setItem("cedulaUsuario", data.cedula);
        alert("Inicio de sesión exitoso");
        document.getElementById("sidebar").classList.add("visible");
        mostrarVista("formulario");
      } else {
        alert("Datos incorrectos o usuario no registrado");
      }
    })
    .catch(err => {
      console.error("Error al iniciar sesión", err);
      alert("Error en el servidor");
    });
}

function obtenerCedulaUsuario() {
  return localStorage.getItem("cedulaUsuario");
}

function cargarPerfil() {
  const cedula = obtenerCedulaUsuario();
  if (!cedula) {
    alert("No hay sesión iniciada.");
    mostrarVista("login");
    return;
  }

  fetch(`http://localhost:3000/api/usuario/${cedula}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('nombrePerfil').textContent = data.nombre;
      document.getElementById('apellidosPerfil').textContent = data.apellidos;
      document.getElementById('cedulaPerfil').textContent = data.cedula;
      document.getElementById('direccionPerfil').textContent = data.direccion;
      document.getElementById('celularPerfil').textContent = data.celular;
    });

  const formFoto = document.getElementById('form-foto');
  if (formFoto) {
    formFoto.addEventListener('submit', function (e) {
      e.preventDefault();
      const formData = new FormData(formFoto);
      fetch(`http://localhost:3000/api/usuario/${cedula}/foto`, {
        method: 'POST',
        body: formData
      })
        .then(res => res.text())
        .then(msg => {
          alert(msg);
          cargarPerfil();
        });
    });
  }
}

function cerrarSesion() {
  localStorage.removeItem("cedulaUsuario");
  alert("Sesión cerrada");
  document.getElementById("sidebar").classList.remove("visible");
  mostrarVista("inicio");
}

// ✅ Enviar Reporte al Backend
function enviarReporte() {
  const tipo = document.getElementById("tipo").value;
  const descripcion = document.getElementById("descripcion").value;
  const evidencia = document.getElementById("evidencia").files[0];
  const cedula = localStorage.getItem("cedulaUsuario");

  if (!cedula) {
    alert("Debes iniciar sesión antes de enviar un reporte.");
    return;
  }

  const formData = new FormData();
  formData.append("tipo", tipo);
  formData.append("descripcion", descripcion);
  formData.append("evidencia", evidencia);
  formData.append("cedula", cedula);

  fetch("http://localhost:3000/api/reportes", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.text())
    .then((msg) => {
      alert(msg);
    })
    .catch((err) => {
      console.error("Error al enviar reporte:", err);
      alert("Error al enviar el reporte.");
    });
}

// Sidebar toggle
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("visible");
}

// ==================== MAPA ====================

let mapaCargado = false;
let mapa;
let marcadorSeleccionado = null;
let ultimaUbicacion = null;

function inicializarMapa() {
  if (mapaCargado) return;
  mapaCargado = true;

  setTimeout(() => {
    mapa = L.map('mapaEmergencias').setView([4.60971, -74.08175], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapa);

    mapa.on('click', function (e) {
      const { lat, lng } = e.latlng;
      ultimaUbicacion = { lat, lng };
      const tipo = document.getElementById("tipoEmergencia").value;

      if (marcadorSeleccionado) {
        mapa.removeLayer(marcadorSeleccionado);
      }

      const icono = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background:${tipo};width:16px;height:16px;border-radius:50%;border:2px solid white;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      marcadorSeleccionado = L.marker([lat, lng], { icon: icono }).addTo(mapa);
      marcadorSeleccionado.bindPopup(`Emergencia: ${tipo}<br>Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}`).openPopup();
    });

  }, 300);
}

function enviarAlertaDesdeMapa() {
  if (!ultimaUbicacion) {
    alert("Por favor, haz clic en el mapa para seleccionar una ubicación.");
    return;
  }

  const tipo = document.getElementById("tipoEmergencia").value;
  alert(`Alerta enviada:\nTipo: ${tipo}\nLat: ${ultimaUbicacion.lat.toFixed(5)}, Lng: ${ultimaUbicacion.lng.toFixed(5)}`);
}

function buscarLibro() {
  const query = document.getElementById("busquedaLibro").value;
  const resultados = document.getElementById("resultadosLibros");
  resultados.innerHTML = "Buscando...";

  fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      resultados.innerHTML = "";
      if (data.docs.length === 0) {
        resultados.innerHTML = "No se encontraron resultados.";
        return;
      }

      data.docs.slice(0, 5).forEach(libro => {
        const titulo = libro.title;
        const autor = libro.author_name?.[0] || "Autor desconocido";
        const coverId = libro.cover_i;
        const key = libro.key; // Identificador para el link

        const div = document.createElement("div");
        div.style.marginBottom = "20px";
        div.style.textAlign = "left";
        div.style.borderBottom = "1px solid #ccc";
        div.style.paddingBottom = "10px";

        // HTML con imagen, título enlazado y autor
        div.innerHTML = `
          ${coverId ? `<img src="https://covers.openlibrary.org/b/id/${coverId}-M.jpg" style="width:80px;margin-right:10px;vertical-align:middle;">` : ''}
          <a href="https://openlibrary.org${key}" target="_blank" style="font-weight:bold; text-decoration: none; color: #1b4332;">
            ${titulo}
          </a>
          <div style="font-size: 14px; color: #333;">${autor}</div>
        `;

        resultados.appendChild(div);
      });
    })
    .catch(() => {
      resultados.innerHTML = "Error al buscar libros.";
    });
}

function buscarCategoria(categoria) {
  const filtros = {
    incendios: "incendios prevención",
    inundaciones: "inundaciones preparación",
    terremotos: "terremotos qué hacer"
  };

  document.getElementById("busquedaLibro").value = filtros[categoria];
  buscarLibro();
}

