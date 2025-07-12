// app.js - Census Data Explorer with Charts and Summary Cards

// 1. Metrics configuration (Detailed Table variables only)
const metrics = [
    // Housing/Residential Investment Metrics
    {code:"B25001_001E", label:"Total housing units"},
    {code:"B25002_002E", label:"Occupied housing units"},
    {code:"B25002_003E", label:"Vacant housing units"},
    {code:"B25003_002E", label:"Owner-occupied housing units"},
    {code:"B25003_003E", label:"Renter-occupied housing units"},
    {code:"B25024_002E", label:"1-unit detached houses"},
    {code:"B25024_003E", label:"1-unit attached houses"},
    {code:"B25024_004E", label:"2 units"},
    {code:"B25024_005E", label:"3 or 4 units"},
    {code:"B25024_006E", label:"5-9 units"},
    {code:"B25024_007E", label:"10-19 units"},
    {code:"B25024_008E", label:"20+ units"},
    {code:"B25024_010E", label:"Mobile homes"},
    {code:"B25035_001E", label:"Median year structure built"},
    {code:"B25064_001E", label:"Median gross rent"},
    {code:"B25077_001E", label:"Median value owner-occupied"},
    {code:"B25018_001E", label:"Median rooms per unit"},
    {code:"B25058_001E", label:"Median contract rent"},
    {code:"B25091_002E", label:"Median owner costs w/ mortgage"},
    {code:"B25091_005E", label:"Median owner costs no mortgage"},
    {code:"B25081_002E", label:"Households with mortgage"},
    {code:"B25081_003E", label:"Households without mortgage"},
    {code:"B25070_007E", label:"Households rent >30% income"},
    {code:"B25091_009E", label:"Households owner cost >30% income"},
    {code:"B19013_001E", label:"Median household income"},
    // Business & Employment Metrics
    {code:"B23001_001E", label:"Population 16+"},
    {code:"B23025_003E", label:"In labor force"},
    {code:"B23025_004E", label:"Employed"},
    {code:"B23025_005E", label:"Unemployed"},
    {code:"B23025_007E", label:"Not in labor force"},
    {code:"B24080_006E", label:"Self-employed workers"},
    {code:"B24080_003E", label:"Private wage/salary workers"},
    {code:"B24080_005E", label:"Government workers"},
    {code:"B08303_001E", label:"Mean travel time to work"},
    {code:"B08006_001E", label:"Workers by means of transportation"},
    {code:"C24050_003E", label:"Management/business/finance jobs"},
    {code:"C24050_004E", label:"Service jobs"},
    {code:"C24050_005E", label:"Sales/office jobs"},
    {code:"C24050_006E", label:"Natural resources/construction jobs"},
    {code:"C24050_007E", label:"Production/transportation jobs"},
    {code:"B17017_002E", label:"Households below poverty"},
    {code:"B19301_001E", label:"Per capita income"},
    {code:"B19025_001E", label:"Mean household income"},
    {code:"B20002_001E", label:"Median earnings (workers)"},
    {code:"B08301_001E", label:"Total workers (commuting)"},
    {code:"B08303_002E", label:"Workers commute <15 min"},
    {code:"B08303_010E", label:"Workers commute 60+ min"},
    {code:"B08201_002E", label:"Households with no vehicle"},
    {code:"B08201_004E", label:"Households with 2+ vehicles"}
];

// Chart.js chart instances
let housingChartInstance, occupancyChartInstance;

// 2. Global variables
let map;
let currentMarker;
let currentZip = '';

// 3. Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    populateYearDropdowns();
    autoLoadSample();
});

// 4. Initialize Leaflet map
function initializeMap() {
    map = L.map('map').setView([40.7128, -74.0060], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// 5. Populate year dropdowns
function populateYearDropdowns() {
    const primarySelect = document.getElementById('primaryYear');
    const compareSelect = document.getElementById('compareYear');
    const years = [
        {value: '2023', label: '2023 (2019-2023)'},
        {value: '2022', label: '2022 (2018-2022)'},
        {value: '2021', label: '2021 (2017-2021)'},
        {value: '2020', label: '2020 (2016-2020)'},
        {value: '2019', label: '2019 (2015-2019)'},
        {value: '2018', label: '2018 (2014-2018)'},
        {value: '2017', label: '2017 (2013-2017)'}
    ];
    primarySelect.innerHTML = '';
    compareSelect.innerHTML = '<option value="">No comparison</option>';
    years.forEach(year => {
        primarySelect.add(new Option(year.label, year.value));
        compareSelect.add(new Option(year.label, year.value));
    });
    primarySelect.value = '2023';
}

// 6. Setup event listeners
function setupEventListeners() {
    document.getElementById('loadBtn').addEventListener('click', handleLoad);
    document.getElementById('zipInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLoad();
    });
    document.getElementById('compareYear').addEventListener('change', updateComparisonHeader);
}

// 7. Auto-load a sample ZIP code
function autoLoadSample() {
    document.getElementById('zipInput').value = '10001';
    document.getElementById('primaryYear').value = '2023';
    handleLoad();
}

// 8. Fetch ACS data via Netlify function proxy (batched)
async function fetchACS(zip, year) {
    const codes = metrics.map(m => m.code);
    const maxVars = 50;
    let allResults = {};

    for (let i = 0; i < codes.length; i += maxVars) {
        const varsBatch = codes.slice(i, i + maxVars);
        const varsString = varsBatch.join(',');
        const url = `/.netlify/functions/census?zip=${zip}&year=${year}&vars=${varsString}`;
        const response = await fetch(url);
        if (!response.ok) {
            let errMsg = `Census API proxy returned ${response.status}`;
            try {
                const errObj = await response.json();
                if (errObj && errObj.error) errMsg = errObj.error;
            } catch {}
            throw new Error(errMsg);
        }
        const data = await response.json();
        if (!data || data.length < 2) throw new Error('No data returned from Census API proxy');
        const headers = data[0], values = data[1];
        headers.forEach((header, idx) => {
            if (header !== 'zip code tabulation area') allResults[header] = values[idx];
        });
    }
    return allResults;
}

// 9. Fetch ZBP data (mock/demo)
async function fetchZBP(zip, year) {
    // Replace with a real proxy if you build one for ZBP
    return {
        'ZBP_ESTAB': Math.floor(Math.random() * 500) + 50,
        'ZBP_EMP': Math.floor(Math.random() * 2000) + 200,
        'ZBP_PAYANN': Math.floor(Math.random() * 50000) + 10000
    };
}

// 10. Format number for display
function formatNumber(value) {
    if (value === null || value === undefined || value === '' || value === '-') return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return 'N/A';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    if (num % 1 === 0) return num.toLocaleString();
    return num.toFixed(1);
}

// 11. Update comparison header
function updateComparisonHeader() {
    const compareYear = document.getElementById('compareYear').value;
    const comparisonHeader = document.getElementById('comparisonHeader');
    if (compareYear) {
        comparisonHeader.textContent = `vs ${compareYear}`;
        comparisonHeader.style.display = 'table-cell';
    } else {
        comparisonHeader.style.display = 'none';
    }
}

// 12. Render summary cards
function renderSummaryCards(data) {
    const summaryCards = [
        { label: "Total Housing Units", value: data["B25001_001E"] },
        { label: "Median Household Income", value: data["B19013_001E"] },
        { label: "Median Home Value", value: data["B25077_001E"] },
        { label: "Unemployment", value: data["B23025_005E"] }
    ];
    document.getElementById('summary-cards').innerHTML = summaryCards.map(card =>
        `<div class="summary-card">
            <div class="summary-value">${formatNumber(card.value)}</div>
            <div class="summary-label">${card.label}</div>
        </div>`
    ).join('');
}

// 13. Render housing bar chart
function renderHousingBarChart(data) {
    const ctx = document.getElementById('housingBarChart').getContext('2d');
    if (housingChartInstance) housingChartInstance.destroy();
    housingChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [
                "1-unit detached", "1-unit attached", "2 units", "3-4 units",
                "5-9 units", "10-19 units", "20+ units", "Mobile homes"
            ],
            datasets: [{
                label: 'Units',
                data: [
                    data["B25024_002E"], data["B25024_003E"], data["B25024_004E"],
                    data["B25024_005E"], data["B25024_006E"], data["B25024_007E"],
                    data["B25024_008E"], data["B25024_010E"]
                ].map(Number),
                backgroundColor: 'rgba(33,128,141,0.7)'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// 14. Render occupancy pie chart
function renderOccupancyPieChart(data) {
    const ctx = document.getElementById('occupancyPieChart').getContext('2d');
    if (occupancyChartInstance) occupancyChartInstance.destroy();
    occupancyChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ["Owner-Occupied", "Renter-Occupied"],
            datasets: [{
                data: [data["B25003_002E"], data["B25003_003E"]].map(Number),
                backgroundColor: ['#21808d', '#a84b2f']
            }]
        },
        options: { responsive: true }
    });
}

// 15. Render data table
function renderTable(primaryData, compareData = null) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    // Housing section
    tbody.appendChild(createCategoryRow('Housing & Residential Investment'));
    metrics.slice(0, 25).forEach(metric => tbody.appendChild(createMetricRow(metric, primaryData, compareData)));
    // Business section
    tbody.appendChild(createCategoryRow('Business & Employment'));
    metrics.slice(25).forEach(metric => tbody.appendChild(createMetricRow(metric, primaryData, compareData)));
}
function createCategoryRow(label) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="3" class="metric-category">${label}</td>`;
    return row;
}
function createMetricRow(metric, primaryData, compareData) {
    const row = document.createElement('tr');
    const primaryValue = primaryData[metric.code] || 'N/A';
    const compareValue = compareData ? compareData[metric.code] : null;
    let comparisonCell = '';
    if (compareValue !== null && compareValue !== undefined) {
        const primNum = parseFloat(primaryValue), compNum = parseFloat(compareValue);
        if (!isNaN(primNum) && !isNaN(compNum)) {
            const diff = primNum - compNum;
            const pctChange = compNum !== 0 ? ((diff / compNum) * 100).toFixed(1) : 0;
            let cellClass = 'comparison-neutral', deltaClass = 'delta-neutral';
            if (diff > 0) { cellClass = 'comparison-increase'; deltaClass = 'delta-positive'; }
            else if (diff < 0) { cellClass = 'comparison-decrease'; deltaClass = 'delta-negative'; }
            comparisonCell = `
                <td class="${cellClass}">
                    <div class="metric-value">${formatNumber(compareValue)}</div>
                    <small class="${deltaClass}">${diff > 0 ? '+' : ''}${formatNumber(diff)} (${pctChange}%)</small>
                </td>
            `;
        } else {
            comparisonCell = `<td class="metric-value">${formatNumber(compareValue)}</td>`;
        }
    } else {
        comparisonCell = '<td>-</td>';
    }
    const compareYear = document.getElementById('compareYear').value;
    const comparisonDisplay = compareYear ? comparisonCell : '';
    row.innerHTML = `
        <td>${metric.label}</td>
        <td class="metric-value">${formatNumber(primaryValue)}</td>
        ${comparisonDisplay}
    `;
    return row;
}

// 16. Handle load button click
async function handleLoad() {
    const zipInput = document.getElementById('zipInput');
    const primaryYear = document.getElementById('primaryYear').value;
    const compareYear = document.getElementById('compareYear').value;
    const loadBtn = document.getElementById('loadBtn');
    const spinner = document.getElementById('loadingSpinner');
    const statusMessages = document.getElementById('statusMessages');
    statusMessages.innerHTML = '';
    const zip = zipInput.value.trim();
    if (!/^\d{5}$/.test(zip)) {
        showMessage('Please enter a valid 5-digit ZIP code', 'danger');
        return;
    }
    loadBtn.disabled = true;
    zipInput.disabled = true;
    spinner.style.display = 'block';
    try {
        currentZip = zip;
        await updateMap(zip);
        const [primaryACS, primaryZBP] = await Promise.all([
            fetchACS(zip, primaryYear),
            fetchZBP(zip, primaryYear)
        ]);
        const primaryData = { ...primaryACS, ...primaryZBP };
        let compareData = null;
        if (compareYear) {
            try {
                const [compareACS, compareZBP] = await Promise.all([
                    fetchACS(zip, compareYear),
                    fetchZBP(zip, compareYear)
                ]);
                compareData = { ...compareACS, ...compareZBP };
            } catch (error) {
                console.warn('Comparison data fetch failed:', error);
                showMessage('Could not load comparison data', 'warning');
            }
        }
        renderSummaryCards(primaryData);
        renderHousingBarChart(primaryData);
        renderOccupancyPieChart(primaryData);
        renderTable(primaryData, compareData);
        updateComparisonHeader();
        document.getElementById('zipDisplayInfo').textContent = `ZIP Code: ${zip}`;
        document.getElementById('primaryYearHeader').textContent = `${primaryYear}`;
        showMessage('Data loaded successfully', 'success');
    } catch (error) {
        console.error('Load error:', error);
        showMessage(`Error loading data: ${error.message}`, 'danger');
    } finally {
        loadBtn.disabled = false;
        zipInput.disabled = false;
        spinner.style.display = 'none';
    }
}

// 17. Update map with ZIP location
async function updateMap(zip) {
    try {
        const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (!response.ok) throw new Error('Location not found');
        const data = await response.json();
        const lat = parseFloat(data.places[0].latitude);
        const lon = parseFloat(data.places[0].longitude);
        if (currentMarker) map.removeLayer(currentMarker);
        currentMarker = L.circleMarker([lat, lon], {
            color: '#21808d', fillColor: '#21808d', fillOpacity: 0.5, radius: 8
        }).addTo(map);
        currentMarker.bindPopup(`
            <strong>ZIP Code: ${zip}</strong><br>
            ${data.places[0]['place name']}, ${data.places[0]['state abbreviation']}<br>
            Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}
        `).openPopup();
        map.flyTo([lat, lon], 12);
    } catch (error) {
        console.error('Map update error:', error);
        showMessage('Could not locate ZIP code on map', 'warning');
    }
}

// 18. Show status message
function showMessage(message, type) {
    const statusMessages = document.getElementById('statusMessages');
    const alertClass = type === 'success' ? 'alert-success' :
        type === 'danger' ? 'alert-danger' :
        type === 'warning' ? 'alert-warning' : 'alert-info';
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    statusMessages.appendChild(alert);
    setTimeout(() => { if (alert.parentNode) alert.remove(); }, 5000);
}
