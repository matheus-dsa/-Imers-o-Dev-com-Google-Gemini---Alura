let timeoutId;
let suggestionsCache = {};

document.getElementById('location').addEventListener('input', function() {
    const query = this.value.trim();

    if (query.length > 2) { // Começa a sugerir após 3 caracteres
        if (suggestionsCache[query]) {
            displaySuggestions(suggestionsCache[query]);
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fetchSuggestions(query), 300); // Debounce de 300ms
        }
    } else {
        clearSuggestions();
    }
});

document.getElementById('suggestions').addEventListener('click', function(e) {
    if (e.target.tagName === 'LI' || e.target.closest('li')) {
        const selectedItem = e.target.closest('li');
        document.getElementById('location').value = selectedItem.dataset.query;
        clearSuggestions();
        getCoordinates(selectedItem.dataset.query);
    }
});

document.getElementById('location-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const location = document.getElementById('location').value;
    getCoordinates(location);
});

function fetchSuggestions(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=BR`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            suggestionsCache[query] = data;
            displaySuggestions(data);
        })
        .catch(error => console.error('Error:', error));
}

function displaySuggestions(suggestions) {
    const suggestionsList = document.getElementById('suggestions');
    suggestionsList.innerHTML = '';

    suggestions.forEach(suggestion => {
        const address = suggestion.address;
        const city = address.city || address.town || address.village || address.state_district;
        const state = address.state;
        const postcode = address.postcode;
        
        // Formata o display_name para ser mais legível e conciso
        const formattedAddress = `${address.road || ''}, ${city || ''}, ${state || ''}, ${postcode || ''}`.trim().replace(/,\s*,/g, ', ').replace(/^,|,$/g, '');

        // Cria o item de sugestão
        const item = document.createElement('li');
        item.dataset.query = formattedAddress;
        item.innerHTML = `
            <div class="address">
                ${formattedAddress}
            </div>
        `;

        suggestionsList.appendChild(item);
    });
}

function clearSuggestions() {
    document.getElementById('suggestions').innerHTML = '';
}

function getCoordinates(location) {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&addressdetails=1&limit=1`;

    fetch(nominatimUrl)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const { lat, lon } = data[0];
                searchNearby(lat, lon);
            } else {
                document.getElementById('results').innerHTML = '<p>Localização não encontrada.</p>';
            }
        })
        .catch(error => console.error('Error:', error));
}

function searchNearby(lat, lon) {
    // Usar Overpass API para buscar hospitais dentro de um raio de 25 km (25000 metros)
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:25000,${lat},${lon})[amenity=hospital];out;`;

    fetch(overpassUrl)
        .then(response => response.json())
        .then(data => displayResults(data.elements))
        .catch(error => console.error('Error:', error));
}

function displayResults(results) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    if (results.length === 0) {
        resultsContainer.innerHTML = '<p>Nenhum hospital encontrado dentro do raio de 25 km.</p>';
        return;
    }

    results.forEach(hospital => {
        const name = hospital.tags.name || 'Sem nome';
        const address = formatAddress(hospital.tags);
        const item = document.createElement('div');
        item.classList.add('result-item');
        item.innerHTML = `
            <h2>${name}</h2>
            <p><strong>Endereço:</strong> ${address}</p>
            <p><a href="https://www.openstreetmap.org/?mlat=${hospital.lat}&mlon=${hospital.lon}" target="_blank">Localizar no Mapa</a></p>
        `;
        resultsContainer.appendChild(item);
    });
}

function formatAddress(tags) {
    const road = tags['addr:street'] || '';
    const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '';
    const state = tags['addr:state'] || '';
    const postcode = tags['addr:postcode'] || '';
    
    // Formata o endereço para ser mais legível e conciso
    return `${road}, ${city}, ${state}, ${postcode}`.trim().replace(/,\s*,/g, ', ').replace(/^,|,$/g, '');
}
