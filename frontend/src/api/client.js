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

export const crawlLatest = () =>
  client.post('/crawl/latest').then(r => r.data);

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
