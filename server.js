const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('API is running');
});

app.get('/api/maps/countries', (req, res) => {
  res.json([
    {
      countryCode: "RO",
      countryName: "Romania",
      version: "1.0",
      fileSizeMb: 400,
      downloadUrl: "https://example.com/romania.mbtiles"
    }
  ]);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
