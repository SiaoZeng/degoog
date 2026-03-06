let defaultCity = "";
let useFahrenheit = false;

export default {
  name: "Weather",
  description: "Show current weather for a city using Open-Meteo",
  trigger: "weather",
  aliases: ["wttr", "forecast"],

  settingsSchema: [
    {
      key: "defaultCity",
      label: "Default City",
      type: "text",
      placeholder: "London",
      description: "City to use when !weather is run without an argument",
    },
    {
      key: "fahrenheit",
      label: "Use Fahrenheit",
      type: "toggle",
      description: "Display temperature in °F instead of °C",
    },
  ],

  configure(settings) {
    defaultCity = settings.defaultCity || "";
    useFahrenheit = settings.fahrenheit === true || settings.fahrenheit === "true";
  },

  async isConfigured() {
    return true;
  },

  async execute(args) {
    const query = args.trim() || defaultCity;

    if (!query) {
      return {
        title: "Weather",
        html: `<div class="command-result">
          <p>Usage: <code>!weather &lt;city&gt;</code></p>
          <p>You can also set a default city in Settings &rarr; Plugins.</p>
        </div>`,
      };
    }

    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      if (!geoRes.ok) throw new Error(`Geocoding HTTP ${geoRes.status}`);
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        return {
          title: "Weather Error",
          html: `<div class="command-result"><p>Could not find location: <strong>${query}</strong></p></div>`,
        };
      }

      const location = geoData.results[0];
      const lat = location.latitude;
      const lon = location.longitude;
      const locationName = `${location.name}, ${location.country}`;

      const tempUnit = useFahrenheit ? "fahrenheit" : "celsius";
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,uv_index_max&temperature_unit=${tempUnit}&timezone=auto`;

      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) throw new Error(`Weather HTTP ${weatherRes.status}`);
      const weatherData = await weatherRes.json();

      const current = weatherData.current;
      const daily = weatherData.daily;
      const units = weatherData.current_units;

      const temp = `${Math.round(current.temperature_2m)}${units.temperature_2m}`;
      const feels = `${Math.round(current.apparent_temperature)}${units.apparent_temperature}`;
      const humidity = `${current.relative_humidity_2m}${units.relative_humidity_2m}`;
      const wind = `${current.wind_speed_10m} ${units.wind_speed_10m} (${current.wind_direction_10m}&deg;)`;
      
      const high = `${Math.round(daily.temperature_2m_max[0])}${units.temperature_2m}`;
      const low = `${Math.round(daily.temperature_2m_min[0])}${units.temperature_2m}`;
      const uv = daily.uv_index_max[0];

      const codes = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Fog", 51: "Drizzle", 53: "Drizzle", 55: "Drizzle",
        56: "Freezing Drizzle", 57: "Freezing Drizzle", 61: "Rain", 63: "Rain",
        65: "Heavy Rain", 66: "Freezing Rain", 67: "Freezing Rain",
        71: "Snow", 73: "Snow", 75: "Heavy Snow", 77: "Snow Grains",
        80: "Rain Showers", 81: "Rain Showers", 82: "Heavy Rain Showers",
        85: "Snow Showers", 86: "Heavy Snow Showers", 95: "Thunderstorm",
        96: "Thunderstorm with Hail", 99: "Thunderstorm with Hail"
      };
      const desc = codes[current.weather_code] || "Unknown";

      return {
        title: `Weather &mdash; ${locationName}`,
        html: `<div class="command-result">
          <h3 style="margin:0 0 0.5rem">${locationName}</h3>
          <p style="font-size:2rem;margin:0 0 0.25rem;font-weight:600">${temp} <span style="font-size:1rem;font-weight:400;opacity:0.7">${desc}</span></p>
          <p style="margin:0 0 1rem;opacity:0.7">Feels like ${feels} &nbsp;&middot;&nbsp; High ${high} / Low ${low}</p>
          <table style="border-collapse:collapse;font-size:0.875rem">
            <tr><td style="padding:0.2rem 1rem 0.2rem 0;opacity:0.7">Humidity</td><td>${humidity}</td></tr>
            <tr><td style="padding:0.2rem 1rem 0.2rem 0;opacity:0.7">Wind</td><td>${wind}</td></tr>
            <tr><td style="padding:0.2rem 1rem 0.2rem 0;opacity:0.7">UV Index</td><td>${uv}</td></tr>
          </table>
        </div>`,
      };

    } catch (error) {
      const errMessage = error instanceof Error ? error.message : JSON.stringify(error, Object.getOwnPropertyNames(error));
      
      return {
        title: "Weather Error",
        html: `<div class="command-result">
          <p>Could not fetch weather for <strong>${query}</strong>.</p>
          <p>Error details: <code>${errMessage || "Unknown Network Error"}</code></p>
        </div>`,
      };
    }
  },
};