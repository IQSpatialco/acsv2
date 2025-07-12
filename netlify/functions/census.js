
// netlify/functions/census.js

exports.handler = async (event) => {
  try {
    const apiKey = process.env.CENSUS_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Census API key not set in environment.' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const { zip, year, vars } = event.queryStringParameters || {};
    if (!zip || !year || !vars) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required query parameters: zip, year, vars.' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Validate ZIP (5 digits)
    if (!/^\d{5}$/.test(zip)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'ZIP code must be a 5-digit number.' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Limit variables to 50 (Census API max)
    const varList = vars.split(',');
    if (varList.length > 50) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Too many variables requested. Limit is 50 per request.' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Encode variables for URL safety
    const encodedVars = encodeURIComponent(vars);

    const url = `https://api.census.gov/data/${year}/acs/acs5?get=${encodedVars}&for=zip%20code%20tabulation%20area:${zip}&key=${apiKey}`;
    const resp = await fetch(url);

    const contentType = resp.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!resp.ok) {
      const errorText = await resp.text();
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: errorText }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Only parse as JSON if response is JSON
    const data = isJson ? await resp.json() : await resp.text();
    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: `Proxy error: ${err.message}` }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
