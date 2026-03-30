window.App = window.App || {};

(function registerUI(app) {
  class UIManager {
    constructor() {
      this.elements = {
        body: document.body,
        mineralsGrid: document.getElementById('mineralsGrid'),
        resultsCounter: document.getElementById('resultsCounter'),
        searchInput: document.getElementById('searchInput'),
        suggestions: document.getElementById('predictiveSuggestions'),
        mohsFilter: document.getElementById('mohsFilter'),
        mohsValue: document.getElementById('mohsValue'),
        crystalFilter: document.getElementById('crystalFilter'),
        marketValueFilter: document.getElementById('marketValueFilter'),
        sortBy: document.getElementById('sortBy'),
        resetFiltersBtn: document.getElementById('resetFiltersBtn'),
        currencySelect: document.getElementById('currencySelect'),
        tickerTrack: document.getElementById('tickerTrack'),
        weatherContent: document.getElementById('weatherContent'),
        refreshWeatherBtn: document.getElementById('refreshWeatherBtn'),
        cartItems: document.getElementById('cartItems'),
        subtotalValue: document.getElementById('subtotalValue'),
        taxValue: document.getElementById('taxValue'),
        feeValue: document.getElementById('feeValue'),
        totalValue: document.getElementById('totalValue'),
        feeTierBadge: document.getElementById('feeTierBadge'),
        portfolioTimestamp: document.getElementById('portfolioTimestamp'),
        clearCartBtn: document.getElementById('clearCartBtn'),
        chartTitle: document.getElementById('chartTitle'),
        summaryStats: document.getElementById('summaryStats'),
        lastUpdatedBadge: document.getElementById('lastUpdatedBadge'),
        themeToggle: document.getElementById('themeToggle'),
        modalOverlay: document.getElementById('modalOverlay'),
        modalBody: document.getElementById('modalBody'),
        modalTitle: document.getElementById('modalTitle'),
        chartMineralSelect: document.getElementById('chartMineralSelect'),
        modalCloseBtn: document.getElementById('modalCloseBtn')
      };
    }

    populateCrystalFilter(minerals) {
      const values = [...new Set(minerals.map((mineral) => mineral.crystalSystem))].sort();
      this.elements.crystalFilter.innerHTML = '<option value="all">Todos</option>'
        + values.map((value) => `<option value="${value}">${value}</option>`).join('');
    }

    populateChartMineralSelect(minerals, selectedMineralId) {
      if (!this.elements.chartMineralSelect) return;

      this.elements.chartMineralSelect.innerHTML = minerals.map((mineral) => `
        <option value="${mineral.id}" ${Number(selectedMineralId) === Number(mineral.id) ? 'selected' : ''}>
          ${mineral.name} (${mineral.symbol})
        </option>
      `).join('');
    }

    setChartMineralSelect(mineralId) {
      if (!this.elements.chartMineralSelect) return;
      this.elements.chartMineralSelect.value = String(mineralId);
    }

    setTheme(theme) {
      this.elements.body.dataset.theme = theme;
      const isDark = theme === 'dark';
      this.elements.themeToggle.querySelector('.theme-toggle__icon').textContent = isDark ? '☀️' : '🌙';
      this.elements.themeToggle.querySelector('.theme-toggle__text').textContent = isDark ? 'Modo claro' : 'Modo oscuro';
    }

    getFilters() {
      return {
        search: this.elements.searchInput.value.trim().toLowerCase(),
        minMohs: Number(this.elements.mohsFilter.value),
        crystalSystem: this.elements.crystalFilter.value,
        marketValueRange: this.elements.marketValueFilter.value,
        sortBy: this.elements.sortBy.value
      };
    }

    bindEvents(handlers) {
      this.elements.searchInput.addEventListener('input', handlers.onSearchInput);
      this.elements.mohsFilter.addEventListener('input', handlers.onMohsChange);
      this.elements.crystalFilter.addEventListener('change', handlers.onFilterChange);
      this.elements.marketValueFilter.addEventListener('change', handlers.onFilterChange);
      this.elements.sortBy.addEventListener('change', handlers.onFilterChange);
      this.elements.currencySelect.addEventListener('change', handlers.onCurrencyChange);
      this.elements.refreshWeatherBtn.addEventListener('click', handlers.onWeatherRefresh);
      this.elements.resetFiltersBtn.addEventListener('click', handlers.onResetFilters);
      this.elements.clearCartBtn.addEventListener('click', handlers.onClearCart);
      this.elements.themeToggle.addEventListener('click', handlers.onThemeToggle);
      this.elements.modalCloseBtn.addEventListener('click', () => this.closeModal());
      this.elements.chartMineralSelect?.addEventListener('change', handlers.onChartMineralChange);
      this.elements.modalOverlay.addEventListener('click', (event) => {
        if (event.target === this.elements.modalOverlay) this.closeModal();
      });
    }

    updateMohsLabel() {
      this.elements.mohsValue.textContent = Number(this.elements.mohsFilter.value).toFixed(1);
    }

    renderPredictiveSuggestions(matches, onSelect) {
      if (!matches.length || !this.elements.searchInput.value.trim()) {
        this.elements.suggestions.innerHTML = '';
        this.elements.suggestions.classList.remove('visible');
        return;
      }

      this.elements.suggestions.innerHTML = matches.map((mineral) => `
        <button type="button" class="suggestion-item" data-name="${mineral.name}">
          <span>${mineral.name}</span>
          <small>${mineral.symbol} · ${mineral.category}</small>
        </button>
      `).join('');

      this.elements.suggestions.classList.add('visible');
      this.elements.suggestions.querySelectorAll('.suggestion-item').forEach((button) => {
        button.addEventListener('click', () => onSelect(button.dataset.name));
      });
    }

    renderMinerals(minerals, converter, selectedMineralId, handlers) {
  this.elements.resultsCounter.textContent = `${minerals.length} resultados`;

  if (!minerals.length) {
    this.elements.mineralsGrid.innerHTML = '<div class="empty-state">No hay minerales que cumplan los filtros seleccionados.</div>';
    return;
  }

  this.elements.mineralsGrid.innerHTML = minerals.map((mineral) => {
    const price = converter.format(converter.convert(mineral.currentPriceUSD));
    const sourceLabel = mineral.priceSource || 'No indicada';

    const stockBadgeClass = mineral.availability === 'Agotado'
      ? 'danger'
      : mineral.availability === 'Stock bajo'
        ? 'warning'
        : 'success';

    return `
      <article class="mineral-card ${selectedMineralId === mineral.id ? 'selected' : ''}">
        <img class="mineral-card__image" src="${mineral.image}" alt="${mineral.name}" />

        <div class="mineral-card__content">
          <div class="mineral-card__header">
            <div class="mineral-heading">
              <h3>${mineral.name}</h3>
              <p>${mineral.symbol} · ${mineral.category}</p>
            </div>
            <span class="badge ${stockBadgeClass}">${mineral.availability}</span>
          </div>

          <p class="mineral-description">${mineral.description}</p>

          <div class="metric-grid">
            <div><span>Dureza</span><strong>${mineral.mohsHardness}</strong></div>
            <div><span>Cristalino</span><strong>${mineral.crystalSystem}</strong></div>
            <div><span>Stock</span><strong>${mineral.stock}</strong></div>
            <div><span>Unidad</span><strong>${mineral.unit}</strong></div>
          </div>

          <div class="price-row">
            <div class="price-block">
              <span class="eyebrow">Precio</span>
              <strong class="price-value">${price}</strong>
              <small class="helper-text">Fuente: ${sourceLabel}</small>
            </div>

            <div class="card-actions">
              <button type="button" class="ghost-btn chart-btn" data-chart-id="${mineral.id}">
                Ver gráfico
              </button>
              <button
                type="button"
                class="primary-btn add-btn"
                data-add-id="${mineral.id}"
                ${mineral.stock <= 0 ? 'disabled' : ''}
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');

  this.elements.mineralsGrid.querySelectorAll('[data-add-id]').forEach((button) => {
    button.addEventListener('click', () => handlers.onAddToCart(Number(button.dataset.addId)));
  });

  this.elements.mineralsGrid.querySelectorAll('[data-chart-id]').forEach((button) => {
    button.addEventListener('click', () => handlers.onSelectMineral(Number(button.dataset.chartId)));
  });
}

    renderTicker(minerals, converter) {
  if (!this.elements.tickerTrack) return;

  if (!minerals || !minerals.length) {
    this.elements.tickerTrack.innerHTML = `
      <div class="ticker-item">
        <strong>MARKET</strong>
        <span>Sin datos disponibles</span>
      </div>
    `;
    return;
  }

  const items = minerals.map((mineral) => {
    const price = converter.format(converter.convert(mineral.currentPriceUSD));
    const source = mineral.priceSource || 'N/D';

    return `
      <div class="ticker-item">
        <strong>${mineral.symbol}</strong>
        <span>${mineral.name}</span>
        <span>${price}</span>
        <small>${source}</small>
      </div>
    `;
  }).join('');

  this.elements.tickerTrack.innerHTML = items + items;
}

    renderWeather(weather) {
      const fallbackTag = weather.isFallbackLocation
        ? '<span class="badge warning">Ubicación por defecto</span>'
        : '<span class="badge success">Ubicación detectada</span>';

      this.elements.weatherContent.classList.remove('loading-state');
      this.elements.weatherContent.innerHTML = `
        <div class="weather-topline">
          <div>
            <h3>${weather.locationName}</h3>
            <p>${weather.condition}</p>
          </div>
          ${fallbackTag}
        </div>
        <div class="weather-metrics">
          <div><span>Temperatura</span><strong>${weather.temperature}°C</strong></div>
          <div><span>Sensación</span><strong>${weather.apparentTemperature}°C</strong></div>
          <div><span>Humedad</span><strong>${weather.humidity}%</strong></div>
          <div><span>Viento</span><strong>${weather.windSpeed} km/h</strong></div>
        </div>
        ${weather.locationMessage ? `<p class="helper-text">${weather.locationMessage}</p>` : ''}
      `;
    }

    renderCart(cart, minerals, converter, handlers) {
      if (!cart.items.length) {
        this.elements.cartItems.className = 'cart-items empty-state';
        this.elements.cartItems.textContent = 'Aún no has añadido minerales a la cartera.';
      } else {
        this.elements.cartItems.className = 'cart-items';
        this.elements.cartItems.innerHTML = cart.items.map((item) => {
          const mineral = minerals.find((entry) => entry.id === item.id);
          return `
            <article class="cart-item">
              <img src="${item.image}" alt="${item.name}" />
              <div class="cart-item__info">
                <strong>${item.name}</strong>
                <span>${item.quantity} x ${converter.format(converter.convert(item.priceUSD))}</span>
                <small>Stock restante: ${mineral ? mineral.stock : 0}</small>
              </div>
              <button class="ghost-btn danger-text" type="button" data-remove-id="${item.id}">Eliminar</button>
            </article>
          `;
        }).join('');

        this.elements.cartItems.querySelectorAll('[data-remove-id]').forEach((button) => {
          button.addEventListener('click', () => handlers.onRemoveFromCart(Number(button.dataset.removeId)));
        });
      }

      const summary = cart.getSummary(converter);
      this.elements.subtotalValue.textContent = converter.format(summary.subtotal);
      this.elements.taxValue.textContent = converter.format(summary.taxes);
      this.elements.feeValue.textContent = converter.format(summary.fee);
      this.elements.totalValue.textContent = converter.format(summary.total);
      this.elements.feeTierBadge.textContent = `Comisión ${(summary.feeRate * 100).toFixed(0)}%`;
      this.elements.portfolioTimestamp.textContent = cart.lastUpdated
        ? `Actualizado: ${new Date(cart.lastUpdated).toLocaleString('es-ES')}`
        : 'Sin guardar';
    }

    renderSummary(minerals, cart, converter) {
      const prices = minerals.map((mineral) => mineral.currentPriceUSD);
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      const summary = cart.getSummary(converter);

      this.elements.summaryStats.innerHTML = `
        <article>
          <span>Minerales</span>
          <strong>${minerals.length}</strong>
        </article>
        <article>
          <span>Precio máximo</span>
          <strong>${converter.format(converter.convert(maxPrice))}</strong>
        </article>
        <article>
          <span>Precio mínimo</span>
          <strong>${converter.format(converter.convert(minPrice))}</strong>
        </article>
        <article>
          <span>Valor cartera</span>
          <strong>${converter.format(summary.total)}</strong>
        </article>
      `;
    }

    updateChartTitle(mineral) {
      this.elements.chartTitle.textContent = `Tendencia histórica · ${mineral.name}`;
    }

    updateLastUpdated(text, tone = 'neutral') {
      this.elements.lastUpdatedBadge.className = `badge ${tone}`;
      this.elements.lastUpdatedBadge.textContent = text;
    }

    setCurrency(currency) {
      this.elements.currencySelect.value = currency;
    }

    resetFilters() {
      this.elements.searchInput.value = '';
      this.elements.mohsFilter.value = '1';
      this.elements.marketValueFilter.value = 'all';
      this.elements.crystalFilter.value = 'all';
      this.elements.sortBy.value = 'name';
      this.updateMohsLabel();
      this.renderPredictiveSuggestions([], () => {});
    }

    openModal(title, message) {
      this.elements.modalTitle.textContent = title;
      this.elements.modalBody.innerHTML = `<p>${message}</p>`;
      this.elements.modalOverlay.classList.remove('hidden');
    }

    closeModal() {
      this.elements.modalOverlay.classList.add('hidden');
    }
  }

  app.UIManager = UIManager;
})(window.App);
