"use strict";
const express = require("express");
const router = express.Router();
const axios = require("axios");

// Replace with your Alpha Vantage API key
const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

router.get("/stocks/:symbol", async (req, res) => {
  const { symbol } = req.params;

  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    );

    const { data } = response;
    const { "Global Quote": globalQuote } = data;

    const stockData = {
      symbol: globalQuote["01. symbol"],
      open: globalQuote["02. open"],
      high: globalQuote["03. high"],
      low: globalQuote["04. low"],
      price: globalQuote["05. price"],
      volume: globalQuote["06. volume"],
      latestTradingDay: globalQuote["07. latest trading day"],
      previousClose: globalQuote["08. previous close"],
      change: globalQuote["09. change"],
      changePercent: globalQuote["10. change percent"],
    };

    res.json(stockData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving stock data" });
  }
});

// Replace with your own key from https://www.alphavantage.co/support/#api-key
const url =
  "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=X0VQBTLI85H6PRF7";

router.get("/stocks/IBM", (req, res) => {
  request.get(
    {
      url: url,
      json: true,
      headers: { "User-Agent": "request" },
    },
    (err, response, data) => {
      if (err) {
        console.log("Error:", err);
        res.status(500).json({ message: "Error retrieving stock data" });
      } else if (response.statusCode !== 200) {
        console.log("Status:", response.statusCode);
        res.status(500).json({ message: "Error retrieving stock data" });
      } else {
        // data is successfully parsed as a JSON object:
        res.json(data);
      }
    }
  );
});

module.exports = router;
