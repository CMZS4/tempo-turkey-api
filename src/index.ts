import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
const { Mppx, tempo } = require('mppx/express');
const { privateKeyToAccount } = require('viem/accounts');
import { getTCMBRates, getCryptoRates, getAllRates, getCommodityRates, getOilPrices, getBISTRates } from './rates';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const RECIPIENT = process.env.RECIPIENT_ADDRESS || '0x9CCFF45b5c1E9B1073D2a72C766f1a8Fd97383e0';
const CURRENCY = '0x20c0000000000000000000000000000000000000';
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

const mppx = Mppx.create({
  methods: [tempo({
    currency: CURRENCY,
    recipient: RECIPIENT,
    account: account,
  })],
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'Tempo Turkey API',
    version: '3.0.0',
    mpp: true,
    pricing: {
      forex: '0.001 USDG per request',
      crypto: '0.002 USDG per request',
      commodities: '0.001 USDG per request',
      oil: '0.001 USDG per request',
      bist: '0.002 USDG per request',
      all: '0.005 USDG per request',
    },
    endpoints: {
      forex: '/rates/forex',
      crypto: '/rates/crypto',
      commodities: '/rates/commodities',
      oil: '/rates/oil',
      bist: '/rates/bist',
      all: '/rates/all',
    }
  });
});

app.get('/rates/forex',
  mppx.charge({ amount: '0.001' }),
  async (req: any, res: any) => {
    try {
      const data = await getTCMBRates();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Doviz verisi alinamadi' });
    }
  }
);

app.get('/rates/crypto',
  mppx.charge({ amount: '0.002' }),
  async (req: any, res: any) => {
    try {
      const data = await getCryptoRates();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Kripto verisi alinamadi' });
    }
  }
);

app.get('/rates/commodities',
  mppx.charge({ amount: '0.001' }),
  async (req: any, res: any) => {
    try {
      const data = await getCommodityRates();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Emtia verisi alinamadi' });
    }
  }
);

app.get('/rates/oil',
  mppx.charge({ amount: '0.001' }),
  async (req: any, res: any) => {
    try {
      const data = await getOilPrices();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Petrol verisi alinamadi' });
    }
  }
);

app.get('/rates/bist',
  mppx.charge({ amount: '0.002' }),
  async (req: any, res: any) => {
    try {
      const data = await getBISTRates();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'BIST verisi alinamadi' });
    }
  }
);

app.get('/rates/all',
  mppx.charge({ amount: '0.005' }),
  async (req: any, res: any) => {
    try {
      const data = await getAllRates();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Veri alinamadi' });
    }
  }
);

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`Tempo Turkey API calisiyor: http://localhost:${PORT}`);
  console.log(`Forex: http://localhost:${PORT}/rates/forex`);
  console.log(`Kripto: http://localhost:${PORT}/rates/crypto`);
  console.log(`Petrol: http://localhost:${PORT}/rates/oil`);
  console.log(`BIST: http://localhost:${PORT}/rates/bist`);
  console.log(`Hepsi: http://localhost:${PORT}/rates/all`);
});