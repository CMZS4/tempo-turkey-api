import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import { getTCMBRates, getCryptoRates, getAllRates, getCommodityRates, getOilPrices } from './rates';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Ana sayfa
app.get('/', (req, res) => {
  res.json({
    name: 'Tempo Turkey API',
    version: '2.1.0',
    endpoints: {
      forex: '/rates/forex',
      crypto: '/rates/crypto',
      commodities: '/rates/commodities',
      oil: '/rates/oil',
      all: '/rates/all',
    }
  });
});

// Döviz kurları
app.get('/rates/forex', async (req, res) => {
  try {
    const data = await getTCMBRates();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Döviz verisi alınamadı' });
  }
});

// Kripto fiyatları
app.get('/rates/crypto', async (req, res) => {
  try {
    const data = await getCryptoRates();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Kripto verisi alınamadı' });
  }
});

// Emtia fiyatları
app.get('/rates/commodities', async (req, res) => {
  try {
    const data = await getCommodityRates();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Emtia verisi alınamadı' });
  }
});

// Petrol fiyatları
app.get('/rates/oil', async (req, res) => {
  try {
    const data = await getOilPrices();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Petrol verisi alınamadı' });
  }
});

// Hepsi bir arada
app.get('/rates/all', async (req, res) => {
  try {
    const data = await getAllRates();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Veri alınamadı' });
  }
});

// Dashboard arayüzü
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/dashboard.html'));
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`✅ Tempo Turkey API çalışıyor: http://localhost:${PORT}`);
  console.log(`📈 Forex: http://localhost:${PORT}/rates/forex`);
  console.log(`🪙 Kripto: http://localhost:${PORT}/rates/crypto`);
  console.log(`🛢️ Petrol: http://localhost:${PORT}/rates/oil`);
  console.log(`🌍 Hepsi: http://localhost:${PORT}/rates/all`);
});