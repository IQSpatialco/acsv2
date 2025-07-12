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

    const url = `https://api.census.gov/data/${year}/acs/acs5?get=${vars}&for=zip%20code%20tabulation%20area:${zip}&key=${apiKey}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      const errorText = await resp.text();
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: errorText }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const data = await resp.json();
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
