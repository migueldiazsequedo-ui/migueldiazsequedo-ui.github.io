window.App = window.App || {};

(function registerCharts(app) {
  class ChartManager {
    constructor(canvasSelector) {
      this.canvas = document.querySelector(canvasSelector);
      this.instance = null;
    }

    render(mineral, converter) {
      if (!this.canvas || !window.Chart) return;

      const labels = mineral.history.map((entry) => entry.label);
      const values = mineral.history.map((entry) => converter.convert(entry.value));
      const bodyStyles = getComputedStyle(document.body);
      const accent = bodyStyles.getPropertyValue('--color-accent').trim() || '#38bdf8';
      const grid = bodyStyles.getPropertyValue('--color-border').trim() || 'rgba(148, 163, 184, 0.16)';
      const text = bodyStyles.getPropertyValue('--color-text').trim() || '#e5eefb';

      if (this.instance) {
        this.instance.destroy();
      }

      this.instance = new Chart(this.canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: `${mineral.name} (${converter.selectedCurrency})`,
            data: values,
            borderColor: accent,
            backgroundColor: `${accent}22`,
            borderWidth: 3,
            tension: 0.35,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: text,
                usePointStyle: true
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => converter.format(context.raw)
              }
            }
          },
          scales: {
            x: {
              ticks: { color: text },
              grid: { color: grid }
            },
            y: {
              ticks: {
                color: text,
                callback: (value) => converter.format(value)
              },
              grid: { color: grid }
            }
          }
        }
      });
    }
  }

  app.ChartManager = ChartManager;
})(window.App);