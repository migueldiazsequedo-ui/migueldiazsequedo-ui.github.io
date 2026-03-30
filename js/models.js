window.App = window.App || {};

(function registerModels(app) {
  class Mineral {
    constructor(data) {
      Object.assign(this, data);
      this.baseMarketValue = Number(data.marketValue) || 0;
      this.currentPriceUSD = Number(data.marketValue) || 0;
      this.originalStock = Number(data.stock) || 0;
      this.stock = Number(data.stock) || 0;
      this.history = [];
      this.priceSource = 'Inicial';
    }

    updatePrice(value) {
      this.currentPriceUSD = Number(value) || this.currentPriceUSD;
    }

    setHistory(history) {
      this.history = Array.isArray(history) ? history : [];
    }

    reduceStock(quantity = 1) {
      if (this.stock < quantity) {
        throw new Error(`No hay stock suficiente para ${this.name}.`);
      }
      this.stock -= quantity;
    }

    restoreStock(quantity = 1) {
      this.stock = Math.min(this.originalStock, this.stock + quantity);
    }

    get availability() {
      if (this.stock <= 0) return 'Agotado';
      if (this.stock <= Math.max(2, Math.floor(this.originalStock * 0.25))) return 'Stock bajo';
      return 'Disponible';
    }
  }

  class CurrencyConverter {
    constructor(baseCurrency = 'USD') {
      this.baseCurrency = baseCurrency;
      this.selectedCurrency = baseCurrency;
      this.rates = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 151.2 };
      this.lastUpdated = null;
    }

    setRates(rates = {}) {
      this.rates = { ...this.rates, ...rates, USD: 1 };
      this.lastUpdated = new Date().toISOString();
    }

    setSelectedCurrency(currency) {
      this.selectedCurrency = currency;
    }

    convert(amount, currency = this.selectedCurrency) {
      const rate = this.rates[currency] || 1;
      return Number(amount) * rate;
    }

    format(amount, currency = this.selectedCurrency) {
      try {
        return new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency,
          maximumFractionDigits: 2
        }).format(amount);
      } catch (error) {
        return `${Number(amount).toFixed(2)} ${currency}`;
      }
    }
  }

  class ShoppingCart {
    constructor(taxRate = 0.21) {
      this.taxRate = taxRate;
      this.items = [];
      this.selectedCurrency = 'USD';
      this.lastUpdated = null;
    }

    setCurrency(currency) {
      this.selectedCurrency = currency;
      this.touch();
    }

    addMineral(mineral, quantity = 1) {
      const existing = this.items.find((item) => item.id === mineral.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        this.items.push({
          id: mineral.id,
          name: mineral.name,
          symbol: mineral.symbol,
          unit: mineral.unit,
          quantity,
          priceUSD: mineral.currentPriceUSD,
          image: mineral.image
        });
      }
      this.touch();
    }

    removeMineral(mineralId, quantity = 1) {
      const item = this.items.find((entry) => entry.id === mineralId);
      if (!item) return 0;

      item.quantity -= quantity;
      const removed = quantity;
      if (item.quantity <= 0) {
        this.items = this.items.filter((entry) => entry.id !== mineralId);
      }
      this.touch();
      return removed;
    }

    clear() {
      this.items = [];
      this.touch();
    }

    getSubtotalUSD() {
      return this.items.reduce((acc, item) => acc + (item.priceUSD * item.quantity), 0);
    }

    getCommissionRate() {
      const subtotal = this.getSubtotalUSD();
      if (subtotal >= 5000) return 0.03;
      if (subtotal >= 1500) return 0.02;
      return 0.01;
    }

    getSummary(converter) {
      const subtotalUSD = this.getSubtotalUSD();
      const taxesUSD = subtotalUSD * this.taxRate;
      const feeRate = this.getCommissionRate();
      const feeUSD = subtotalUSD * feeRate;
      const totalUSD = subtotalUSD + taxesUSD + feeUSD;

      return {
        subtotalUSD,
        taxesUSD,
        feeUSD,
        totalUSD,
        subtotal: converter.convert(subtotalUSD),
        taxes: converter.convert(taxesUSD),
        fee: converter.convert(feeUSD),
        total: converter.convert(totalUSD),
        feeRate,
        currency: converter.selectedCurrency,
        itemCount: this.items.reduce((sum, item) => sum + item.quantity, 0)
      };
    }

    toJSON(converter) {
      const summary = this.getSummary(converter);
      return {
        items: this.items,
        selectedCurrency: this.selectedCurrency,
        subtotal: summary.subtotal,
        taxes: summary.taxes,
        fee: summary.fee,
        total: summary.total,
        lastUpdated: this.lastUpdated,
        feeRate: summary.feeRate
      };
    }

    fromJSON(payload = {}) {
      this.items = Array.isArray(payload.items) ? payload.items : [];
      this.selectedCurrency = payload.selectedCurrency || 'USD';
      this.lastUpdated = payload.lastUpdated || null;
    }

    touch() {
      this.lastUpdated = new Date().toISOString();
    }
  }

  app.Mineral = Mineral;
  app.CurrencyConverter = CurrencyConverter;
  app.ShoppingCart = ShoppingCart;
})(window.App);