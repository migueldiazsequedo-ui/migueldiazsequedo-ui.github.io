window.App = window.App || {};

(function registerData(app) {
  const createInlineSvg = (label, accent) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="220" viewBox="0 0 300 220">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="${accent}"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="300" height="220" rx="22" fill="#0b1120"/>
        <circle cx="230" cy="50" r="70" fill="url(#g)" opacity="0.85"/>
        <path d="M55 160L130 52L190 120L145 165Z" fill="#e2e8f0" opacity="0.92"/>
        <text x="24" y="34" font-family="Inter,Arial" font-size="20" fill="#f8fafc">${label}</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  app.config = {
    defaultCity: 'Basauri',
    defaultCoords: { latitude: 43.2400, longitude: -2.8800 },
    taxRate: 0.21,
    currencyApiKey: window.APP_CONFIG?.currencyApiKey || "",
    metalApiKey: window.APP_CONFIG?.metalApiKey || "",
    openCageApiKey: window.APP_CONFIG?.openCageApiKey || "",
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY'],
    apiNotes: {
      currency: 'Si exchangerate.host te exige access_key, añade la clave en App.config.currencyApiKey.',
      metals: 'Gold-API es la fuente principal. MetalPriceAPI actúa como respaldo para XAU, XAG, XPT y XPD. Cobre (XCU) se consulta en Gold-API como HG.'
    }
  };

  app.initialMinerals = [
    {
      id: 1,
      name: 'Oro',
      symbol: 'XAU',
      category: 'Metal precioso',
      mohsHardness: 2.5,
      crystalSystem: 'Cúbico',
      marketValue: 2345.5,
      stock: 9,
      unit: 'onza troy',
      image: createInlineSvg('Oro', '#f59e0b'),
      description: 'Activo refugio de alta liquidez y fuerte demanda institucional.'
    },
    {
      id: 2,
      name: 'Plata',
      symbol: 'XAG',
      category: 'Metal precioso',
      mohsHardness: 2.5,
      crystalSystem: 'Cúbico',
      marketValue: 27.8,
      stock: 22,
      unit: 'onza troy',
      image: createInlineSvg('Plata', '#cbd5e1'),
      description: 'Metal versátil con uso financiero e industrial, sensible al ciclo macro.'
    },
    {
      id: 3,
      name: 'Platino',
      symbol: 'XPT',
      category: 'Metal precioso',
      mohsHardness: 4.5,
      crystalSystem: 'Cúbico',
      marketValue: 974.3,
      stock: 7,
      unit: 'onza troy',
      image: createInlineSvg('Platino', '#60a5fa'),
      description: 'Mineral premium ligado a automoción, química fina y joyería.'
    },
    {
      id: 4,
      name: 'Paladio',
      symbol: 'XPD',
      category: 'Metal precioso',
      mohsHardness: 4.8,
      crystalSystem: 'Cúbico',
      marketValue: 1038.9,
      stock: 6,
      unit: 'onza troy',
      image: createInlineSvg('Paladio', '#a78bfa'),
      description: 'Mercado volátil con oferta concentrada y fuerte componente industrial.'
    },
    {
      id: 5,
      name: 'Cobre',
      symbol: 'XCU',
      category: 'Metal industrial',
      mohsHardness: 3.0,
      crystalSystem: 'Cúbico',
      marketValue: 4.25,
      stock: 45,
      unit: 'libra',
      image: createInlineSvg('Cobre', '#f97316'),
      description: 'Barómetro del crecimiento global y la electrificación.'
    }
  ];
})(window.App);
