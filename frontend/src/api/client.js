import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

// 당첨번호
export const getDraws = (page = 1, size = 20) =>
  client.get('/draws', { params: { page, size } }).then(r => r.data);

export const getLatestDraw = () =>
  client.get('/draws/latest').then(r => r.data);

export const getDrawByRound = (roundNo) =>
  client.get(`/draws/${roundNo}`).then(r => r.data);

// 크롤링
export const crawlAll = () =>
  client.post('/crawl/all').then(r => r.data);

export const crawlRange = (start, end) =>
  client.post('/crawl/range', null, { params: { start, end } }).then(r => r.data);

export const crawlLatest = () =>
  client.post('/crawl/latest').then(r => r.data);

export const getCrawlStatus = () =>
  client.get('/crawl/status').then(r => r.data);

export const getDbStatus = () =>
  client.get('/crawl/db-status').then(r => r.data);

export const manualInput = (params) =>
  client.post('/crawl/manual', null, { params }).then(r => r.data);

export const uploadCsv = (file) => {
  const form = new FormData();
  form.append('file', file);
  return client.post('/crawl/upload-csv', form).then(r => r.data);
};

// 통계
export const getNumberStats = () =>
  client.get('/stats/numbers').then(r => r.data);

export const getCombinationStats = (comboSize = 2, limit = 50, order = 'desc') =>
  client.get('/stats/combinations', { params: { combo_size: comboSize, limit, order } }).then(r => r.data);

export const getRangeStats = (limit = 50) =>
  client.get('/stats/ranges', { params: { limit } }).then(r => r.data);

export const validateNumbers = (numbers) =>
  client.post('/stats/validate', { numbers }).then(r => r.data);

// 예측
export const generatePredictions = () =>
  client.post('/predictions/generate').then(r => r.data);

export const generateTypedPredictions = () =>
  client.post('/predictions/generate/typed').then(r => r.data);

export const getLatestPredictions = () =>
  client.get('/predictions/latest').then(r => r.data);

export const getPredictionsByRound = (round) =>
  client.get(`/predictions/${round}`).then(r => r.data);

// 백테스트
export const runBacktest = (rounds = 10) =>
  client.post('/predictions/backtest', null, { params: { rounds } }).then(r => r.data);

export const getBacktestResults = () =>
  client.get('/predictions/backtest/results').then(r => r.data);

export default client;
