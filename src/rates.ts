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
// İkinci sayfa (251-300)
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

// Tüm veriler bir arada
export async function getAllRates() {
  const [forex, crypto] = await Promise.allSettled([
    getTCMBRates(),
    getCryptoRates(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    forex: forex.status === 'fulfilled' ? forex.value : { error: 'Döviz verisi alınamadı' },
    crypto: crypto.status === 'fulfilled' ? crypto.value : { error: 'Kripto verisi alınamadı' },
  };
}
