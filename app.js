/* ===== Paso 2. Mostrar el mapa ===== */
const CENTRO_INICIAL = [5.0689, -75.5174]; // Manizales, por si falla la ubicación
const mapa = L.map('mapa').setView(CENTRO_INICIAL, 15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapa);

/* ===== Paso 3. Geolocalización ===== */
let marcadorUsuario = null;
let circuloPrecision = null;

function mostrarInfo(texto) {
    document.getElementById('info').textContent = texto;
}

function ubicarUsuario() {
    if (!('geolocation' in navigator)) {
        mostrarInfo('Tu navegador no soporta geolocalización.');
        return;
    }

    mostrarInfo('Buscando tu ubicación...');

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            const punto = [latitude, longitude];

            if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);
            if (circuloPrecision) mapa.removeLayer(circuloPrecision);

            marcadorUsuario = L.marker(punto).addTo(mapa).bindPopup('Estás aquí').openPopup();
            circuloPrecision = L.circle(punto, { radius: accuracy, fillOpacity: 0.1 }).addTo(mapa);

            mapa.setView(punto, 17);

            mostrarInfo(`Ubicación encontrada (precisión: ${Math.round(accuracy)} m). Haz clic para dibujar.`);
        },
        (err) => {
            const mensajes = {
                1: 'Permiso denegado. Activa la ubicación en el navegador.',
                2: 'No se pudo determinar la ubicación.',
                3: 'Se agotó el tiempo de espera.'
            };

            mostrarInfo(mensajes[err.code] || 'Error desconocido.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

document.getElementById('btnUbicar').addEventListener('click', ubicarUsuario);
ubicarUsuario();

/* ===== Paso 4. Capturar vértices con clics ===== */
let puntos = []; // array de [lat, lng]
let vertices = []; // marcadores visibles de cada vértice
let poligono = null;

const lineaGuia = L.polyline([], { color: '#e67e22', dashArray: '6 6' }).addTo(mapa);

mapa.on('click', (e) => {
    if (poligono) return; // si ya está cerrado, no se agregan más puntos

    const { lat, lng } = e.latlng;
    puntos.push([lat, lng]);

    const v = L.circleMarker([lat, lng], { radius: 6, color: '#e67e22', fillOpacity: 1 }).addTo(mapa);
    vertices.push(v);

    lineaGuia.setLatLngs(puntos);

    actualizarBotones();
    mostrarInfo(`${puntos.length} vértice(s). Necesitas al menos 3 para cerrar.`);
});

function actualizarBotones() {
    document.getElementById('btnCerrar').disabled = puntos.length < 3 || poligono !== null;
    document.getElementById('btnDeshacer').disabled = puntos.length === 0 || poligono !== null;
    document.getElementById('btnExportar').disabled = poligono === null;
}

/* ===== Paso 5. Cerrar el polígono y medirlo ===== */
function aGeoJSON() {
    const anillo = puntos.map(([lat, lng]) => [lng, lat]);
    anillo.push(anillo[0]); // cerrar el anillo

    return turf.polygon([anillo], { nombre: 'Mi polígono', creado: new Date().toISOString() });
}

function medir() {
    const geo = aGeoJSON();
    const area = turf.area(geo); // metros cuadrados
    const perimetro = turf.length(turf.polygonToLine(geo), { units: 'meters' });

    return { area, perimetro };
}

function cerrarPoligono() {
    poligono = L.polygon(puntos, { color: '#27ae60', fillOpacity: 0.35 }).addTo(mapa);

    lineaGuia.setLatLngs([]);
    mapa.fitBounds(poligono.getBounds());

    const { area, perimetro } = medir();

    poligono.bindPopup(`Área: ${area.toFixed(1)} m²<br>Perímetro: ${perimetro.toFixed(1)} m`).openPopup();

    mostrarInfo(`Polígono cerrado. Área: ${area.toFixed(1)} m² (${(area / 10000).toFixed(3)} ha).`);

    actualizarBotones();
}

document.getElementById('btnCerrar').addEventListener('click', cerrarPoligono);

/* ===== Paso 6. Deshacer y limpiar ===== */
function deshacerPunto() {
    puntos.pop();
    mapa.removeLayer(vertices.pop());

    lineaGuia.setLatLngs(puntos);

    actualizarBotones();
    mostrarInfo(`${puntos.length} vértice(s).`);
}

function limpiar() {
    puntos = [];

    vertices.forEach((v) => mapa.removeLayer(v));
    vertices = [];

    lineaGuia.setLatLngs([]);

    if (poligono) {
        mapa.removeLayer(poligono);
        poligono = null;
    }

    actualizarBotones();
    mostrarInfo('Mapa limpio. Haz clic para empezar de nuevo.');
}

document.getElementById('btnDeshacer').addEventListener('click', deshacerPunto);
document.getElementById('btnLimpiar').addEventListener('click', limpiar);

/* ===== Paso 7. Exportar a GeoJSON ===== */
function exportar() {
    const texto = JSON.stringify(aGeoJSON(), null, 2);
    const blob = new Blob([texto], { type: 'application/geo+json' });
    const enlace = document.createElement('a');

    enlace.href = URL.createObjectURL(blob);
    enlace.download = 'poligono.geojson';
    enlace.click();

    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}

document.getElementById('btnExportar').addEventListener('click', exportar);


/* =====================================================================
   RETOS (código agregado al final; no modifica los pasos anteriores)
   Los controles nuevos se crean desde JavaScript para que index.html y
   estilos.css queden exactamente como en el taller.
   ===================================================================== */

/* ---------- Controles de los retos (creados con createElement) ---------- */
const panelRetos = document.createElement('div');
panelRetos.className = 'controles';
panelRetos.style.marginTop = '8px';
panelRetos.style.alignItems = 'center';

const inputNombre = document.createElement('input');
inputNombre.type = 'text';
inputNombre.placeholder = 'Nombre del polígono';

const inputColor = document.createElement('input');
inputColor.type = 'color';
inputColor.value = '#27ae60';

const etiquetaColor = document.createElement('label');
etiquetaColor.append('Color ', inputColor);

const btnVerticeGPS = document.createElement('button');
btnVerticeGPS.textContent = 'Agregar vértice con mi ubicación';

const btnDentro = document.createElement('button');
btnDentro.textContent = '¿Estoy dentro?';

const btnGeocerca = document.createElement('button');
btnGeocerca.textContent = 'Activar geocerca';

const inputArchivo = document.createElement('input');
inputArchivo.type = 'file';
inputArchivo.accept = '.geojson,.json';

const etiquetaArchivo = document.createElement('label');
etiquetaArchivo.append('Importar GeoJSON ', inputArchivo);

panelRetos.append(inputNombre, etiquetaColor, btnVerticeGPS, btnDentro, btnGeocerca, etiquetaArchivo);
document.querySelector('header').insertBefore(panelRetos, document.getElementById('info'));

const aviso = document.createElement('p');
aviso.style.margin = '6px 0 0';
aviso.style.fontWeight = 'bold';
aviso.style.color = '#ffd166';

document.getElementById('info').after(aviso);

const tablaContenedor = document.createElement('div');
tablaContenedor.style.maxHeight = '150px';
tablaContenedor.style.overflowY = 'auto';

const tabla = document.createElement('table');
tabla.style.width = '100%';

tablaContenedor.append(tabla);
document.body.append(tablaContenedor);

/* ---------- Reto 1 (básico): tabla con las coordenadas (6 decimales) ---------- */
function actualizarTabla() {
    tabla.innerHTML = '<tr><th>#</th><th>Latitud</th><th>Longitud</th></tr>';

    puntos.forEach(([lat, lng], i) => {
        const fila = document.createElement('tr');

        [i + 1, lat.toFixed(6), lng.toFixed(6)].forEach((valor) => {
            const celda = document.createElement('td');
            celda.textContent = valor;
            fila.append(celda);
        });

        tabla.append(fila);
    });
}

/* ---------- Reto 2 (básico): elegir el color del polígono ---------- */
let colorElegido = inputColor.value;

inputColor.addEventListener('input', () => {
    colorElegido = inputColor.value;

    if (poligono) poligono.setStyle({ color: colorElegido });

    guardarLocal();
});

// Al cerrar el polígono (el Paso 5 lo crea verde) se aplica el color elegido
document.getElementById('btnCerrar').addEventListener('click', () => {
    if (poligono) poligono.setStyle({ color: colorElegido });
});

/* ---------- Reto 3 (básico): nombre guardado en las propiedades del GeoJSON ---------- */
const aGeoJSONBase = aGeoJSON; // la función del Paso 5

aGeoJSON = function () {
    const geo = aGeoJSONBase();

    if (inputNombre.value.trim() !== '') geo.properties.nombre = inputNombre.value.trim();

    return geo;
};

inputNombre.addEventListener('input', () => guardarLocal());

/* ---------- Reto 4 (intermedio): agregar un vértice con la ubicación actual ---------- */
function posicionActual() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });
}

btnVerticeGPS.addEventListener('click', async () => {
    if (poligono) return mostrarInfo('El polígono ya está cerrado. Limpia para empezar de nuevo.');

    try {
        const { coords } = await posicionActual();

        // Se dispara el mismo evento "click" del mapa: reutiliza el código del Paso 4
        mapa.fire('click', { latlng: L.latLng(coords.latitude, coords.longitude) });
    } catch (err) {
        mostrarInfo('No se pudo obtener tu ubicación: ' + err.message);
    }
});

/* ---------- Reto 5 (intermedio): guardar y recuperar con localStorage ---------- */
const CLAVE_STORAGE = 'taller-poligono';

function guardarLocal() {
    if (puntos.length === 0) {
        localStorage.removeItem(CLAVE_STORAGE);
        return;
    }

    localStorage.setItem(CLAVE_STORAGE, JSON.stringify({
        puntos: puntos,
        cerrado: poligono !== null,
        nombre: inputNombre.value,
        color: colorElegido
    }));
}

function recuperarLocal() {
    const datos = JSON.parse(localStorage.getItem(CLAVE_STORAGE));

    if (!datos || !datos.puntos || datos.puntos.length === 0) return;

    inputNombre.value = datos.nombre || '';
    colorElegido = datos.color || colorElegido;
    inputColor.value = colorElegido;

    datos.puntos.forEach(([lat, lng]) => {
        mapa.fire('click', { latlng: L.latLng(lat, lng) });
    });

    if (datos.cerrado) {
        cerrarPoligono();
        poligono.setStyle({ color: colorElegido });
    }

    alCambiar();
    mostrarInfo('Se recuperó tu polígono guardado.');
}

/* ---------- Reto 6 (intermedio): importar un .geojson y dibujarlo ---------- */
let capaImportada = null;

inputArchivo.addEventListener('change', () => {
    const archivo = inputArchivo.files[0];

    if (!archivo) return;

    const lector = new FileReader();

    lector.onload = () => {
        try {
            const datos = JSON.parse(lector.result);

            if (capaImportada) mapa.removeLayer(capaImportada);

            capaImportada = L.geoJSON(datos).addTo(mapa);
            mapa.fitBounds(capaImportada.getBounds());

            mostrarInfo(`Archivo "${archivo.name}" importado.`);
        } catch (e) {
            mostrarInfo('El archivo no es un GeoJSON válido.');
        }
    };

    lector.readAsText(archivo);
    inputArchivo.value = '';
});

/* ---------- Reto 7 (avanzado): ¿la ubicación está dentro del polígono? ---------- */
function estaDentro(lat, lng) {
    return turf.booleanPointInPolygon(turf.point([lng, lat]), aGeoJSON());
}

btnDentro.addEventListener('click', async () => {
    if (!poligono) return mostrarInfo('Primero cierra el polígono.');

    try {
        const { coords } = await posicionActual();

        mostrarInfo(estaDentro(coords.latitude, coords.longitude)
            ? 'Estás DENTRO del polígono.'
            : 'Estás FUERA del polígono.');
    } catch (err) {
        mostrarInfo('No se pudo obtener tu ubicación: ' + err.message);
    }
});

/* ---------- Reto 8 (avanzado): geocerca con watchPosition y clearWatch ---------- */
let idVigilancia = null;
let estabaDentro = null;

function detenerGeocerca() {
    if (idVigilancia !== null) navigator.geolocation.clearWatch(idVigilancia);

    idVigilancia = null;
    estabaDentro = null;
    btnGeocerca.textContent = 'Activar geocerca';
}

btnGeocerca.addEventListener('click', () => {
    if (idVigilancia !== null) {
        detenerGeocerca();
        mostrarInfo('Geocerca desactivada.');
        return;
    }

    if (!poligono) return mostrarInfo('Primero cierra el polígono.');

    idVigilancia = navigator.geolocation.watchPosition(
        ({ coords }) => {
            const dentro = estaDentro(coords.latitude, coords.longitude);

            if (estabaDentro === true && !dentro) {
                mostrarInfo('⚠ Saliste del polígono.');
                alert('⚠ Saliste del polígono (geocerca).');
            } else {
                mostrarInfo(dentro ? 'Geocerca activa: estás dentro.' : 'Geocerca activa: estás fuera.');
            }

            estabaDentro = dentro;
        },
        (err) => mostrarInfo('Error en la geocerca: ' + err.message),
        { enableHighAccuracy: true }
    );

    btnGeocerca.textContent = 'Detener geocerca';
    mostrarInfo('Geocerca activada. Buscando tu ubicación...');
});

/* ---------- Reto 9 (avanzado): advertir si el polígono se cruza consigo mismo ---------- */
function revisarCruces() {
    if (puntos.length < 3) {
        aviso.textContent = '';
        return;
    }

    const geo = aGeoJSON();

    aviso.textContent = turf.kinks(geo).features.length > 0
        ? '⚠ El polígono se cruza consigo mismo: el área calculada no es confiable.'
        : '';
}

/* ---------- Conexión de los retos con los eventos de los pasos ---------- */
// Se ejecuta después del código de cada paso, porque estos listeners se registran al final
function alCambiar() {
    actualizarTabla();
    revisarCruces();
    guardarLocal();
}

mapa.on('click', alCambiar);

['btnCerrar', 'btnDeshacer', 'btnLimpiar'].forEach((id) => {
    document.getElementById(id).addEventListener('click', alCambiar);
});

// Al limpiar también se quita lo importado y se detiene la geocerca
document.getElementById('btnLimpiar').addEventListener('click', () => {
    detenerGeocerca();

    if (capaImportada) {
        mapa.removeLayer(capaImportada);
        capaImportada = null;
    }
});

recuperarLocal();