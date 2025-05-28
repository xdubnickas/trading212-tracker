# Trading212 Portfolio Dashboard

Moderná React aplikácia na zobrazovanie portfólia z Trading212 s interaktívnymi grafmi a responzívnym dizajnom.

## 🚀 Funkcie

- **Dashboard s prehľadom portfólia** - Celková hodnota, denné/týždenné/ročné zisky
- **Interaktívne grafy** - Chart.js pre vizualizáciu výkonnosti a alokácie
- **Responzívny dizajn** - Bootstrap pre moderné a mobilné rozhranie
- **Trading212 API integrácia** - Priame pripojenie na váš Trading212 účet
- **Ukážkové dáta** - Možnosť testovať bez API kľúča

## 🛠️ Technológie

- **React** s JavaScript a Hooks
- **Vite** pre rýchly development
- **Bootstrap 5** pre UI komponenty
- **Chart.js + react-chartjs-2** pre grafy
- **Axios** pre API komunikáciu
- **Bootstrap Icons** pre ikony

## 📦 Inštalácia

1. **Naklonujte alebo stiahnite projekt**
```bash
git clone <repository-url>
cd trading212
```

2. **Nainštalujte závislosti**
```bash
npm install
```

3. **Nastavte API kľúč (voliteľné)**
```bash
# Skopírujte .env.example do .env
copy .env.example .env

# Upravte .env a pridajte váš Trading212 API kľúč
VITE_TRADING212_API_KEY=your_actual_api_key_here
```

4. **Spustite aplikáciu**
```bash
npm run dev
```

## 🔑 Trading212 API Setup

1. **Získajte API kľúč**:
   - Prihláste sa do Trading212
   - Idite do Settings → API
   - Vygenerujte nový API kľúč

2. **Nastavte kľúč v aplikácii**:
   - Skopírujte `.env.example` do `.env`
   - Pridajte váš API kľúč do `VITE_TRADING212_API_KEY`

3. **Prepnite na skutočné API**:
   - V aplikácii použite prepínač "Skutočné API"
   - Alebo nastavte `VITE_USE_REAL_API=true` v `.env`

## 📊 Funkcie Aplikácie

### Dashboard
- Celková hodnota portfólia
- Denné, týždenné a ročné zisky/straty
- Prehľadné farebné označenie výkonnosti

### Grafy
- **Koláčový graf**: Alokácia portfólia podľa pozícií
- **Čiarový graf**: História výkonnosti portfólia
- Interaktívne tooltips s detailnými informáciami

### Zoznam Pozícií
- Všetky pozície s aktuálnymi cenami
- Množstvo a celková hodnota
- Percentuálne zmeny s farebným označením

## 🔧 Vývoj

```bash
# Spustenie vo vývojovom móde
npm run dev

# Build pre produkciu
npm run build

# Náhľad produkčnej verzie
npm run preview

# Linting
npm run lint
```

## 📁 Štruktúra Projektu

```
src/
├── components/          # React komponenty
│   ├── Header.jsx      # Navigačná lišta
│   ├── Portfolio.jsx   # Hlavný dashboard
│   ├── PortfolioSummary.jsx  # Súhrn portfólia
│   └── PositionsList.jsx     # Zoznam pozícií
├── services/           # API služby
│   └── Trading212Service.js  # Trading212 API wrapper
├── App.jsx            # Hlavná aplikácia
├── App.css            # Štýly aplikácie
└── main.jsx           # Entry point
```

## 🎨 Prispôsobenie

### Pridanie nových grafov
1. Importujte potrebné Chart.js komponenty
2. Vytvorte nový graf v `Portfolio.jsx`
3. Pridajte dáta a konfiguráciu

### Úprava vzhľadu
- Upravte `App.css` pre vlastné štýly
- Použite Bootstrap triedy pre rýchle zmeny
- Upravte farby v Chart.js konfigurácii

## 🛡️ Bezpečnosť

- **Nikdy** nezahŕňajte API kľúč do git repozitára
- Použite `.env` súbor pre lokálny development
- Pre produkciu nastavte environment premenné na serveri

## 🤝 Prispievanie

1. Fork projektu
2. Vytvorte feature branch (`git checkout -b feature/nova-funkcia`)
3. Commit zmeny (`git commit -m 'Pridaná nová funkcia'`)
4. Push do branch (`git push origin feature/nova-funkcia`)
5. Otvorte Pull Request

## 📄 Licencia

Tento projekt je licencovaný pod MIT licenciou.
