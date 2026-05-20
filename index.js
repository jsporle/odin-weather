const apiKey = 'GSJTBJSLUNFG4X83VWJ9VGLGQ';

function createForm(parent) {
  const formContainer = document.createElement('form');
  formContainer.className = 'form-container';
  parent.appendChild(formContainer);

  const searchBox = document.createElement('input');
  searchBox.className = 'search-box';
  formContainer.appendChild(searchBox);

  const searchBtn = document.createElement('button');
  searchBtn.type = 'submit';
  searchBtn.className = 'search-btn';
  searchBtn.textContent = 'Search';
  formContainer.appendChild(searchBtn);

  return { searchBox, searchBtn }; 
}

function createWeatherDisplay(weatherData) {
  const elementContainer = document.createElement('div');
  elementContainer.className = 'weather-card';

  if (!weatherData) {
    elementContainer.textContent = "Sorry, we don't recognise that location or it is too broad! Please try again.";
    return elementContainer;
  }

  // const iconMap = {
  //   'snow': '❄️',
  //   'rain': '🌧️',
  //   'fog': '🌫️',
  //   'wind': '💨',
  //   'cloudy': '☁️',
  //   'partly-cloudy-day': '⛅',
  //   'partly-cloudy-night': '☁️',
  //   'clear-day': '☀️',
  //   'clear-night': '🌙'
  // };

  const iconMap = {
    'clear-day': 'sunny',
    'clear-night': 'nightlight',
    'rain': 'rainy',
    'snow': 'snowing',
    'wind': 'air',
    'fog': 'foggy',
    'cloudy': 'cloud',
    'partly-cloudy-day': 'partly_cloudy_day',
    'partly-cloudy-night': 'partly_cloudy_night'
  };

  let currentIconValue = weatherData.icon;
  const lowerDesc = weatherData.description.toLowerCase();

  if (currentIconValue === 'rain' && (lowerDesc.includes('no rain') || lowerDesc.includes('dry'))) {
    currentIconValue = 'cloudy';
  }

  const weatherEmoji = iconMap[currentIconValue] || 'cloudy';

  const emojiDisplay = document.createElement('span');
  emojiDisplay.className = 'material-symbols-outlined weather-icon';
  emojiDisplay.textContent = weatherEmoji;
  elementContainer.appendChild(emojiDisplay);

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'weather-content-wrapper';

  const title = document.createElement('h3');
  title.textContent = weatherData.location;
  contentWrapper.appendChild(title);

  const descDiv = document.createElement('div');
  descDiv.className = 'weather-desc-container';
  const descSpan = document.createElement('span');
  descSpan.textContent = weatherData.description;
  descDiv.appendChild(descSpan);
  contentWrapper.appendChild(descDiv);

  const statsContainer = document.createElement('div');
  statsContainer.className = 'weather-stats-container';

  const stats = [
    { label: 'Average temp: ', value: `${weatherData.averageTemp}°C` },
    { label: 'Current temp: ', value: `${weatherData.currentTemp}°C` },
    { label: 'Current conditions: ', value: `${weatherData.currentDesc}` },
  ];

  stats.forEach(stat => {
    const statDiv = document.createElement('div');
    const statLabel = document.createElement('span');
    statLabel.textContent = stat.label;
    const statValue = document.createElement('span')
    statValue.textContent = stat.value;

    statDiv.appendChild(statLabel);
    statDiv.appendChild(statValue);
    statsContainer.appendChild(statDiv);
  });

  contentWrapper.appendChild(statsContainer);
  elementContainer.appendChild(contentWrapper);

  return elementContainer;
}


//   const elementSpan = document.createElement('span');
//   elementSpan.textContent = contents;

//   elementContainer.appendChild(elementSpan);

//   return elementContainer;
// }

function tidySearch(input) {
  const rawInput = input.value
  if (rawInput.trim() === '') return null;

  return rawInput.trim().toLowerCase();
}

async function lookupWeather(input) {
  if (!input) return null;

  try {
    const encodedInput = encodeURIComponent(input);
    const response = await fetch(`https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline`
      + `/${input}`
      + `?key=${apiKey}`
      + `&unitGroup=uk`);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`API rejected request: ${errorText}`)
      return null;
    }
    const data = await response.json();

    let fullAddressName = await getFullAddress(data.latitude, data.longitude, input);

    if (!fullAddressName) {
      fullAddressName = input.charAt(0).toUpperCase() + input.slice(1);
    }
    
    console.log(`Showing weather for: ${fullAddressName}`)
    
    const today = data.days[0];
    const current = data.currentConditions;

    return {
      location: `Showing weather for: ${fullAddressName}`,
      description: data.description,
      averageTemp: today.temp,
      currentTemp: current.temp,
      currentDesc: current.conditions,
      icon: current.icon,
    };

  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
};

async function getFullAddress(lat, lon, userInput = '') {
  try {
    if (userInput) {
      const encodedInput = encodeURIComponent(userInput);

      const margin = 0.1;
      const minLon = lon - margin;
      const maxLon = lon + margin;
      const minLat = lat - margin;
      const maxLat = lat + margin;

      const structuredSearchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedInput}&viewbox=${minLon},${minLat},${maxLon},${maxLat}&bounded=1&addressdetails=1&limit=1`;

      const searchResponse = await fetch(structuredSearchUrl, { headers: { 'User-Agent': 'JoshWeatherApp' } });
      const searchData = await searchResponse.json();

      if (searchData && searchData.length > 0) {
        const match = searchData[0].address;

        let targetPlace = match.village ||
                          match.suburb ||
                          match.neighbourhood ||
                          match.town ||
                          match.city ||
                          searchData[0].name ||
                          '';

        let region = match.county || match.state || match.province || '';
        let country = match.country || '';

        let locationParts = [];
        if (targetPlace) locationParts.push(targetPlace);
        if (region && region.toLowerCase() !== targetPlace.toLowerCase()) locationParts.push(region);
        if (country) locationParts.push(country);

        return locationParts.join(', ');
      }
    }

    const reverseResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`,
        { headers: { 'User-Agent': 'JoshWeatherApp' }}
      );
      const reverseData = await reverseResponse.json();

      if (reverseData && reverseData.address) {
        const addr = reverseData.address;
        
        let targetPlace = addr.village ||
                          addr.suburb ||
                          addr.neighbourhood || 
                          addr.town || 
                          addr.city || 
                          '';

        let region = addr.county ||
                      addr.state ||
                     addr.province ||
                     '';

        let country = addr.country || '';

        let locationParts = [];
        if (targetPlace) locationParts.push(targetPlace);
        if (region && region.toLowerCase() !== targetPlace.toLowerCase()) locationParts.push(region);
        if (country) locationParts.push(country);

        return locationParts.join(', ');
      }

      return reverseData.display_name || null;

    } catch (error) {
        console.error("Geocoding failed:", error);
        return null;
    }
};

const { searchBox, searchBtn } = createForm(document.body);
let weatherDisplay = null;

searchBtn.addEventListener('click', (search) => {
  search.preventDefault();
  const cleanOutput = tidySearch(searchBox);
  
  if (!cleanOutput) return;
  document.body.classList.add('is-loading');
  
  console.log(`You searched for ${cleanOutput}!`);

  lookupWeather(cleanOutput)
  .then(weatherString => {
    if (weatherDisplay) {
      document.body.removeChild(weatherDisplay);
    }
    weatherDisplay = createWeatherDisplay(weatherString);
    document.body.appendChild(weatherDisplay);
    searchBox.value = ''
  })
  .catch(error => {
    console.error('Error processing weather:', error);
  })
  .finally(() => {
    document.body.classList.remove('is-loading');
  })

});
