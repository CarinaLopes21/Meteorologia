// City list with coordinates
const CITIES = [
  { name: "Berlin",    lat: 52.52,  lon: 13.41  },
  { name: "Lisbon",    lat: 38.72,  lon: -9.14  },
  { name: "Porto",     lat: 41.15,  lon: -8.61  },
  { name: "London",    lat: 51.51,  lon: -0.13  },
  { name: "Paris",     lat: 48.85,  lon: 2.35   },
  { name: "New York",  lat: 40.71,  lon: -74.01 },
  { name: "Tokyo",     lat: 35.68,  lon: 139.69 },
  { name: "Sydney",    lat: -33.87, lon: 151.21 },
  { name: "São Paulo", lat: -23.55, lon: -46.63 },
  { name: "Cairo",     lat: 30.06,  lon: 31.25  },
];

// Global variables to hold live data for the generative canvas
let visualData = {
  avgTemp: 15,
  windSpeed: 10,
  humidity: 50,
  aqi: 30, // Air Quality Index from API 2
  cityName: ""
};

function setup() {
  // Create a container dynamically to wrap around the canvas and the display div
  const container = createElement("div");
  container.class("dashboard-container");
  container.parent(select("body"));

  // Create the canvas for the non-interactive Generative Data Art piece
  const canvas = createCanvas(400, 400);
  canvas.parent(container);
  
  // Move the existing display panel inside our new flex container layout
  const display = select("#display");
  display.parent(container);

  // Populate dropdown
  const sel = select("#citySelect");
  CITIES.forEach((city, i) => {
    const opt = createElement("option", city.name);
    opt.attribute("value", i);
    opt.parent(sel);
  });

  // Load first city on start
  loadCity(CITIES[0]);

  // React to dropdown change
  sel.changed(() => {
    const city = CITIES[int(sel.value())];
    loadCity(city);
  });
}

function draw() {
  background(27, 42, 59); // Matches #1b2a3b framework color

  // Data Art Mapping Architecture
  // 1. Dynamic color shifts depending on Temperature (Cold = Blue, Hot = Orange/Red)
  let rColor = map(visualData.avgTemp, 0, 40, 50, 255);
  let bColor = map(visualData.avgTemp, 0, 40, 255, 50);
  
  // 2. Air Quality Index maps into shape distortion/spikiness (Cleaner = smoother, Polluted = spiky)
  let spikiness = map(visualData.aqi, 0, 150, 0.1, 1.5, true);

  // 3. Wind speed maps into rotation velocity
  let rotationSpeed = frameCount * map(visualData.windSpeed, 0, 50, 0.01, 0.1);

  // 4. Humidity maps into base visual size
  let baseRadius = map(visualData.humidity, 10, 100, 60, 130);

  // Center visual art configuration
  translate(width / 2, height / 2);
  rotate(rotationSpeed);
  
  // Draw continuous geometric organic data loop
  noFill();
  strokeWeight(3);
  
  for (let i = 0; i < 5; i++) {
    // Tiered transparency layer rings
    stroke(rColor, 150 + (i * 20), bColor, 255 - (i * 40));
    beginShape();
    for (let a = 0; a < TWO_PI; a += 0.1) {
      // Noise modulation to generate organic visuals driven by the data values
      let offset = map(noise(sin(a) + 1, cos(a) + 1, frameCount * 0.02 + i * 0.1), 0, 1, -20 * spikiness, 20 * spikiness);
      let r = baseRadius + offset - (i * 15);
      let x = r * cos(a);
      let y = r * sin(a);
      vertex(x, y);
    }
    endShape(CLOSE);
  }

  // Draw non-interactive ambient labels directly on the graphic
  rotate(-rotationSpeed); // Reset rotation for text layer
  textAlign(CENTER, CENTER);
  noStroke();
  fill(246, 173, 85); // Matches #f6ad55 text details color
  textSize(16);
  text(visualData.cityName.toUpperCase(), 0, -10);
  
  textSize(11);
  fill(144, 205, 244, 200);
  text(`AQI: ${Math.round(visualData.aqi)} | Temp: ${Math.round(visualData.avgTemp)}°C`, 0, 15);
}

function loadCity(city) {
  const display = select("#display");
  display.html('<p id="loading">Loading...</p>');

  visualData.cityName = city.name;

  // Endpoint 1: Forecast API
  const weatherUrl = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,wind_speed_10m_max` +
    `&timezone=auto`;

  // Endpoint 2: Air Quality API (Fulfills the "two different sources/endpoints" requirement)
  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&current=european_aqi`;

  // Execute concurrent requests using Promise.all
  Promise.all([
    fetch(weatherUrl).then(res => res.json()),
    fetch(airQualityUrl).then(res => res.json())
  ])
  .then(([weatherData, airData]) => {
    // Process Weather Data
    const dates = weatherData.daily.time;
    const tempMax = weatherData.daily.temperature_2m_max;
    const tempMin = weatherData.daily.temperature_2m_min;
    const humidity = weatherData.daily.relative_humidity_2m_max;
    const windSpeed = weatherData.daily.wind_speed_10m_max;
    const tempUnit = weatherData.daily_units.temperature_2m_max;
    const windUnit = weatherData.daily_units.wind_speed_10m_max;

    // Update global visual values using today's data metrics (index 0)
    visualData.avgTemp = (tempMax[0] + tempMin[0]) / 2;
    visualData.windSpeed = windSpeed[0];
    visualData.humidity = humidity[0];

    // Process Air Quality Data
    visualData.aqi = airData.current.european_aqi || 30; 

    // Render text cards layout safely keeping the existing structural requirement
    renderWeeklyForecast(city.name, dates, tempMax, tempMin, humidity, windSpeed, tempUnit, windUnit);
  })
  .catch((err) => {
    display.html(`<p style="color:salmon;">Error loading data: ${err}</p>`);
  });
}

function renderWeeklyForecast(cityName, dates, tempMax, tempMin, humidity, windSpeed, tempUnit, windUnit) {
  const display = select("#display");
  display.html("");

  const title = createElement("h2", `📍 ${cityName} — 7-Day Forecast`);
  title.parent(display);

  const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  for (let i = 0; i < dates.length; i++) {
    const date = new Date(dates[i]);
    const dayName = daysOfWeek[date.getDay()];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const avgTemp = Math.round((tempMax[i] + tempMin[i]) / 2);

    const dayCard = createElement("div");
    dayCard.class("day-card");
    dayCard.html(`
      <div class="date-header">📅 ${dateStr} (${dayName})</div>
      <div class="weather-details">
        <div class="detail-line">(celsius degrees) ${avgTemp} ${tempUnit}</div>
        <div class="detail-line">(wind speed) ${windSpeed[i]} ${windUnit}</div>
        <div class="detail-line">(max humidity) ${humidity[i]} %</div>
      </div>
    `);
    dayCard.parent(display);
  }
}