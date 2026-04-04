import axios from 'axios';

// TCMB Doviz Kurlari
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
    throw new Error('TCMB verisi alinamadi');
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
    throw new Error('Kripto verisi alinamadi');
  }
}

// Altin, Gumus, Platin, Bakir fiyatlari
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
    throw new Error('Emtia verisi alinamadi');
  }
}

// Petrol & Dogalgaz Fiyatlari
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
    throw new Error('Enerji verisi alinamadi');
  }
}

// BIST Hisse Senetleri
export async function getBISTRates() {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    const symbols = [
      'XU100.IS','GARAN.IS','AKBNK.IS','YKBNK.IS','HALKB.IS','VAKBN.IS',
      'ISCTR.IS','TSKB.IS','ALBRK.IS','QNBFB.IS','SKBNK.IS','THYAO.IS',
      'PGSUS.IS','TAVHL.IS','CLEBI.IS','ASELS.IS','KAREL.IS','NETAS.IS',
      'LOGO.IS','INDES.IS','ARENA.IS','LINK.IS','EREGL.IS','KRDMD.IS',
      'IZMDC.IS','KOZAA.IS','KOZA.IS','CELHA.IS','TUPRS.IS','AYGAZ.IS',
      'AKSEN.IS','ZOREN.IS','ENKAI.IS','ENJSA.IS','AKFEN.IS','ODAS.IS',
      'SISE.IS','TRKCM.IS','ANACM.IS','TOASO.IS','FROTO.IS','ARCLK.IS',
      'OTKAR.IS','ASUZU.IS','TTRAK.IS','DOAS.IS','BIMAS.IS','MGROS.IS',
      'SOKM.IS','ULKER.IS','BANVT.IS','TATGD.IS','AEFES.IS','CCOLA.IS',
      'MAVI.IS','EKGYO.IS','ISGYO.IS','TRGYO.IS','ALGYO.IS','ECILC.IS',
      'ECZYT.IS','DEVA.IS','ANSGR.IS','AKGRT.IS','TCELL.IS','TTKOM.IS',
      'SASA.IS','CIMSA.IS','AKCNS.IS','BOLUC.IS','ADANA.IS','UNYEC.IS',
      'KONYA.IS','KCHOL.IS','SAHOL.IS','DOHOL.IS','TKFEN.IS','IPEKE.IS',
      'GUBRF.IS','BAGFS.IS','PNAR.IS','PETUN.IS','BRYAT.IS','KORDS.IS',
      'BOSSA.IS','YATAS.IS','GOODY.IS','MUTLU.IS','ADEL.IS','TIRE.IS',
      'MRDIN.IS','AFYON.IS','GOLTS.IS','ORGE.IS','TUREX.IS','SILVR.IS',
      'RYGYO.IS','VKGYO.IS','SNGYO.IS','MNGYO.IS','NUGYO.IS','RAYSG.IS',
    ];

    const symbolList = symbols.join('%2C');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolList}`;

    const response = await axios.get(url, { headers });
    const quotes = response.data.quoteResponse.result;

    const stocks = quotes.map((q: any) => {
      const prev = q.regularMarketPreviousClose || q.regularMarketPrice;
      return {
        symbol: q.symbol.replace('.IS', ''),
        name: getStockName(q.symbol),
        price: parseFloat((q.regularMarketPrice || 0).toFixed(2)),
        previous_close: parseFloat((prev || 0).toFixed(2)),
        change_percent: parseFloat((q.regularMarketChangePercent || 0).toFixed(2)),
        currency: 'TRY',
      };
    });

    const bist100 = stocks.find((s: any) => s.symbol === 'XU100');
    const hisseler = stocks.filter((s: any) => s.symbol !== 'XU100');

    return {
      source: 'Yahoo Finance',
      timestamp: new Date().toISOString(),
      bist100: bist100 || null,
      count: hisseler.length,
      stocks: hisseler,
    };
  } catch (error) {
    throw new Error('BIST verisi alinamadi');
  }
}

function getStockName(symbol: string): string {
  const names: Record<string, string> = {
    'XU100.IS': 'BIST 100',
    'GARAN.IS': 'Garanti BBVA',
    'AKBNK.IS': 'Akbank',
    'YKBNK.IS': 'Yapi Kredi',
    'HALKB.IS': 'Halkbank',
    'VAKBN.IS': 'Vakifbank',
    'ISCTR.IS': 'Is Bankasi',
    'TSKB.IS': 'TSKB',
    'ALBRK.IS': 'Albaraka Turk',
    'QNBFB.IS': 'QNB Finansbank',
    'SKBNK.IS': 'Sekerbank',
    'THYAO.IS': 'Turk Hava Yollari',
    'PGSUS.IS': 'Pegasus',
    'TAVHL.IS': 'TAV Havalimanlari',
    'CLEBI.IS': 'Celebi',
    'ASELS.IS': 'Aselsan',
    'KAREL.IS': 'Karel',
    'NETAS.IS': 'Netas',
    'LOGO.IS': 'Logo Yazilim',
    'INDES.IS': 'Indes',
    'ARENA.IS': 'Arena Bilgisayar',
    'LINK.IS': 'Link Bilgisayar',
    'EREGL.IS': 'Eregli Demir Celik',
    'KRDMD.IS': 'Kardemir',
    'IZMDC.IS': 'Izmir Demir Celik',
    'KOZAA.IS': 'Koza Anadolu',
    'KOZA.IS': 'Koza Altin',
    'CELHA.IS': 'Celik Halat',
    'TUPRS.IS': 'Tupras',
    'AYGAZ.IS': 'Aygaz',
    'AKSEN.IS': 'Aksa Enerji',
    'ZOREN.IS': 'Zorlu Enerji',
    'ENKAI.IS': 'Enka Insaat',
    'ENJSA.IS': 'Enerjisa',
    'AKFEN.IS': 'Akfen Holding',
    'ODAS.IS': 'Odas Elektrik',
    'SISE.IS': 'Sise Cam',
    'TRKCM.IS': 'Trakya Cam',
    'ANACM.IS': 'Anadolu Cam',
    'TOASO.IS': 'Tofas',
    'FROTO.IS': 'Ford Otosan',
    'ARCLK.IS': 'Arcelik',
    'OTKAR.IS': 'Otokar',
    'ASUZU.IS': 'Anadolu Isuzu',
    'TTRAK.IS': 'Turk Traktor',
    'DOAS.IS': 'Dogus Otomotiv',
    'BIMAS.IS': 'BIM Magazalar',
    'MGROS.IS': 'Migros',
    'SOKM.IS': 'Sok Marketler',
    'ULKER.IS': 'Ulker',
    'BANVT.IS': 'Banvit',
    'TATGD.IS': 'Tat Gida',
    'AEFES.IS': 'Anadolu Efes',
    'CCOLA.IS': 'Coca-Cola Icecek',
    'MAVI.IS': 'Mavi Giyim',
    'EKGYO.IS': 'Emlak Konut',
    'ISGYO.IS': 'Is GYO',
    'TRGYO.IS': 'Torunlar GYO',
    'ALGYO.IS': 'Alarko GYO',
    'ECILC.IS': 'Eczacibasi Ilac',
    'ECZYT.IS': 'Eczacibasi Yatirim',
    'DEVA.IS': 'Deva Holding',
    'ANSGR.IS': 'Anadolu Sigorta',
    'AKGRT.IS': 'Aksigorta',
    'TCELL.IS': 'Turkcell',
    'TTKOM.IS': 'Turk Telekom',
    'SASA.IS': 'Sasa Polyester',
    'CIMSA.IS': 'Cimsa',
    'AKCNS.IS': 'Akcansa',
    'BOLUC.IS': 'Bolu Cimento',
    'ADANA.IS': 'Adana Cimento',
    'UNYEC.IS': 'Unye Cimento',
    'KONYA.IS': 'Konya Cimento',
    'KCHOL.IS': 'Koc Holding',
    'SAHOL.IS': 'Sabanci Holding',
    'DOHOL.IS': 'Dogan Holding',
    'TKFEN.IS': 'Tekfen Holding',
    'IPEKE.IS': 'Ipek Dogal Enerji',
    'GUBRF.IS': 'Gubre Fabrikalari',
    'BAGFS.IS': 'Bagfas',
    'PNAR.IS': 'Pinar Sut',
    'PETUN.IS': 'Pinar Et',
    'BRYAT.IS': 'Borusan Yatirim',
    'KORDS.IS': 'Kordsa',
    'BOSSA.IS': 'Bossa',
    'YATAS.IS': 'Yatas',
    'GOODY.IS': 'Goodyear',
    'MUTLU.IS': 'Mutlu Aku',
    'ADEL.IS': 'Adel Kalemcilik',
    'TIRE.IS': 'Tire Kutsan',
    'MRDIN.IS': 'Mardin Cimento',
    'AFYON.IS': 'Afyon Cimento',
    'GOLTS.IS': 'Goltas Cimento',
    'ORGE.IS': 'Orge Enerji',
    'TUREX.IS': 'Tureks',
    'SILVR.IS': 'Silverline',
    'RYGYO.IS': 'Reysas GYO',
    'VKGYO.IS': 'Vakif GYO',
    'SNGYO.IS': 'Sinpas GYO',
    'MNGYO.IS': 'Marti GYO',
    'NUGYO.IS': 'Nurol GYO',
    'RAYSG.IS': 'Ray Sigorta',
  };
  return names[symbol] || symbol.replace('.IS', '');
}

// Tum veriler bir arada
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
    forex: forex.status === 'fulfilled' ? forex.value : { error: 'Doviz verisi alinamadi' },
    crypto: crypto.status === 'fulfilled' ? crypto.value : { error: 'Kripto verisi alinamadi' },
    commodities: commodities.status === 'fulfilled' ? commodities.value : { error: 'Emtia verisi alinamadi' },
    oil: oil.status === 'fulfilled' ? oil.value : { error: 'Enerji verisi alinamadi' },
    bist: bist.status === 'fulfilled' ? bist.value : { error: 'BIST verisi alinamadi' },
  };
}