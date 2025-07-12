// netlify/functions/census.js
exports.handler = async (event) => {
  const apiKey = process.env.CENSUS_API_KEY;
  const { zip, year, vars } = event.queryStringParameters;
  const url = `https://api.census.gov/data/${year}/acs/acs5?get=${vars}&for=zip%20code%20tabulation%20area:${zip}&key=${apiKey}`;
  const resp = await fetch(url);
  const data = await resp.json();
  return {
    statusCode: 200,
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  };
};
