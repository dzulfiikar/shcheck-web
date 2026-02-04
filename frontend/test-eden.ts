import { treaty } from '@elysiajs/eden';
import type { App } from '../backend/src/index';

const api = treaty<App>('http://localhost:3001');

// Test the API structure
async function test() {
  // List scans
  const list = await api.api.scans.get({
    query: { page: 1, limit: 20 }
  });
  
  // Create scan  
  const create = await api.api.scans.post({
    target: 'https://example.com'
  });
  
  // Get scan by ID
  const get = await api.api.scans({ id: 'test' }).get();
  
  // Get scan status
  const status = await api.api.scans({ id: 'test' }).status.get();
}
