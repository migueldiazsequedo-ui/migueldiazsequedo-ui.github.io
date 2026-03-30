window.App = window.App || {};

(function bootstrap(app) {
  const state = {
    minerals: [],
    filteredMinerals: [],
    selectedMineralId: null,
    theme: 'dark'
  };

  const storage = new app.StorageManager();
  const ui = new app.UIManager();
  const converter = new app.CurrencyConverter('EUR');
  const cart = new app.ShoppingCart(app.config.taxRate);
  const weatherService = new app.WeatherService(app.config);
  const marketService = new app.MarketService(app.config);
  const currencyApi = new app.CurrencyApiService(app.config);

  let chartManager = null;

  function init() {
    try {
      if (typeof app.ChartManager !== 'function') {
        throw new Error('ChartManager no está disponible. Revisa que js/charts.js cargue antes de js/app.js.');
      }

      chartManager = new app.ChartManager('#priceChart');

      state.minerals = app.initialMinerals.map((item) => new app.Mineral(item));
      restoreState();
      ui.populateCrystalFilter(state.minerals);
      ui.setTheme(state.theme);
      ui.setCurrency(converter.selectedCurrency);
      ui.updateMohsLabel();
      bindEvents();

      Promise.allSettled([
        refreshMarketData(),
        refreshWeather()
      ]).finally(() => {
        applyFilters();
        renderAll();
      });
    } catch (error) {
      ui.openModal('Error de inicialización', error.message);
    }
  }

  function bindEvents() {
    ui.bindEvents({
      onSearchInput: () => {
        renderSuggestions();
        applyFilters();
        renderAll();
      },
      onMohsChange: () => {
        ui.updateMohsLabel();
        applyFilters();
        renderAll();
      },
      onFilterChange: () => {
        applyFilters();
        renderAll();
      },
      onCurrencyChange: (event) => {
        converter.setSelectedCurrency(event.target.value);
        cart.setCurrency(event.target.value);
        persistState();
        renderAll();
      },
      onWeatherRefresh: async () => {
        await refreshWeather();
      },
      onResetFilters: () => {
        ui.resetFilters();
        applyFilters();
        renderAll();
      },
      onClearCart: () => {
        restoreFullStockFromCart();
        cart.clear();
        persistState();
        renderAll();
      },
      onChartMineralChange: (event) => {
        const mineralId = Number(event.target.value);
        if (!Number.isNaN(mineralId)) {
          state.selectedMineralId = mineralId;
          renderAll();
        }
      },
      onThemeToggle: () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        ui.setTheme(state.theme);
        renderChart();
        persistState();
      }
    });
  }

  async function refreshMarketData() {
    const rateResponse = await currencyApi.getRates('USD', app.config.supportedCurrencies);
    converter.setRates(rateResponse.rates);

    if (rateResponse.error) {
      ui.openModal('Aviso de divisas', `${rateResponse.error} Se aplican tipos de cambio de respaldo.`);
    }

    try {
      const marketResult = await marketService.getLatestMineralPrices(state.minerals);
      const latestPrices = marketResult.prices;

      state.minerals.forEach((mineral) => {
        const priceData = latestPrices[mineral.symbol];

        if (priceData) {
          mineral.updatePrice(priceData.price);
          mineral.priceSource = priceData.source || 'Desconocido';

          const history = marketService.generateHistory(priceData.price);
          mineral.setHistory(history.labels.map((label, index) => ({
            label,
            value: history.values[index]
          })));
        }
      });

      ui.updateLastUpdated(
        `Mercado actualizado · ${new Date().toLocaleTimeString('es-ES')}`,
        marketResult.simulatedSymbols.length ? 'warning' : 'success'
      );

      if (marketResult.providerErrors?.length) {
        console.warn('[refreshMarketData] Errores de proveedor:', marketResult.providerErrors.join(' | '));
      }

      if (marketResult.simulatedSymbols.length) {
        ui.openModal(
          'Cobertura parcial de mercado',
          `Se han obtenido precios API para: ${marketResult.providerCoverage.join(', ') || 'ninguno'}. ` +
          `Los siguientes minerales se muestran con valores simulados: ${marketResult.simulatedSymbols.join(', ')}.`
        );
      }
    } catch (error) {
      ui.updateLastUpdated('Mercado en fallback', 'warning');

      state.minerals.forEach((mineral) => {
        const randomPrice = marketService.generateFallbackPrice(mineral.baseMarketValue, mineral.symbol);
        mineral.updatePrice(randomPrice);
        mineral.priceSource = 'Simulado';

        const history = marketService.generateHistory(randomPrice);
        mineral.setHistory(history.labels.map((label, index) => ({
          label,
          value: history.values[index]
        })));
      });

      console.error('[refreshMarketData] Error real de mercado:', error.message);

      ui.openModal(
        'Error de API de mercado',
        `${error.message} Se han generado precios aleatorios para todos los minerales.`
      );
    }

    if (!state.selectedMineralId && state.minerals.length) {
      state.selectedMineralId = state.minerals[0].id;
    }
  }

  async function refreshWeather() {
    try {
      const weather = await weatherService.getLocalWeather();
      ui.renderWeather(weather);

      if (weather.isFallbackLocation) {
        ui.openModal(
          'Geolocalización no disponible',
          weather.locationMessage || 'Se usa una ubicación por defecto.'
        );
      }
    } catch (error) {
      ui.openModal('Error de clima', error.message);
      ui.renderWeather({
        locationName: app.config.defaultCity,
        condition: 'No disponible',
        temperature: '--',
        apparentTemperature: '--',
        humidity: '--',
        windSpeed: '--',
        isFallbackLocation: true,
        locationMessage: 'No se pudo cargar el clima en este momento.'
      });
    }
  }

  function applyFilters() {
    const filters = ui.getFilters();

    const searched = state.minerals.filter((mineral) => {
      const matchesSearch = !filters.search
        || mineral.name.toLowerCase().includes(filters.search)
        || mineral.symbol.toLowerCase().includes(filters.search);

      const matchesMohs = mineral.mohsHardness >= filters.minMohs;
      const matchesCrystal = filters.crystalSystem === 'all' || mineral.crystalSystem === filters.crystalSystem;

      const matchesValue = filters.marketValueRange === 'all'
        || (filters.marketValueRange === 'premium' && mineral.currentPriceUSD > 1500)
        || (filters.marketValueRange === 'mid' && mineral.currentPriceUSD >= 500 && mineral.currentPriceUSD <= 1500)
        || (filters.marketValueRange === 'entry' && mineral.currentPriceUSD < 500);

      return matchesSearch && matchesMohs && matchesCrystal && matchesValue;
    });

    const mapped = [...searched];

    mapped.sort((a, b) => {
      switch (filters.sortBy) {
        case 'priceDesc':
          return b.currentPriceUSD - a.currentPriceUSD;
        case 'priceAsc':
          return a.currentPriceUSD - b.currentPriceUSD;
        case 'hardnessDesc':
          return b.mohsHardness - a.mohsHardness;
        case 'name':
        default:
          return a.name.localeCompare(b.name, 'es');
      }
    });

    state.filteredMinerals = mapped;
  }

  function renderSuggestions() {
    const term = ui.elements.searchInput.value.trim().toLowerCase();

    const matches = state.minerals
      .filter((mineral) =>
        mineral.name.toLowerCase().includes(term)
        || mineral.symbol.toLowerCase().includes(term)
      )
      .slice(0, 5);

    ui.renderPredictiveSuggestions(matches, (value) => {
      ui.elements.searchInput.value = value;
      ui.renderPredictiveSuggestions([], () => {});
      applyFilters();
      renderAll();
    });
  }

  function renderAll() {
    ui.populateChartMineralSelect(state.minerals, state.selectedMineralId);

    ui.renderMinerals(state.filteredMinerals, converter, state.selectedMineralId, {
      onAddToCart: addToCart,
      onSelectMineral: selectMineral
    });

    ui.renderTicker(state.minerals, converter);
    ui.renderCart(cart, state.minerals, converter, { onRemoveFromCart: removeFromCart });
    ui.renderSummary(state.minerals, cart, converter);
    renderChart();
}

  function renderChart() {
    if (!chartManager) return;

    const selectedMineral =
      state.minerals.find((mineral) => mineral.id === state.selectedMineralId) || state.minerals[0];

    if (!selectedMineral) return;

    if (!selectedMineral.history.length) {
      const history = marketService.generateHistory(selectedMineral.currentPriceUSD);
      selectedMineral.setHistory(
        history.labels.map((label, index) => ({
          label,
          value: history.values[index]
        }))
      );
    }

    ui.updateChartTitle(selectedMineral);
    ui.setChartMineralSelect(selectedMineral.id);
    chartManager.render(selectedMineral, converter);
  }
    ui.updateChartTitle(selectedMineral);
    chartManager.render(selectedMineral, converter);
  }

  function addToCart(mineralId) {
    const mineral = state.minerals.find((item) => item.id === mineralId);
    if (!mineral) return;

    try {
      mineral.reduceStock(1);
      cart.addMineral(mineral, 1);
      state.selectedMineralId = mineral.id;
      persistState();
      applyFilters();
      renderAll();
    } catch (error) {
      ui.openModal('Stock insuficiente', error.message);
    }
  }

  function removeFromCart(mineralId) {
    const mineral = state.minerals.find((item) => item.id === mineralId);
    if (!mineral) return;

    const removed = cart.removeMineral(mineralId, 1);

    if (removed) {
      mineral.restoreStock(removed);
      persistState();
      applyFilters();
      renderAll();
    }
  }

  function selectMineral(mineralId) {
    state.selectedMineralId = mineralId;
    renderAll();
    
    const chartSection = document.querySelector('.chart-panel');
    if (chartSection) {
      chartSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  function restoreFullStockFromCart() {
    cart.items.forEach((item) => {
      const mineral = state.minerals.find((entry) => entry.id === item.id);
      if (mineral) {
        mineral.restoreStock(item.quantity);
      }
    });
  }

  function persistState() {
    try {
      storage.save('portfolio', cart.toJSON(converter));
      storage.save('theme', { value: state.theme });
      storage.save(
        'stocks',
        state.minerals.map((mineral) => ({
          id: mineral.id,
          stock: mineral.stock
        }))
      );
    } catch (error) {
      ui.openModal('Error de persistencia', error.message);
    }
  }

  function restoreState() {
    try {
      const savedTheme = storage.load('theme', { value: 'dark' });
      state.theme = savedTheme.value || 'dark';

      const savedStocks = storage.load('stocks', []);
      savedStocks.forEach((stockEntry) => {
        const mineral = state.minerals.find((entry) => entry.id === stockEntry.id);
        if (mineral) {
          mineral.stock = Math.max(
            0,
            Math.min(mineral.originalStock, Number(stockEntry.stock))
          );
        }
      });

      const savedPortfolio = storage.load('portfolio', null);
      if (savedPortfolio) {
        cart.fromJSON(savedPortfolio);
        converter.setSelectedCurrency(savedPortfolio.selectedCurrency || 'EUR');
        cart.setCurrency(converter.selectedCurrency);
      }
    } catch (error) {
      ui.openModal('Error de recuperación', error.message);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})(window.App);
