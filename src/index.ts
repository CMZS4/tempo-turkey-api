import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import { getTCMBRates, getCryptoRates, getAllRates, getCommodityRates } from './rates';
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Ana sayfa
app.get('/', (req, res) => {
  res.json({
    name: 'Tempo Turkey API',
    version: '2.0.0',
    endpoints: {
      forex: '/rates/forex',
      crypto: '/rates/crypto',
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
// Emtia fiyatları
app.get('/rates/commodities', async (req, res) => {
  try {
    const data = await getCommodityRates();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Emtia verisi alınamadı' });
  }
});// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`✅ Tempo Turkey API çalışıyor: http://localhost:${PORT}`);
  console.log(`📈 Forex: http://localhost:${PORT}/rates/forex`);
  console.log(`🪙 Kripto: http://localhost:${PORT}/rates/crypto`);
  console.log(`🌍 Hepsi: http://localhost:${PORT}/rates/all`);
});