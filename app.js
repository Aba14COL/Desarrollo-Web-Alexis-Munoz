// ============================================================
// app.js — Archivo principal: importa datos y conecta la interfaz
// ============================================================

import { filtrarRutinasPorIMC, obtenerCategoriaIMC } from './datos.js';

// --- Elementos del DOM ---
const btnCalcular = document.getElementById('btn-calcular');
const inputPeso = document.getElementById('peso');
const inputAltura = document.getElementById('altura');
const resultadoIMC = document.getElementById('resultado-imc');
const contenedorRutinas = document.getElementById('rutinas-recomendadas');

// --- Etiquetas legibles para cada categoría ---
const etiquetas = {
  bajo_peso: "Bajo peso — Rutinas para ganar fuerza y masa muscular",
  normal: "Peso saludable — Rutinas para mantenerte en forma",
  sobrepeso: "Sobrepeso — Rutinas para quemar grasa y tonificar",
  obesidad: "Obesidad — Rutinas suaves y progresivas para empezar"
};

// --- Colores por categoría ---
const colores = {
  bajo_peso: "#29b6f6",
  normal: "#b3c000",
  sobrepeso: "#ff8800",
  obesidad: "#ef5350"
};

// --- Evento principal ---
btnCalcular.addEventListener('click', function () {
  const peso = parseFloat(inputPeso.value);
  const altura = parseFloat(inputAltura.value);

  // Limpiar resultados anteriores
  contenedorRutinas.innerHTML = '';

  // Validación
  if (!(peso > 0 && altura > 0)) {
    resultadoIMC.textContent = "Por favor ingresa valores válidos para peso y altura.";
    resultadoIMC.style.color = "var(--color-terciario)";
    return;
  }

  // Calcular IMC
  const imc = peso / (altura * altura);
  const categoria = obtenerCategoriaIMC(imc);

  // Mostrar resultado del IMC
  let mensajeIMC = "Tu IMC es " + imc.toFixed(2) + ". ";

  if (imc < 18.5) {
    mensajeIMC += "Estás por debajo de tu peso ideal.";
  } else if (imc >= 18.5 && imc < 24.9) {
    mensajeIMC += "Tienes un peso saludable.";
  } else if (imc >= 25 && imc < 29.9) {
    mensajeIMC += "Tienes sobrepeso.";
  } else {
    mensajeIMC += "Tienes obesidad.";
  }

  resultadoIMC.textContent = mensajeIMC;
  resultadoIMC.style.color = colores[categoria];

  // Filtrar rutinas según el IMC
  const rutinasRecomendadas = filtrarRutinasPorIMC(imc);

  // Verificar si hay resultados
  if (rutinasRecomendadas.length === 0) {
    contenedorRutinas.innerHTML = '<p class="sin-resultados">No se encontraron rutinas para tu categoría.</p>';
    return;
  }

  // Crear título de las recomendaciones
  const titulo = document.createElement('h3');
  titulo.textContent = etiquetas[categoria];
  titulo.style.color = colores[categoria];
  titulo.style.marginBottom = '1rem';
  contenedorRutinas.appendChild(titulo);

  // Mostrar cada rutina recomendada
  rutinasRecomendadas.forEach(function (rutina) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-rutina';
    tarjeta.style.borderLeftColor = colores[categoria];

    tarjeta.innerHTML =
      '<h4>' + rutina.nombre + '</h4>' +
      '<p>' + rutina.descripcion + '</p>' +
      '<div class="rutina-meta">' +
        '<span>⏱ ' + rutina.duracion + '</span>' +
        '<span>⚡ ' + rutina.intensidad + '</span>' +
      '</div>';

    contenedorRutinas.appendChild(tarjeta);
  });
});
