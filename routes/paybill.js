const router = require("express").Router();
const request = require("request");
const mysql = require("mysql2/promise");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const db = require("../database.js");
const Mpesa = require("mpesa-api").Mpesa;
const moment = require("moment");

// Initialize M-PESA API client
const mpesa = new Mpesa({
  consumerKey: "p4Thu6G1hGl5qwV3Nl3dO4KBy0OOc8qA",
  consumerSecret: "Y04GkoVBtc93d09wv",
  environment: "sandbox",
  shortCode: "600984",
  initiatorName: "testapi",
  securityCredential: "Safaricom999!*!",
});

const pool = mysql.createPool({
  connectionLimit: 100,
  host: "127.0.0.1", //This is your localhost IP
  user: "root", // "newuser" created in Step 1(e)
  password: "!asapmysql+2enen#", // password for the new user
  database: "userDB", // Database name
  port: "3306", // port name, "3306" by default
});

function access(req, res, next) {
  // access token
  let saf_url =
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  let auth = new Buffer.from(
    "p4Thu6G1hGl5qwV3Nl3dO4KBy0OOc8qA:04GkoVBtc93d09wv"
  ).toString("base64");

  console.log(auth);
  request(
    {
      url: saf_url,
      headers: {
        Authorization: `Basic ${auth}`,
      },
    },
    (error, response, body) => {
      if (error) {
        console.error(error);
      } else {
        // console.log(body);
        const result = JSON.parse(body);
        // req.access_token = result;
        console.log(result);
        req.access_token = result.access_token;
        next();
      }
    }
  );
}

router.post("/paybill", access, async (req, res) => {
  // Extract necessary parameters from the request body
  const { accountNo, paybillNo, amount } = req.body;

  // Validate input data
  if (!accountNo || !paybillNo || !amount) {
    return res.status(400).send("Missing required fields");
  }

  // Check if the transaction amount is positive
  if (amount <= 0) {
    return res.status(400).send("Amount must be positive");
  }

  // Check if the accountNo exists in the database
  const accountQuery = "SELECT * FROM accountDB WHERE accountNo = ?";
  const accountValues = [accountNo];
  const accountResult = await pool.query(accountQuery, accountValues);

  if (accountResult.length === 0) {
    return res.status(404).send("Account not found");
  }

  const account = accountResult[0];

  // STK- LINA NA MPESA ONLINE
  let url = "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest";
  let auth = "Bearer " + req.access_token;
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, -3);
  const password =
    "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjMwMzE1MTMwNzAz"; // TODO: Replace with your Safaricom password
  // const shortcode = 174379; // TODO: Replace with your Safaricom shortcode
  // const businessNumber = 254759432206;

  console.log(auth);

  request(
    {
      url: url,
      method: "POST",
      headers: {
        Authorization: auth,
      },
      json: {
        InitiatorName: "testapi",
        SecurityCredential:
          "EsJocK7+NjqZPC3I3EO+TbvS+xVb9TymWwaKABoaZr/Z/hukF/iA7PCIj3B7rBPmQ5DFBf1CmyIpM0Iv7HobO2U8vCUIKOQFhs9Bsq95L00SEiqoAZsMtbtPfBK6qWuW2IL7u1yKAvQkCIlxyZUbXOWFiCFwIBHs0//cUeOnKHV662IDqkYIzhRhHPThcOS6yLttZwtv13WfWViIpF8JUqtQqys57a+kqgbVq+9GYV+MHPas8DkUlaG/gM+uVbhLNcGEyHhhJRIy2y0uzonkNr8QaH/J5DARXb2v4qBDE/UJAQAslELxFEH9vZP09sw0uFH6/f9aDMahyUX1UpVP/1CHIZAsNyQX3BL/fvG4ZSTBi2l8qMV3d6bCVisFwFvfWYg==",
        CommandID: "SalaryPayment",
        Amount: "10",
        PartyA: "600988",
        PartyB: "254708374149",
        Remarks: "here are my remarks",
        QueueTimeOutURL: "https://c8bf-41-90-101-26.ngrok-free.app/b2c/timeout",
        ResultURL: "https://c8bf-41-90-101-26.ngrok-free.app/b2c/result",
        Occassion: "Christmas",
      },
    },
    function (error, response, body) {
      if (error) {
        console.error(error);
      } else {
        // res.status(200).json(body);
        console.log(body);
      }
    }
  );

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const currency = account.currency;
    const transactionType = "paybill";
    const entryType = "debit";
    const username = accountNo; // hardcoded for now

    const transactionCode = `${accountNo}-${new Date().getFullYear()}-${
      new Date().getMonth() + 1
    }-${new Date().getDate()}-${new Date().getTime()}`;
    const transactionQuery =
      "INSERT INTO transactionDB (idtransactionDB, idaccountDB , transaction_date, amount, currency, transaction_type, entrytype, transaction_code, status, created_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
    const transactionValues = [
      transactionCode,
      account.idaccountDB, // set account_Id to idaccountDB value from the account object
      new Date(),
      amount,
      currency || "",
      transactionType || "",
      entryType,
      transactionCode,
      "pending",
      new Date(),
      username,
    ];

    const transactionResult = await connection.query(
      transactionQuery,
      transactionValues
    );

    //    // Retrieve relevant values from the relevant tables
    //   const accountBalanceQuery =
    //   "SELECT available_balance FROM accountDB WHERE accountNo = ?";
    // const accountBalanceValues = [accountNo];
    // const accountBalanceResult = await connection.query(
    //   accountBalanceQuery,
    //   accountBalanceValues
    // );
    // console.log(accountBalanceResult[0][0].available_balance);
    // const accountBalance = accountBalanceResult[0][0].available_balance;

    // Retrieve relevant values from the relevant tables
    const accountBalanceQuery =
      "SELECT available_balance FROM accountDB WHERE accountNo = ?";
    const accountBalanceValues = [accountNo];
    const accountBalanceResult = await connection.query(
      accountBalanceQuery,
      accountBalanceValues
    );
    console.log(accountBalanceResult[0][0].available_balance);
    const accountBalance = accountBalanceResult[0][0].available_balance;

    // Update the account balance
    console.log(accountBalance);
    // console.log(amount);
    const newBalance = parseInt(accountBalance) - parseInt(amount);
    console.log(newBalance);
    const updateAccountQuery = `UPDATE accountDB SET available_balance = '${newBalance}' WHERE accountNo = '${accountNo}'`;
    console.log(updateAccountQuery);
    await connection.query(updateAccountQuery);

    // Update the transaction record in the database
    const updateQuery =
      "UPDATE transactionDB SET status = ? WHERE idtransactionDB = ?";
    const updateValues = ["completed", transactionCode];
    await connection.query(updateQuery, updateValues);

    await connection.commit();

    // Send response with transaction code
    res
      .status(200)
      .send(`transaction successful. Transaction code: ${transactionCode}`);
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send("Server error");
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
