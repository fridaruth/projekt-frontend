/**
 * Projekt: Vibe-Caster
 * Syfte: Mashup som kombinerar karta, väder och musiktips
 * @author Frida Pihlström
 */

// karta
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Globala variabler för kartan
let map;
let marker;

// API-konfigurationer
const weatherKey = "50ee094c7e665075045c47f8a40dad9b";
const weatherUrl = "https://api.openweathermap.org/data/2.5/weather?units=metric&q=";
const deezerSearch = "/api-deezer/search/playlist?q=";

/** 
 * Objekt som lagrar CSS-gradients för olika väderförhållanden.
 * @type {Object.<string, {color: string}>}
 */

const weatherMoods = {
    Clear: { color: "linear-gradient(140deg, #fceabb, #f8b500)" },
    Clouds: { color: "linear-gradient(140deg, #bdc3c7, #44505b)" },
    Rain: { color: "linear-gradient(140deg, #627ea2, #376fa2)" },
    Thunderstorm: { color: "linear-gradient(140deg, #97a0a7, #2c3843)" },
    Snow: { color: "linear-gradient(140deg, #E0EAFC, #CFDEF3)" },
    Drizzle: { color: "linear-gradient(140deg, #757f9a, #d7dde8)" },
    Atmosphere: { color: "linear-gradient(140deg, #8e9eab, #eef2f3)" },
    Mist: { color: "linear-gradient(140deg, #8e9eab, #eef2f3)" },
    Smoke: { color: "linear-gradient(140deg, #8e9eab, #eef2f3)" },
    Fog: { color: "linear-gradient(140deg, #8e9eab, #eef2f3)" },
    Haze: { color: "linear-gradient(140deg, #8e9eab, #eef2f3)" }
};

/**
 * Startar Leaflet-kartan och sätter en startposition.
 */
function initMap() {
    map = L.map('map').setView([62.3908, 17.3069], 6);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
}

/**
 * Huvudfunktion som hämtar väderdata, uppdaterar gränssnittet, kartan och musiken.
 * @async
 * @param {string} city  - Namnet på staden man söker efter
 */
async function updateVibe(city) {
    const weatherDisplay = document.querySelector("#greeting-text");
    const musicDisplay = document.querySelector("#music-link");
    const container = document.querySelector(".app-container");

if (!city) return;

weatherDisplay.innerText = `Läser av atmosfären i ${city}...`;

try {
    // Hämta väder
    const weatherRes = await fetch(`${weatherUrl}${city}&appid=${weatherKey}`);
    const weatherData = await weatherRes.json();

    if (weatherData.cod !== 200) {
        weatherDisplay.innerText = "Hittade inte staden. Försök igen!";
        return;
    }

    const condition = weatherData.weather[0].main;
    const temp = Math.round(weatherData.main.temp);

     // Hantera regn-animation
    if(condition === "Rain" || condition === "Drizzle") {
        createRain();
    } else {
        const oldRain = document.querySelectorAll('.rain-drop');
        oldRain.forEach(d => d.remove())
    }

    // Uppdatera karta
    updateMap(weatherData.coord.lat, weatherData.coord.lon, city, condition);
    
    const musicQuery = getMusicVibe(condition, temp);
    const vibeStyle = weatherMoods[condition] || { color: "#1a1a2e" };


    // Hämta musik baserat på väder
    const musicRes = await fetch(`${deezerSearch}${musicQuery}`);
    const musicData = await musicRes.json();

    // kolla om data finns, annars spela top hits
    let playlist;
    if (musicData.data && musicData.data.length > 0) {
        playlist = musicData.data[0];
    } else {
        const fallbackRes = await fetch(`${deezerSearch}top hits 2026`);
        const fallbackData = await fallbackRes.json();
        playlist = fallbackData.data[0];
    }

    // skapa url till spelare och hämta låtlista
    const deezerWidgetUrl = `https://widget.deezer.com/widget/dark/playlist/${playlist.id}?tracklist=false`;
    const tracklistPath = playlist.tracklist.replace('https://api.deezer.com', ''); 
    const tracksRes = await fetch(`/api-deezer${tracklistPath}`);
    const tracksData = await tracksRes.json();
    const topTracks = tracksData.data ? tracksData.data.slice(0, 4) : [];
    
    // Rendera väder till DOM
    container.style.background = vibeStyle.color;
    weatherDisplay.innerHTML = `
    <div class="weather-card animate-in">
    <h2>${city}</h2>
    <div class="temp">${temp}°C</div>
    <p>It is <strong>${condition}</strong>!</p>
    <p>Your vibe today is: <strong>${musicQuery}</strong></p>
    </div>
    `;

    // Skapa HTML för låt-lista
    const tracksHtml = topTracks.map(track => `
<div class="track-item">
    <span class="note-icon">🎵</span>
    <div class="track-details">
    <span class="track-title">${track.title}</span>
    <span class="track-artist">${track.artist.name}</span>
    </div>
    </div>
    `).join('');

    // Lägg till musik och låt-lista till DOM
    musicDisplay.innerHTML = `
    <div class="music-card animate-in">
    <h3>Recommended playlist:</h3>
        <p><strong>${playlist.title}</strong></p>
    <iframe 
        title="Deezer Player"
        src="${deezerWidgetUrl}"
        width="100%"
        height="200"
        frameborder="0"
        allowtransparency="true"
        allow="encrypted-media; clipboard-write; accelerometer; gyroscope; picture-in-picture;"
        style="border-radius: 20px; box-shadow: 0 10px 20px rgba(0, 0, 0, 0.02);">
        </iframe>

        <div class="track-preview">
        <h4>Vibe Preview:</h4>
        ${tracksHtml}
        </div>
    </div>
    `;

} catch (error) {
    console.error("Fel:", error);
    weatherDisplay.innerText = "Något gick fel, prova att uppdatera sidan!"
}
}

/**
 * Flyttar kartan till koordinaterna, markering med info
 * @param {number} lat - latitud
 * @param {number} lon  - longitud
 * @param {string} cityName - Namn på stad
 * @param {string} condition - Väderförhållande
 */
function updateMap(lat, lon, cityName, condition) {
    const coords = [lat, lon];
    map.setView(coords, 10);

    if (marker) map.removeLayer(marker);

    marker = L.marker(coords).addTo(map)
    .bindPopup(`The weather in ${cityName} is: <strong>${condition.toLowerCase()}!</strong>`)
    .openPopup();
}

/**
 * Returnerar ett sökord för musik baserat på väder och termperatur.
 * @param {string} condition - väderförhållanden
 * @param {number} temp - temperatur i celsius
 * @returns {string} - sökord (vibe)
 */
function getMusicVibe(condition, temp) {
    if (condition === "Clear") {
        return temp > 15 ? "Summer Party" : "Sunny Chill";
    }
    else if (condition === "Rain" || condition === "Drizzle") {
       return temp > 15 ? "Tropical House" : "Melancholic Piano";
    } 
    else if (condition === "Clouds") {
        if (temp < 0) return "Sad and Slow";
        if (temp < 5) return "Dark and Moody";
        return "Chill Indie";
    } 
    else if (condition === "Snow") {
        return temp < -2 ? "Arctic Chill" : "Winter Cozy";
    }
    else if (condition === "Atmosphere" || condition === "Mist" || condition === "Smoke" || condition === "Fog" || condition === "Haze"){
        return "Lo-Fi Beats";
    } 
    else if (condition === "Thunderstorm") {
        return "Dramatic Techno";
    }
    return "global top hits 2026";
    }

    /**
     * Startar applikationen och sätter upp eventlyssnare
     */
function initApp() {
    initMap();
    updateVibe("Sundsvall");

    const searchBtn = document.querySelector("#search-vibe-btn");
    const cityInput = document.querySelector("#city-input");
    
    searchBtn.addEventListener('click', () => updateVibe(cityInput.value.trim()));

    // Gör det möjligt att trycka på "enter" för att söka
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') updateVibe(cityInput.value.trim());
    });
}

/**
 * Skapar en regn-animation med slumpmässiga droppar
 */
function createRain() {
    const oldRain = document.querySelectorAll('.rain-drop');
    oldRain.forEach(d => d.remove());

    // skapa slumpmässiga regndroppar
    for (let i = 0; i < 30; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = Math.random() * 100 + 'vw';
        drop.style.animationDuration = (Math.random() * 1 + 0.5) + 's';
        drop.style.opacity = Math.random();
        document.body.appendChild(drop);
    }
}

// kör när DOM är laddad
document.addEventListener('DOMContentLoaded', initApp);
