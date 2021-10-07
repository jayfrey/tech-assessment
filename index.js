const express = require('express');
const app = express();
const PORT = 8000;
const bodyParser = require("body-parser");
const router = require('./routes/api');

app.use('/', router);

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});