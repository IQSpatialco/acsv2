// app.js - Census Data Explorer (Netlify Function Proxy Version, Batched Requests)

// 1. Metrics configuration
const metrics = [
    // Housing/Residential Investment Metrics (ACS)
    {code:"DP04_0001E", label:"Total housing units", source:"ACS"},
    {code:"DP04_0002E", label:"Occupied housing units", source:"ACS"},
    {code:"DP04_0003E", label:"Vacant housing units", source:"ACS"},
    {code:"DP04_0046E", label:"Median rooms per unit", source:"ACS"},
    {code:"DP04_0089E", label:"Median owner-occupied home value", source:"ACS"},
    {code:"B25035_001E", label:"Median year structure built", source:"ACS"},
    {code:"B25064_001E", label:"Median gross rent ($)", source:"ACS"},
    {code:"B25077_001E", label:"Median value owner-occ ($)", source:"ACS"},
    {code:"B25003_002E", label:"Owner-occupied housing units", source:"ACS"},
    {code:"B25003_003E", label:"Renter-occupied housing units", source:"ACS"},
    {code:"B25024_002E", label:"1-unit detached houses", source:"ACS"},
    {code:"B25024_003E", label:"1-unit attached houses", source:"ACS"},
    {code:"B25024_005E", label:"5-9 unit structures", source:"ACS"},
    {code:"B25024_010E", label:"Mobile homes", source:"ACS"},
    {code:"DP04_0134E", label:"Median gross rent", source:"ACS"},
    {code:"DP04_0001PE", label:"Housing units (%)", source:"ACS"},
    {code:"DP04_0002PE", label:"Occupied units (%)", source:"ACS"},
    {code:"DP04_0003PE", label:"Vacancy rate (%)", source:"ACS"},
    {code:"DP04_0088E", label:"Median owner costs w/mortgage", source:"ACS"},
    {code:"DP04_0138PE", label:"Rent >30% income (%)", source:"ACS"},
    {code:"B25090_002E", label:"Units with mortgage", source:"ACS"},
    {code:"B25106_001E", label:"Owner cost burden >30%", source:"ACS"},
    {code:"B25119_001E", label:"Median HH income by tenure", source:"ACS"},
    {code:"B25113_001E", label:"Median rent (year moved)", source:"ACS"},
    {code:"DP04_0136E", label:"Gross rent as % of income", source:"ACS"},
    // Business/Employment Metrics (ACS + ZBP)
    {code:"DP03_0001E", label:"Population 16+", source:"ACS"},
    {code:"DP03_0004PE", label:"Labor force participation (%)", source:"ACS"},
    {code:"DP03_0009PE", label:"Unemployment rate (%)", source:"ACS"},
    {code:"DP03_0045E", label:"Self-employed (incorporated)", source:"ACS"},
    {code:"DP03_0049E", label:"Self-employed (non-incorp)", source:"ACS"},
    {code:"DP03_0049PE", label:"Self-employed share (%)", source:"ACS"},
    {code:"DP03_0062E", label:"Median household income ($)", source:"ACS"},
    {code:"DP03_0063E", label:"Mean household income ($)", source:"ACS"},
    {code:"DP03_0064E", label:"Per-capita income ($)", source:"ACS"},
    {code:"DP03_0088E", label:"Mean travel time to work (min)", source:"ACS"},
    {code:"DP03_0128PE", label:"Workers: private wage (%)", source:"ACS"},
    {code:"DP03_0129PE", label:"Workers: government (%)", source:"ACS"},
    {code:"DP03_0130PE", label:"Workers: self-employed (%)", source:"ACS"},
    {code:"DP03_0099PE", label:"Families below poverty (%)", source:"ACS"},
    {code:"DP03_0119E", label:"Total firms", source:"ACS"},
    {code:"DP03_0110PE", label:"Management/Business jobs (%)", source:"ACS"},
    {code:"DP03_0118PE", label:"Service jobs (%)", source:"ACS"},
    {code:"DP03_0112PE", label:"Sales/Office jobs (%)", source:"ACS"},
    {code:"DP03_0116PE", label:"Production/Transport jobs (%)", source:"ACS"},
    {code:"DP03_0114PE", label:"Natural resources jobs (%)", source:"ACS"},
    {code:"DP03_0122PE", label:"Workers: commute <15 min (%)", source:"ACS"},
    {code:"DP03_0005E", label:"Civilian labor force", source:"ACS"},
    {code:"DP03_0007E", label:"Employed population", source:"ACS"},
    {code:"DP03_0008E", label:"Unemployed population", source:"ACS"},
    {code:"DP03_0051E", label:"Workers 16+ (commuting)", source:"ACS"},
    {code:"ZBP_ESTAB", label:"Business establishments", source:"ZBP"},
    {code:"ZBP_EMP", label:"Paid employees", source:"ZBP"},
    {code:"ZBP_PAYANN", label:"Annual payroll ($000)", source:"ZBP"}
];

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
    const coreVars = metrics.filter(m => m.source === 'ACS').map(m => m.code);
    const maxVars = 50;
    let allResults = {};

    for (let i = 0; i < coreVars.length; i += maxVars) {
        const varsBatch = coreVars.slice(i, i + maxVars);
        const varsString = varsBatch.join(',');
        const url = `/.netlify/functions/census?zip=${zip}&year=${year}&vars=${varsString}`;
        const response = await fetch(url);
        if (!response.ok) {
            // Try to extract error message from JSON
            let errMsg = `Census API proxy returned ${response.status}`;
            try {
                const errObj = await response.json();
                if (errObj && errObj.error) errMsg = errObj.error;
            } catch {}
            throw new Error(errMsg);
        }
        const data = await response.json();
        if (!data || data.length < 2) throw new Error('No data returned from Census API proxy');
        // Convert to object keyed by variable code
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

// 12. Render data table
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

// 13. Handle load button click
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

// 14. Update map with ZIP location
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

// 15. Show status message
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
