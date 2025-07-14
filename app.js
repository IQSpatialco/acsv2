// app.js - PlaceTrends Census Explorer: Categorized, Comparison-Ready Charts

const metrics = [
    // Demographics & Households
    {code:"B23001_001E", label:"Population 16+", category: "demographics"},
    {code:"B25003_002E", label:"Owner-occupied housing units", category: "demographics"},
    {code:"B25003_003E", label:"Renter-occupied housing units", category: "demographics"},
    {code:"B25081_002E", label:"Households with mortgage", category: "demographics"},
    {code:"B25081_003E", label:"Households without mortgage", category: "demographics"},
    {code:"B08201_002E", label:"Households with no vehicle", category: "demographics"},
    {code:"B08201_004E", label:"Households with 2+ vehicles", category: "demographics"},
    {code:"B19013_001E", label:"Median household income", category: "demographics"},
    {code:"B19301_001E", label:"Per capita income", category: "demographics"},

    // Housing & Residential Investment
    {code:"B25001_001E", label:"Total housing units", category: "housing"},
    {code:"B25002_002E", label:"Occupied housing units", category: "housing"},
    {code:"B25002_003E", label:"Vacant housing units", category: "housing"},
    {code:"B25024_002E", label:"1-unit detached houses", category: "housing"},
    {code:"B25024_003E", label:"1-unit attached houses", category: "housing"},
    {code:"B25024_004E", label:"2 units", category: "housing"},
    {code:"B25024_005E", label:"3 or 4 units", category: "housing"},
    {code:"B25024_006E", label:"5-9 units", category: "housing"},
    {code:"B25024_007E", label:"10-19 units", category: "housing"},
    {code:"B25024_008E", label:"20+ units", category: "housing"},
    {code:"B25024_010E", label:"Mobile homes", category: "housing"},
    {code:"B25035_001E", label:"Median year structure built", category: "housing"},
    {code:"B25064_001E", label:"Median gross rent", category: "housing"},
    {code:"B25077_001E", label:"Median value owner-occupied", category: "housing"},
    {code:"B25018_001E", label:"Median rooms per unit", category: "housing"},
    {code:"B25058_001E", label:"Median contract rent", category: "housing"},
    {code:"B25091_002E", label:"Median owner costs w/ mortgage", category: "housing"},
    {code:"B25091_005E", label:"Median owner costs no mortgage", category: "housing"},
    {code:"B25070_007E", label:"Households rent >30% income", category: "housing"},
    {code:"B25091_009E", label:"Households owner cost >30% income", category: "housing"},

    // Employment & Workforce
    {code:"B23025_003E", label:"In labor force", category: "employment"},
    {code:"B23025_004E", label:"Employed", category: "employment"},
    {code:"B23025_005E", label:"Unemployed", category: "employment"},
    {code:"B23025_007E", label:"Not in labor force", category: "employment"},
    {code:"B24080_006E", label:"Self-employed workers", category: "employment"},
    {code:"B24080_003E", label:"Private wage/salary workers", category: "employment"},
    {code:"B24080_005E", label:"Government workers", category: "employment"},
    {code:"C24050_003E", label:"Management/business/finance jobs", category: "employment"},
    {code:"C24050_004E", label:"Service jobs", category: "employment"},
    {code:"C24050_005E", label:"Sales/office jobs", category: "employment"},
    {code:"C24050_006E", label:"Natural resources/construction jobs", category: "employment"},
    {code:"C24050_007E", label:"Production/transportation jobs", category: "employment"},
    {code:"B17017_002E", label:"Households below poverty", category: "employment"},

    // Income & Poverty
    {code:"B20002_001E", label:"Median earnings (workers)", category: "income"},

    // Commuting & Transportation
    {code:"B08301_001E", label:"Total workers (commuting)", category: "commuting"},
    {code:"B08303_002E", label:"Workers commute <15 min", category: "commuting"},
    {code:"B08303_010E", label:"Workers commute 60+ min", category: "commuting"},
    {code:"B08006_001E", label:"Workers by means of transportation", category: "commuting"}
];

let map, currentMarker, currentZip = '';

document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    populateYearDropdowns();
    autoLoadSample();
});

function initializeMap() {
    map = L.map('map').setView([40.7128, -74.0060], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    const tabBtn = document.querySelector('button[data-bs-target="#dashboard"]');
    if (tabBtn) {
        tabBtn.addEventListener('shown.bs.tab', function () {
            setTimeout(() => { map.invalidateSize(); }, 200);
        });
    }
}

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

function setupEventListeners() {
    document.getElementById('loadBtn').addEventListener('click', handleLoad);
    document.getElementById('zipInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLoad();
    });
    document.getElementById('compareYear').addEventListener('change', updateComparisonHeader);
}

function autoLoadSample() {
    document.getElementById('zipInput').value = '10001';
    document.getElementById('primaryYear').value = '2023';
    handleLoad();
}

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

async function fetchZBP(zip, year) {
    // Demo only: random data
    return {
        'ZBP_ESTAB': Math.floor(Math.random() * 500) + 50,
        'ZBP_EMP': Math.floor(Math.random() * 2000) + 200,
        'ZBP_PAYANN': Math.floor(Math.random() * 50000) + 10000
    };
}

function formatNumber(value) {
    if (value === null || value === undefined || value === '' || value === '-') return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return 'N/A';
    return num % 1 === 0 ? num.toLocaleString() : num.toFixed(1);
}

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

function renderSummaryCards(data) {
    const summaryCards = [
        { label: "Total Housing Units", value: data["B25001_001E"] },
        { label: "Median Household Income", value: data["B19013_001E"] },
        { label: "Median Home Value", value: data["B25077_001E"] },
        { label: "Unemployment", value: data["B23025_005E"] }
    ];
    document.getElementById('summary-cards').innerHTML = summaryCards.map(card =>
        `<div class="summary-card" style="border-left: 5px solid #00B8A9;">
            <div class="summary-value">${formatNumber(card.value)}</div>
            <div class="summary-label">${card.label}</div>
        </div>`
    ).join('');
}

function renderAllCharts(primaryData, compareData) {
    ['demographics-charts','housing-charts','employment-charts','income-charts','commuting-charts','trend-charts'].forEach(id => {
        document.getElementById(id).innerHTML = '';
    });

    renderPieChart({
        el: 'demographics-charts',
        id: 'occupancyPieChart',
        title: 'Owner vs. Renter-Occupied Units',
        labels: ['Owner-Occupied', 'Renter-Occupied'],
        primary: [primaryData["B25003_002E"], primaryData["B25003_003E"]],
        compare: compareData ? [compareData["B25003_002E"], compareData["B25003_003E"]] : null
    });
    renderBarChart({
        el: 'demographics-charts',
        id: 'mortgageBarChart',
        title: 'Households With/Without Mortgage',
        labels: ['With Mortgage', 'Without Mortgage'],
        primary: [primaryData["B25081_002E"], primaryData["B25081_003E"]],
        compare: compareData ? [compareData["B25081_002E"], compareData["B25081_003E"]] : null
    });
    renderBarChart({
        el: 'demographics-charts',
        id: 'vehicleBarChart',
        title: 'Households by Vehicle Access',
        labels: ['No Vehicle', '2+ Vehicles'],
        primary: [primaryData["B08201_002E"], primaryData["B08201_004E"]],
        compare: compareData ? [compareData["B08201_002E"], compareData["B08201_004E"]] : null
    });

    renderBarChart({
        el: 'housing-charts',
        id: 'housingTypeBarChart',
        title: 'Housing Unit Types',
        labels: [
            "1-unit detached", "1-unit attached", "2 units", "3-4 units",
            "5-9 units", "10-19 units", "20+ units", "Mobile homes"
        ],
        primary: [
            primaryData["B25024_002E"], primaryData["B25024_003E"], primaryData["B25024_004E"],
            primaryData["B25024_005E"], primaryData["B25024_006E"], primaryData["B25024_007E"],
            primaryData["B25024_008E"], primaryData["B25024_010E"]
        ],
        compare: compareData ? [
            compareData["B25024_002E"], compareData["B25024_003E"], compareData["B25024_004E"],
            compareData["B25024_005E"], compareData["B25024_006E"], compareData["B25024_007E"],
            compareData["B25024_008E"], compareData["B25024_010E"]
        ] : null
    });
    renderBarChart({
        el: 'housing-charts',
        id: 'occupancyBarChart',
        title: 'Occupied vs. Vacant Units',
        labels: ['Occupied', 'Vacant'],
        primary: [primaryData["B25002_002E"], primaryData["B25002_003E"]],
        compare: compareData ? [compareData["B25002_002E"], compareData["B25002_003E"]] : null
    });

    renderBarChart({
        el: 'employment-charts',
        id: 'laborBarChart',
        title: 'Labor Force Status',
        labels: ['In Labor Force', 'Employed', 'Unemployed', 'Not in Labor Force'],
        primary: [
            primaryData["B23025_003E"], primaryData["B23025_004E"],
            primaryData["B23025_005E"], primaryData["B23025_007E"]
        ],
        compare: compareData ? [
            compareData["B23025_003E"], compareData["B23025_004E"],
            compareData["B23025_005E"], compareData["B23025_007E"]
        ] : null
    });
    renderBarChart({
        el: 'employment-charts',
        id: 'sectorBarChart',
        title: 'Employment by Sector',
        labels: [
            "Private Wage/Salary", "Government", "Self-Employed"
        ],
        primary: [
            primaryData["B24080_003E"], primaryData["B24080_005E"], primaryData["B24080_006E"]
        ],
        compare: compareData ? [
            compareData["B24080_003E"], compareData["B24080_005E"], compareData["B24080_006E"]
        ] : null
    });

    renderBarChart({
        el: 'income-charts',
        id: 'incomeBarChart',
        title: 'Income Metrics',
        labels: [
            "Median Household Income",
            "Per Capita Income", "Median Earnings (Workers)"
        ],
        primary: [
            primaryData["B19013_001E"],
            primaryData["B19301_001E"], primaryData["B20002_001E"]
        ],
        compare: compareData ? [
            compareData["B19013_001E"],
            compareData["B19301_001E"], compareData["B20002_001E"]
        ] : null
    });
    renderBarChart({
        el: 'income-charts',
        id: 'povertyBarChart',
        title: 'Households Below Poverty',
        labels: ['Below Poverty'],
        primary: [primaryData["B17017_002E"]],
        compare: compareData ? [compareData["B17017_002E"]] : null
    });

    renderBarChart({
        el: 'commuting-charts',
        id: 'commuteBarChart',
        title: 'Commuting Times',
        labels: ['Total Workers', '<15 min', '60+ min'],
        primary: [
            primaryData["B08301_001E"],
            primaryData["B08303_002E"],
            primaryData["B08303_010E"]
        ],
        compare: compareData ? [
            compareData["B08301_001E"],
            compareData["B08303_002E"],
            compareData["B08303_010E"]
        ] : null
    });

    renderLineChart({
        el: 'trend-charts',
        id: 'incomeTrendChart',
        title: 'Median Household Income: Year Comparison',
        labels: ['Primary', 'Comparison'],
        primary: [primaryData["B19013_001E"]],
        compare: compareData ? [compareData["B19013_001E"]] : null
    });
}

function sanitizeArray(arr) {
    return arr.map(x => {
        const val = Number(x);
        return isNaN(val) ? 0 : val;
    });
}

// --- PlaceTrends.com Chart Color Palette ---
const PT_PRIMARY = 'rgba(26,35,126,0.85)';   // #1A237E
const PT_SECONDARY = 'rgba(0,184,169,0.7)';  // #00B8A9
const PT_ACCENT = 'rgba(255,111,60,0.7)';    // #FF6F3C
const PT_BG1 = 'rgba(26,35,126,0.15)';
const PT_BG2 = 'rgba(0,184,169,0.15)';
const PT_BG3 = 'rgba(255,111,60,0.15)';

function renderBarChart({el, id, title, labels, primary, compare}) {
    const container = document.getElementById(el);
    const card = document.createElement('div');
    card.className = 'col-md-6 mb-3';
    card.innerHTML = `
        <div class="card">
            <div class="card__header"><strong>${title}</strong></div>
            <div class="card__body">
                <canvas id="${id}" height="180"></canvas>
            </div>
        </div>`;
    container.appendChild(card);
    const ctx = document.getElementById(id).getContext('2d');
    const datasets = [{
        label: 'Primary Year',
        data: sanitizeArray(primary),
        backgroundColor: PT_PRIMARY
    }];
    if (compare) {
        datasets.push({
            label: 'Comparison Year',
            data: sanitizeArray(compare),
            backgroundColor: PT_SECONDARY
        });
    }
    new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderPieChart({el, id, title, labels, primary, compare}) {
    const container = document.getElementById(el);
    const card = document.createElement('div');
    card.className = 'col-md-6 mb-3';
    card.innerHTML = `
        <div class="card">
            <div class="card__header"><strong>${title}</strong></div>
            <div class="card__body">
                <canvas id="${id}" height="180"></canvas>
            </div>
        </div>`;
    container.appendChild(card);
    const ctx = document.getElementById(id).getContext('2d');
    const datasets = [{
        label: 'Primary Year',
        data: sanitizeArray(primary),
        backgroundColor: [PT_PRIMARY, PT_SECONDARY, PT_ACCENT, PT_BG1]
    }];
    if (compare) {
        datasets.push({
            label: 'Comparison Year',
            data: sanitizeArray(compare),
            backgroundColor: [PT_ACCENT, PT_BG2, PT_PRIMARY, PT_SECONDARY],
            borderWidth: 2,
            borderColor: '#fff'
        });
    }
    new Chart(ctx, {
        type: 'pie',
        data: { labels, datasets },
        options: {
            responsive: true,
            plugins: { legend: { display: true } }
        }
    });
}

function renderLineChart({el, id, title, labels, primary, compare}) {
    const container = document.getElementById(el);
    const card = document.createElement('div');
    card.className = 'col-md-6 mb-3';
    card.innerHTML = `
        <div class="card">
            <div class="card__header"><strong>${title}</strong></div>
            <div class="card__body">
                <canvas id="${id}" height="180"></canvas>
            </div>
        </div>`;
    container.appendChild(card);
    const ctx = document.getElementById(id).getContext('2d');
    const datasets = [{
        label: 'Primary Year',
        data: sanitizeArray(primary),
        borderColor: PT_PRIMARY,
        backgroundColor: PT_BG1,
        tension: 0.3
    }];
    if (compare) {
        datasets.push({
            label: 'Comparison Year',
            data: sanitizeArray(compare),
            borderColor: PT_SECONDARY,
            backgroundColor: PT_BG2,
            tension: 0.3
        });
    }
    new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderTable(primaryData, compareData = null) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    tbody.appendChild(createCategoryRow('Demographics & Households'));
    metrics.filter(m => m.category === "demographics").forEach(metric => tbody.appendChild(createMetricRow(metric, primaryData, compareData)));
    tbody.appendChild(createCategoryRow('Housing & Residential Investment'));
    metrics.filter(m => m.category === "housing").forEach(metric => tbody.appendChild(createMetricRow(metric, primaryData, compareData)));
    tbody.appendChild(createCategoryRow('Employment & Workforce'));
    metrics.filter(m => m.category === "employment").forEach(metric => tbody.appendChild(createMetricRow(metric, primaryData, compareData)));
    tbody.appendChild(createCategoryRow('Income & Poverty'));
    metrics.filter(m => m.category === "income").forEach(metric => tbody.appendChild(createMetricRow(metric, primaryData, compareData)));
    tbody.appendChild(createCategoryRow('Commuting & Transportation'));
    metrics.filter(m => m.category === "commuting").forEach(metric => tbody.appendChild(createMetricRow(metric, primaryData, compareData)));
}
function createCategoryRow(label) {
    const compareYear = document.getElementById('compareYear').value;
    const colspan = compareYear ? 3 : 2;
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="${colspan}" class="metric-category">${label}</td>`;
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
        renderTable(primaryData, compareData);
        renderAllCharts(primaryData, compareData);
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

async function updateMap(zip) {
    try {
        const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (!response.ok) throw new Error('Location not found');
        const data = await response.json();
        const lat = parseFloat(data.places[0].latitude);
        const lon = parseFloat(data.places[0].longitude);
        if (currentMarker) map.removeLayer(currentMarker);
        // PlaceTrends accent teal for marker
        currentMarker = L.circleMarker([lat, lon], {
            color: '#00B8A9', fillColor: '#00B8A9', fillOpacity: 0.6, radius: 9
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
