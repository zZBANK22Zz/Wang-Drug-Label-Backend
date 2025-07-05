const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT;

const app = express();

app.get('/hello', (req, res) => {
    res.send('Welcome to the Drug Label Service!');
});

app.listen(PORT, () => {
    console.log('Server is running');
});