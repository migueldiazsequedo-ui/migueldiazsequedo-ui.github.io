window.App = window.App || {};

(function registerServices(app) {
  class WeatherService {
    constructor(config = {}) {
      this.config = config;
      this.defaultCity = config.defaultCity || 'Basauri';
      this.defaultCoords = config.defaultCoords || { latitude: 43.2371, longitude: -2.8823 };
    }

    async getLocalWeather() {
      try {
        const location = await this.resolveLocation();
        const weather = await this.fetchWeather(location.latitude, location.longitude);

        return {
          ...weather,
          locationName: location.name,
          isFallbackLocation: !!location.isFallbackLocation,
          locationMessage: location.message || ''
        };
      } catch (error) {
        throw new Error(`No fue posible cargar el clima. ${error.message}`);
      }
    }

    async resolveLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        ...this.defaultCoords,
        name: this.defaultCity,
        isFallbackLocation: true,
        message: 'La geolocalización no está disponible; se usa Basauri por defecto.'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Geolocalización navegador:', {
          latitude,
          longitude,
          accuracy: position.coords.accuracy
        });
        let locationName = 'Ubicación detectada';

        try {
          if (this.config.openCageApiKey) {
            const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${this.config.openCageApiKey}&language=es&pretty=0&no_annotations=1`;
            const response = await fetch(url);

            if (!response.ok) {
              throw new Error(`OpenCage respondió con estado ${response.status}.`);
            }

            const data = await response.json();
            const result = data?.results?.[0];

            locationName =
              result?.components?.city ||
              result?.components?.town ||
              result?.components?.village ||
              result?.components?.municipality ||
              result?.components?.state ||
              result?.formatted ||
              'Ubicación detectada';
          } else {
            locationName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          }
        } catch (error) {
          console.warn('No se pudo resolver la ciudad:', error);
          locationName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
        }

        resolve({
          latitude,
          longitude,
          name: locationName,
          isFallbackLocation: false,
          message: 'Ubicación obtenida desde el navegador.'
        });
      },
      () => {
        resolve({
          ...this.defaultCoords,
          name: this.defaultCity,
          isFallbackLocation: true,
          message: 'No se concedió permiso de ubicación; se usa Basauri por defecto.'
        });
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  });
}

    async fetchWeather(latitude, longitude) {
      const endpoint =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
        `&timezone=auto`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`La API del clima respondió con estado ${response.status}.`);
      }

      const data = await response.json();
      const current = data.current || {};

      return {
        temperature: current.temperature_2m ?? '--',
        apparentTemperature: current.apparent_temperature ?? '--',
        humidity: current.relative_humidity_2m ?? '--',
        windSpeed: current.wind_speed_10m ?? '--',
        condition: this.mapWeatherCode(current.weather_code)
      };
    }

    mapWeatherCode(code) {
      const codes = {
        0: 'Despejado',
        1: 'Principalmente despejado',
        2: 'Parcialmente nublado',
        3: 'Cubierto',
        45: 'Niebla',
        48: 'Escarcha con niebla',
        51: 'Llovizna ligera',
        61: 'Lluvia ligera',
        71: 'Nieve ligera',
        80: 'Chubascos',
        95: 'Tormenta'
      };

      return codes[code] || 'Condición no disponible';
    }
  }

  class MarketService {
    constructor(config = {}) {
      this.config = config;

      this.syntheticFactors = {
        XCU: { min: 0.97, max: 1.04 }
      };

      this.goldApiSymbolMap = {
        XAU: 'XAU',
        XAG: 'XAG',
        XPT: 'XPT',
        XPD: 'XPD',
        XCU: 'HG'
      };

      this.metalPriceSymbolMap = {
        XAU: 'XAU',
        XAG: 'XAG',
        XPT: 'XPT',
        XPD: 'XPD'
      };
    }

    async getLatestMineralPrices(minerals) {
      const primaryResult = await this.tryGoldAPI(minerals);
      const missingForBackup = minerals.filter((mineral) => !primaryResult.prices[mineral.symbol]);
      const backupResult = await this.tryMetalPriceAPI(missingForBackup);

      const prices = {};
      const simulatedSymbols = [];
      const providerCoverage = [];
      const providerErrors = [
        ...primaryResult.providerErrors,
        ...backupResult.providerErrors
      ];

      minerals.forEach((mineral) => {
        const priceData = primaryResult.prices[mineral.symbol] || backupResult.prices[mineral.symbol];

        if (priceData) {
          prices[mineral.symbol] = priceData;
          providerCoverage.push(`${mineral.symbol}:${priceData.source}`);
          return;
        }

        const fallback = this.generateFallbackPrice(mineral.baseMarketValue, mineral.symbol);
        prices[mineral.symbol] = {
          price: fallback,
          source: 'Simulado',
          error: `Sin cobertura disponible para ${mineral.symbol}.`
        };
        simulatedSymbols.push(mineral.symbol);
      });

      return {
        prices,
        simulatedSymbols,
        providerCoverage,
        providerErrors,
        providerUsed: 'GoldAPI -> MetalPriceAPI -> Simulado'
      };
    }

    async tryGoldAPI(minerals) {
      const prices = {};
      const providerErrors = [];

      const requests = minerals
        .filter((mineral) => this.goldApiSymbolMap[mineral.symbol])
        .map(async (mineral) => {
          const remoteSymbol = this.goldApiSymbolMap[mineral.symbol];

          try {
            const response = await fetch(`https://api.gold-api.com/price/${remoteSymbol}`);

            if (!response.ok) {
              throw new Error(`Gold-API respondió con estado ${response.status} para ${remoteSymbol}.`);
            }

            const data = await response.json();
            console.log(`[GoldAPI] payload ${remoteSymbol}:`, data);

            if (!Number.isFinite(Number(data?.price))) {
              throw new Error(`Gold-API no devolvió un precio válido para ${remoteSymbol}.`);
            }

            prices[mineral.symbol] = {
              price: Number(data.price),
              source: 'GoldAPI'
            };
          } catch (error) {
            providerErrors.push(`GoldAPI ${mineral.symbol}: ${error.message}`);
            console.warn(`[GoldAPI] fallo en ${remoteSymbol}:`, error.message);
          }
        });

      await Promise.all(requests);

      return { prices, providerErrors };
    }

    async tryMetalPriceAPI(minerals) {
      const prices = {};
      const providerErrors = [];

      const supportedMinerals = minerals.filter((mineral) => this.metalPriceSymbolMap[mineral.symbol]);

      if (!supportedMinerals.length) {
        return { prices, providerErrors };
      }

      if (!this.config.metalApiKey) {
        providerErrors.push('MetalPriceAPI no configurada: falta App.config.metalApiKey.');
        return { prices, providerErrors };
      }

      try {
        const symbols = [...new Set(supportedMinerals.map((mineral) => this.metalPriceSymbolMap[mineral.symbol]))];

        const url =
          `https://api.metalpriceapi.com/v1/latest?api_key=${encodeURIComponent(this.config.metalApiKey)}` +
          `&base=USD&currencies=${symbols.join(',')}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`MetalPriceAPI respondió con estado ${response.status}.`);
        }

        const data = await response.json();
        console.log('[MetalPriceAPI] payload completo:', data);

        if (data.success === false) {
          const info =
            data?.error?.info ||
            data?.error?.message ||
            data?.error?.type ||
            `Error code ${data?.error?.code ?? 'desconocido'}`;
          throw new Error(info);
        }

        const rates = data.rates || {};

        supportedMinerals.forEach((mineral) => {
          const remoteSymbol = this.metalPriceSymbolMap[mineral.symbol];
          const direct = rates[remoteSymbol];
          const prefixed = rates[`USD${remoteSymbol}`];
          let value = direct ?? prefixed;

          if (value == null || Number.isNaN(Number(value))) {
            return;
          }

          value = Number(value);

          if (value < 1) {
            value = 1 / value;
          }

          prices[mineral.symbol] = {
            price: Number(value.toFixed(2)),
            source: 'MetalPriceAPI'
          };
        });
      } catch (error) {
        providerErrors.push(`MetalPriceAPI: ${error.message}`);
        console.warn('[MetalPriceAPI] fallo:', error.message);
      }

      return { prices, providerErrors };
    }

    generateFallbackPrice(basePrice, symbol) {
      const custom = this.syntheticFactors[symbol] || { min: 0.98, max: 1.03 };
      const randomFactor = custom.min + Math.random() * (custom.max - custom.min);
      return Number((basePrice * randomFactor).toFixed(2));
    }

    generateHistory(currentPrice) {
      const labels = [];
      const values = [];
      const today = new Date();

      for (let index = 6; index >= 0; index -= 1) {
        const day = new Date(today);
        day.setDate(today.getDate() - index);
        labels.push(day.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }));

        const drift = 1 + ((Math.random() - 0.5) * 0.08);
        const noise = 1 + ((6 - index) * 0.004);
        values.push(Number((currentPrice * drift * noise).toFixed(2)));
      }

      return { labels, values };
    }
  }

  class CurrencyApiService {
    constructor(config = {}) {
      this.apiKey = config.currencyApiKey || '';
    }

    async getRates(base = 'USD', symbols = ['USD', 'EUR', 'GBP', 'JPY']) {
      try {
        const params = new URLSearchParams({
          base,
          symbols: symbols.join(',')
        });

        if (this.apiKey) {
          params.append('access_key', this.apiKey);
        }

        const response = await fetch(`https://api.exchangerate.host/live?${params.toString()}`);

        if (!response.ok) {
          const reason = response.status === 429
            ? 'La API de divisas ha agotado el límite de peticiones.'
            : `La API de divisas respondió con estado ${response.status}.`;
          throw new Error(reason);
        }

        const data = await response.json();

        if (data.success === false) {
          throw new Error(data.error?.info || 'La API de divisas devolvió una respuesta no válida.');
        }

        if (data.quotes) {
          const mappedRates = { USD: 1 };
          Object.entries(data.quotes).forEach(([pair, value]) => {
            mappedRates[pair.replace(base, '')] = value;
          });

          return { rates: mappedRates, source: 'exchangerate.host' };
        }

        return { rates: { ...data.rates, USD: 1 }, source: 'exchangerate.host' };
      } catch (error) {
        return {
          rates: { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 151.2 },
          source: 'Fallback local',
          error: error.message
        };
      }
    }
  }

  app.WeatherService = WeatherService;
  app.MarketService = MarketService;
  app.CurrencyApiService = CurrencyApiService;
})(window.App);