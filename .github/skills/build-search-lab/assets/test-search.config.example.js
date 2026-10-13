// Copy to the git-ignored test-search.config.js and configure it locally.
// Never publish credentials. Browser keys are visible in DevTools.
window.SEARCH_RESOURCES = [{
  label: 'Sandbox',
  endpoint: 'https://<service-name>.search.windows.net',
  apiKey: '',
  adminKey: '',
  indexes: ['<index-name>'],
}];
window.SEARCH_DEFAULT_INDEX = '<index-name>';
window.SEARCH_API_VERSION = '2025-09-01';
