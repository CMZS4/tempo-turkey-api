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

// BIST 250 Hisse Senetleri
export async function getBISTRates() {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    const symbols = [
      'XU100.IS', // BIST 100 endeksi
      // Bankacılık
      'GARAN.IS', 'AKBNK.IS', 'YKBNK.IS', 'HALKB.IS', 'VAKBN.IS',
      'ISCTR.IS', 'TSKB.IS', 'ALBRK.IS', 'KUVEYT.IS', 'ODEABANK.IS',
      'QNBFB.IS', 'SKBNK.IS', 'FIBABANKA.IS', 'BURCE.IS', 'ICBCT.IS',
      // Holding
      'KCHOL.IS', 'SAHOL.IS', 'DOHOL.IS', 'GUBRF.IS', 'ISFIN.IS',
      'SMART.IS', 'MPARK.IS', 'OYAKC.IS', 'TKFEN.IS', 'GLYHO.IS',
      // Havacılık & Ulaşım
      'THYAO.IS', 'PGSUS.IS', 'CLEBI.IS', 'HAVA.IS', 'TAVHL.IS',
      'UCAK.IS', 'DURDO.IS',
      // Savunma & Teknoloji
      'ASELS.IS', 'ROKET.IS', 'KAREL.IS', 'NETAS.IS', 'LOGO.IS',
      'INDES.IS', 'ARENA.IS', 'LINK.IS', 'DGATE.IS', 'ESCOM.IS',
      'FONET.IS', 'INTEM.IS', 'PKART.IS', 'ISBIR.IS', 'BIMAS.IS',
      // Demir Çelik & Madencilik
      'EREGL.IS', 'KRDMD.IS', 'IZMDC.IS', 'CEMTS.IS', 'DMSAS.IS',
      'KARDEM.IS', 'METUR.IS', 'KOZAA.IS', 'KOZA.IS', 'IPEKE.IS',
      'ZNGDK.IS', 'CELHA.IS',
      // Enerji & Petrokimya
      'TUPRS.IS', 'AYGAZ.IS', 'AKSEN.IS', 'ZOREN.IS', 'ODAS.IS',
      'ENJSA.IS', 'EUPWR.IS', 'AKFEN.IS', 'ENKAI.IS', 'GWIND.IS',
      'FENER.IS', 'MAGEN.IS', 'NUHCM.IS', 'AKENR.IS', 'BERA.IS',
      // Cam & Seramik
      'SISE.IS', 'TRKCM.IS', 'ANACM.IS', 'ANEL.IS', 'EGSER.IS',
      // Otomotiv
      'TOASO.IS', 'FROTO.IS', 'ARCLK.IS', 'OTKAR.IS', 'ASUZU.IS',
      'TTRAK.IS', 'DOAS.IS', 'DOGUB.IS',
      // Perakende & Gıda
      'BIMAS.IS', 'MGROS.IS', 'SOKM.IS', 'CARFA.IS', 'BIZIM.IS',
      'ULKER.IS', 'BANVT.IS', 'TATGD.IS', 'KENT.IS', 'PNAR.IS',
      'AEFES.IS', 'CCOLA.IS', 'PETUN.IS', 'TUKAS.IS', 'SELGD.IS',
      // Tekstil & Giyim
      'BRYAT.IS', 'MAVI.IS', 'BOSSA.IS', 'YATAS.IS', 'DESA.IS',
      'GEDZA.IS', 'ITTFH.IS', 'KORDS.IS', 'LUKSK.IS', 'IPMAN.IS',
      // İnşaat & GYO
      'EKGYO.IS', 'ISGYO.IS', 'TRGYO.IS', 'ALGYO.IS', 'OZNUR.IS',
      'PEKGY.IS', 'HLGYO.IS', 'KGYO.IS', 'RYGYO.IS', 'VKGYO.IS',
      'SNGYO.IS', 'MNGYO.IS', 'DGGYO.IS', 'NUGYO.IS', 'OZKGY.IS',
      // Kimya & İlaç
      'ECILC.IS', 'SELEC.IS', 'ECZYT.IS', 'BIOEN.IS', 'DEVA.IS',
      'BFREN.IS', 'ALFAS.IS', 'TLMAN.IS', 'AVGYO.IS', 'ALKIM.IS',
      // Sigortacılık
      'ANSGR.IS', 'RAYSG.IS', 'GUSGF.IS', 'AKGRT.IS', 'TURSG.IS',
      // Telekomünikasyon & Medya
      'TCELL.IS', 'TTKOM.IS', 'EREGL.IS', 'NTTUR.IS', 'DENGE.IS',
      'DOBUR.IS', 'RYSAS.IS', 'MEDTR.IS',
      // Tarım & Orman
      'AGHOL.IS', 'TBORG.IS', 'BAGFS.IS', 'KSTUR.IS', 'TEZOL.IS',
      // Lojistik & Denizcilik
      'RYSAS.IS', 'GSDHO.IS', 'SDTTR.IS', 'HUBVC.IS', 'GSDDE.IS',
      'DITAS.IS', 'MRSHL.IS', 'UFUK.IS',
      // Diğer Sanayi
      'SASA.IS', 'KERVT.IS', 'GOODY.IS', 'MUTLU.IS', 'GEDIK.IS',
      'PENGD.IS', 'ADEL.IS', 'FMIZP.IS', 'BNTAS.IS', 'TIRE.IS',
      'CIMSA.IS', 'AKCNS.IS', 'BOLUC.IS', 'ADANA.IS', 'MRDIN.IS',
      'UNYEC.IS', 'KONYA.IS', 'AFYON.IS', 'FENIS.IS', 'GOLTS.IS',
      'KAPLM.IS', 'SERVE.IS', 'ONCSM.IS', 'ORGE.IS', 'MEGAP.IS',
      'TUREX.IS', 'KATMR.IS', 'OTOKAR.IS', 'SILVR.IS', 'UFUK.IS',
    ];

    // Tekrar edenleri temizle
    const uniqueSymbols = [...new Set(symbols)];

    // 10'arlı gruplar halinde gönder (rate limit için)
    const chunkSize = 10;
    const chunks = [];
    for (let i = 0; i < uniqueSymbols.length; i += chunkSize) {
      chunks.push(uniqueSymbols.slice(i, i + chunkSize));
    }

    const allResponses: any[] = [];
    for (const chunk of chunks) {
      const requests = chunk.map(symbol =>
        axios.get(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
          { headers }
        ).catch(() => null)
      );
      const results = await Promise.all(requests);
      allResponses.push(...results.map((res, i) => ({ res, symbol: chunk[i] })));
    }

    const stocks = allResponses
      .map(({ res, symbol }) => {
        if (!res) return null;
        const meta = res.data.chart.result?.[0]?.meta;
        if (!meta) return null;
        const prev = meta.chartPreviousClose || meta.regularMarketPrice;
        return {
          symbol: symbol.replace('.IS', ''),
          name: getStockName(symbol),
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
      count: hisseler.length,
      stocks: hisseler,
    };
  } catch (error) {
    throw new Error('BIST verisi alınamadı');
  }
}

function getStockName(symbol: string): string {
  const names: Record<string, string> = {
    'XU100.IS': 'BIST 100',
    'GARAN.IS': 'Garanti BBVA', 'AKBNK.IS': 'Akbank', 'YKBNK.IS': 'Yapı Kredi',
    'HALKB.IS': 'Halkbank', 'VAKBN.IS': 'Vakıfbank', 'ISCTR.IS': 'İş Bankası',
    'TSKB.IS': 'TSKB', 'ALBRK.IS': 'Albaraka Türk', 'QNBFB.IS': 'QNB Finansbank',
    'SKBNK.IS': 'Şekerbank', 'FIBABANKA.IS': 'Fibabanka', 'ICBCT.IS': 'ICBC Turkey',
    'KCHOL.IS': 'Koç Holding', 'SAHOL.IS': 'Sabancı Holding', 'DOHOL.IS': 'Doğan Holding',
    'TKFEN.IS': 'Tekfen Holding', 'GLYHO.IS': 'Global Yatırım Holding',
    'THYAO.IS': 'Türk Hava Yolları', 'PGSUS.IS': 'Pegasus', 'CLEBI.IS': 'Çelebi',
    'TAVHL.IS': 'TAV Havalimanları', 'HAVA.IS': 'Türk Hava Servisi',
    'ASELS.IS': 'Aselsan', 'ROKET.IS': 'Roketsan', 'KAREL.IS': 'Karel',
    'NETAS.IS': 'Netaş', 'LOGO.IS': 'Logo Yazılım', 'INDES.IS': 'İndes',
    'ARENA.IS': 'Arena Bilgisayar', 'LINK.IS': 'Link Bilgisayar',
    'EREGL.IS': 'Ereğli Demir Çelik', 'KRDMD.IS': 'Kardemir',
    'IZMDC.IS': 'İzmir Demir Çelik', 'KOZAA.IS': 'Koza Anadolu',
    'KOZA.IS': 'Koza Altın', 'CELHA.IS': 'Çelik Halat',
    'TUPRS.IS': 'Tüpraş', 'AYGAZ.IS': 'Aygaz', 'AKSEN.IS': 'Aksa Enerji',
    'ZOREN.IS': 'Zorlu Enerji', 'ENKAI.IS': 'Enka İnşaat', 'ENJSA.IS': 'Enerjisa',
    'AKFEN.IS': 'Akfen Holding', 'ODAS.IS': 'Odaş Elektrik',
    'SISE.IS': 'Şişe Cam', 'TRKCM.IS': 'Trakya Cam', 'ANACM.IS': 'Anadolu Cam',
    'TOASO.IS': 'Tofaş', 'FROTO.IS': 'Ford Otosan', 'ARCLK.IS': 'Arçelik',
    'OTKAR.IS': 'Otokar', 'ASUZU.IS': 'Anadolu Isuzu', 'TTRAK.IS': 'Türk Traktör',
    'DOAS.IS': 'Doğuş Otomotiv',
    'BIMAS.IS': 'BİM Mağazalar', 'MGROS.IS': 'Migros', 'SOKM.IS': 'Şok Marketler',
    'ULKER.IS': 'Ülker', 'BANVT.IS': 'Banvit', 'TATGD.IS': 'Tat Gıda',
    'AEFES.IS': 'Anadolu Efes', 'CCOLA.IS': 'Coca-Cola İçecek',
    'MAVI.IS': 'Mavi Giyim', 'BRYAT.IS': 'Borusan Yatırım',
    'EKGYO.IS': 'Emlak Konut', 'ISGYO.IS': 'İş GYO', 'TRGYO.IS': 'Torunlar GYO',
    'ALGYO.IS': 'Alarko GYO',
    'ECILC.IS': 'Eczacıbaşı İlaç', 'ECZYT.IS': 'Eczacıbaşı Yatırım',
    'DEVA.IS': 'Deva Holding',
    'ANSGR.IS': 'Anadolu Sigorta', 'AKGRT.IS': 'Aksigorta',
    'TCELL.IS': 'Turkcell', 'TTKOM.IS': 'Türk Telekom',
    'SASA.IS': 'Sasa Polyester', 'CIMSA.IS': 'Çimsa', 'AKCNS.IS': 'Akçansa',
    'BOLUC.IS': 'Bolu Çimento', 'ADANA.IS': 'Adana Çimento',
    'UNYEC.IS': 'Ünye Çimento', 'KONYA.IS': 'Konya Çimento',
  };
  return names[symbol] || symbol.replace('.IS', '');
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