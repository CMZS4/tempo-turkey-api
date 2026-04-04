import axios from 'axios';

// TCMB Döviz Kurları
export async function getTCMBRates() {
  try {
    const response = await axios.get(
      'https://www.tcmb.gov.tr/kurlar/today.xml'
    );
    
    const xml = response.data as string;
    
    const usdMatch = xml.match(/CurrencyCode="USD"[\s\S]*?<BanknoteSelling>(.*?)<\/BanknoteSelling>/);
    const eurMatch = xml.match(/CurrencyCode="EUR"[\s\S]*?<BanknoteSelling>(.*?)<\/BanknoteSelling>/);
    const gbpMatch = xml.match(/CurrencyCode="GBP"[\s\S]*?<BanknoteSelling>(.*?)<\/BanknoteSelling>/);
    const jpyMatch = xml.match(/CurrencyCode="JPY"[\s\S]*?<BanknoteSelling>(.*?)<\/BanknoteSelling>/);

    return {
      source: 'TCMB',
      timestamp: new Date().toISOString(),
      rates: {
        USD_TRY: usdMatch ? parseFloat(usdMatch[1].replace(',', '.')) : null,
        EUR_TRY: eurMatch ? parseFloat(eurMatch[1].replace(',', '.')) : null,
        GBP_TRY: gbpMatch ? parseFloat(gbpMatch[1].replace(',', '.')) : null,
        JPY_TRY: jpyMatch ? parseFloat(jpyMatch[1].replace(',', '.')) : null,
      }
    };
  } catch (error) {
    throw new Error('TCMB verisi alınamadı');
  }
}

// CoinGecko Top 300 Kripto
export async function getCryptoRates() {
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 250,
          page: 1,
          sparkline: false
        }
      }
    );

    const response2 = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets',
      {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 50,
          page: 2,
          sparkline: false
        }
      }
    );

    const allData = [...response.data, ...response2.data];

    const coins = allData.map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price_usd: coin.current_price,
      market_cap: coin.market_cap,
      change_24h: coin.price_change_percentage_24h,
      volume_24h: coin.total_volume,
    }));

    return {
      source: 'CoinGecko',
      timestamp: new Date().toISOString(),
      count: coins.length,
      coins
    };
  } catch (error) {
    throw new Error('Kripto verisi alınamadı');
  }
}

// Altın, Gümüş, Platin, Bakır fiyatları
export async function getCommodityRates() {
  try {
    const apiKey = process.env.METALS_API_KEY;
    const response = await axios.get(
      `https://api.metals.dev/v1/latest?api_key=${apiKey}&currency=USD&unit=toz`
    );

    const metals = response.data.metals;
    const usdTry = await getTCMBRates();
    const usdRate = usdTry.rates.USD_TRY || 0;

    const goldOzUsd = metals.gold;
    const goldGramTry = (goldOzUsd / 31.1035) * usdRate;

    return {
      source: 'Metals.dev + TCMB',
      timestamp: new Date().toISOString(),
      gold: {
        gram: {
          alis: parseFloat((goldGramTry * 0.98).toFixed(2)),
          satis: parseFloat((goldGramTry * 1.02).toFixed(2)),
        },
        ceyrek: {
          alis: parseFloat((goldGramTry * 1.6066 * 0.98).toFixed(2)),
          satis: parseFloat((goldGramTry * 1.6066 * 1.02).toFixed(2)),
        },
        yarim: {
          alis: parseFloat((goldGramTry * 3.2133 * 0.98).toFixed(2)),
          satis: parseFloat((goldGramTry * 3.2133 * 1.02).toFixed(2)),
        },
        tam: {
          alis: parseFloat((goldGramTry * 6.4266 * 0.98).toFixed(2)),
          satis: parseFloat((goldGramTry * 6.4266 * 1.02).toFixed(2)),
        },
      },
      silver_usd: metals.silver,
      platinum_usd: metals.platinum,
      copper_usd: metals.copper,
    };
  } catch (error) {
    throw new Error('Emtia verisi alınamadı');
  }
}

// Petrol & Doğalgaz Fiyatları
export async function getOilPrices() {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    const tcmbData = await getTCMBRates();
    const usdRate = tcmbData.rates.USD_TRY || 0;

    const [brentRes, wtiRes, natgasRes] = await Promise.all([
      axios.get('https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=1d', { headers }),
      axios.get('https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1d&range=1d', { headers }),
      axios.get('https://query1.finance.yahoo.com/v8/finance/chart/NG=F?interval=1d&range=1d', { headers }),
    ]);

    const brentUsd = brentRes.data.chart.result[0].meta.regularMarketPrice;
    const wtiUsd = wtiRes.data.chart.result[0].meta.regularMarketPrice;
    const natgasUsd = natgasRes.data.chart.result[0].meta.regularMarketPrice;

    return {
      source: 'Yahoo Finance + TCMB',
      timestamp: new Date().toISOString(),
      brent: {
        usd: parseFloat(brentUsd.toFixed(2)),
        try: parseFloat((brentUsd * usdRate).toFixed(2)),
      },
      wti: {
        usd: parseFloat(wtiUsd.toFixed(2)),
        try: parseFloat((wtiUsd * usdRate).toFixed(2)),
      },
      natural_gas: {
        usd: parseFloat(natgasUsd.toFixed(2)),
        try: parseFloat((natgasUsd * usdRate).toFixed(2)),
        unit: 'MMBtu',
      },
    };
  } catch (error) {
    throw new Error('Enerji verisi alınamadı');
  }
}

// BIST100 ve Türk Hisse Senetleri
export async function getBISTRates() {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    const symbols = [
      'XU100.IS', 'THYAO.IS', 'GARAN.IS', 'ASELS.IS', 'KCHOL.IS',
      'EREGL.IS', 'BIMAS.IS', 'AKBNK.IS', 'YKBNK.IS', 'TUPRS.IS',
      'SISE.IS', 'SAHOL.IS', 'PGSUS.IS', 'TOASO.IS', 'FROTO.IS',
      'ARCLK.IS', 'TCELL.IS', 'ENKAI.IS', 'EKGYO.IS', 'HALKB.IS',
      'VAKBN.IS',
    ];

    const requests = symbols.map(symbol =>
      axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
        { headers }
      )
    );

    const responses = await Promise.allSettled(requests);

    const stocks = responses
      .map((res, i) => {
        if (res.status !== 'fulfilled') return null;
        const meta = res.value.data.chart.result?.[0]?.meta;
        if (!meta) return null;
        const prev = meta.chartPreviousClose || meta.regularMarketPrice;
        return {
          symbol: symbols[i].replace('.IS', ''),
          name: getStockName(symbols[i]),
          price: parseFloat(meta.regularMarketPrice.toFixed(2)),
          previous_close: parseFloat(prev.toFixed(2)),
          change_percent: parseFloat(
            (((meta.regularMarketPrice - prev) / prev) * 100).toFixed(2)
          ),
          currency: 'TRY',
        };
      })
      .filter(Boolean);

    const bist100 = stocks.find((s: any) => s.symbol === 'XU100');
    const hisseler = stocks.filter((s: any) => s.symbol !== 'XU100');

    return {
      source: 'Yahoo Finance',
      timestamp: new Date().toISOString(),
      bist100: bist100 || null,
      stocks: hisseler,
    };
  } catch (error) {
    throw new Error('BIST verisi alınamadı');
  }
}

function getStockName(symbol: string): string {
  const names: Record<string, string> = {
    'XU100.IS': 'BIST 100',
    'THYAO.IS': 'Türk Hava Yolları',
    'GARAN.IS': 'Garanti BBVA',
    'ASELS.IS': 'Aselsan',
    'KCHOL.IS': 'Koç Holding',
    'EREGL.IS': 'Ereğli Demir Çelik',
    'BIMAS.IS': 'BİM Mağazalar',
    'AKBNK.IS': 'Akbank',
    'YKBNK.IS': 'Yapı Kredi',
    'TUPRS.IS': 'Tüpraş',
    'SISE.IS': 'Şişe Cam',
    'SAHOL.IS': 'Sabancı Holding',
    'PGSUS.IS': 'Pegasus',
    'TOASO.IS': 'Tofaş',
    'FROTO.IS': 'Ford Otosan',
    'ARCLK.IS': 'Arçelik',
    'TCELL.IS': 'Turkcell',
    'ENKAI.IS': 'Enka İnşaat',
    'EKGYO.IS': 'Emlak Konut',
    'HALKB.IS': 'Halkbank',
    'VAKBN.IS': 'Vakıfbank',
  };
  return names[symbol] || symbol;
}

// Tüm veriler bir arada
export async function getAllRates() {
  const [forex, crypto, commodities, oil, bist] = await Promise.allSettled([
    getTCMBRates(),
    getCryptoRates(),
    getCommodityRates(),
    getOilPrices(),
    getBISTRates(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    forex: forex.status === 'fulfilled' ? forex.value : { error: 'Döviz verisi alınamadı' },
    crypto: crypto.status === 'fulfilled' ? crypto.value : { error: 'Kripto verisi alınamadı' },
    commodities: commodities.status === 'fulfilled' ? commodities.value : { error: 'Emtia verisi alınamadı' },
    oil: oil.status === 'fulfilled' ? oil.value : { error: 'Enerji verisi alınamadı' },
    bist: bist.status === 'fulfilled' ? bist.value : { error: 'BIST verisi alınamadı' },
  };
}