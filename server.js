const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const navigationRoutes = require('./routes/navigationRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/navigation', navigationRoutes);

// Hărțile tale din Cloudflare R2
const maps = {
  romania: {
    region: 'romania',
    country: 'Romania',
    countryCode: 'RO',
    version: '2026.03',
    size: 'unknown',
    url: 'https://pub-16d7f5807d3e49a28890699bc51b921f.r2.dev/europe/romania.mbtiles',
    // Când ai `.pkg` pe R2, setează packageUrl (și opțional packageSha256).
    packageUrl: null,
    packageSha256: null,
  },
  california: {
    region: 'california',
    country: 'United States',
    countryCode: 'US',
    version: '2026.03',
    size: 'unknown',
    url: 'https://pub-16d7f5807d3e49a28890699bc51b921f.r2.dev/us/california.mbtiles',
    packageUrl: null,
    packageSha256: null,
  },
  great_britain: {
    region: 'great_britain',
    country: 'Great Britain',
    countryCode: 'GB',
    version: '2026.03',
    size: '1.6GB',
    url: 'https://pub-16d7f5807d3e49a28890699bc51b921f.r2.dev/europe/great-britain.mbtiles',
    packageUrl: null,
    packageSha256: null,
  },
};

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Returnează toate hărțile disponibile
app.get('/api/maps', (req, res) => {
  res.json(Object.values(maps));
});

// Returnează o singură hartă după nume
app.get('/api/maps/:region', (req, res) => {
  const region = req.params.region.toLowerCase();

  if (!maps[region]) {
    return res.status(404).json({
      error: 'Map not found',
      available: Object.keys(maps),
    });
  }

  res.json(maps[region]);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});