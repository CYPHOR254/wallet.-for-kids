const express = require("express");
const db = require("../database.js");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");
const Mpesa = require("mpesa-api").Mpesa;
const axios = require("axios");
const request = require('request');
const moment = require("moment");
const twilio = require("twilio");
const { stk, stkFunct } = require("../controllers/mpesa-cont");

// Initialize M-PESA API client
const mpesa = new Mpesa({
  consumerKey: "PrAF2ERfi8k5QNJ92Bb6zk5trGYBtUqp",
  consumerSecret: "OGefPDG82zxl6s5T",
  environment: "sandbox",
  shortCode: "600984",
  initiatorName: "testapi",
  securityCredential: "Safaricom999!*!",
});

const accountSid = "ACb7576fb31ffe1ded2d949d100331f675";
const authToken = "5d16dd4de4d7c79abba314e9466bd48d";
const client = twilio(accountSid, authToken);

function access(req, res, next) {
  // access token
  let saf_url =
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  let auth = new Buffer.from(
    "PrAF2ERfi8k5QNJ92Bb6zk5trGYBtUqp:OGefPDG82zxl6s5T"
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

// const apiUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

const pool = mysql.createPool({
  connectionLimit: 100,
  host: "127.0.0.1", //This is your localhost IP
  user: "root", // "newuser" created in Step 1(e)
  password: "!asapmysql+2enen#", // password for the new user
  database: "userDB", // Database name
  port: "3306", // port name, "3306" by default
});

router.post("/deposit", access, async function (req, res) {
  const { accountNo, amount } = req.body;

  // Validate input data
  if (!accountNo || !amount) {
    return res.status(400).send("Missing required fields");
  }

  // Check if the accountNo exists in the database
  const accountQuery = "SELECT * FROM accountDB WHERE accountNo = ?";
  const accountValues = [accountNo];
  const accountResult = await pool.query(accountQuery, accountValues);

  if (accountResult.length === 0) {
    return res.status(404).send("Account not found");
  }

  const account = accountResult[0];

  // Check if the transaction amount is positive
  if (amount <= 0) {
    return res.status(400).send("Amount must be positive");
  }

    // Check if the account has enough money to make the transaction
    if (account.available_balance < amount) {
      return res.status(400).send("Insufficient funds");
    }
    
    
  // STK- LINA NA MPESA ONLINE
  let url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
  // let auth = "Bearer " + req.access_token;
  let auth = "Bearer " + req.access_token;

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, -3);
  const password =
  "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjMwNDE3MTIxMjI2"  // const shortcode = 174379; // TODO: Replace with your Safaricom shortcode
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
        
          BusinessShortCode: 174379,
          Password: "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjMwNDE3MTIxMjI2",
          Timestamp: "20230417121226",
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: 254759432206,
          PartyB: 174379,
          PhoneNumber: 254759432206,
          CallBackURL: "https://mydomain.com/path",
          AccountReference: "MY PIGGY BANK 2",
          TransactionDesc: `you have successfully sent ${amount} to the phone number`
      },
    },
    function (error, response, body) {
      if (error) {
        console.error(`----ERROR-----\n${error}`);
      } else {
        // res.status(200).json(body);
        console.error(`----BODY-----\n${JSON.stringify(body)}`);
        // console.log(response);
        console.log(body);

      }
    }
  );

  let connection;
  try {
    // Send the request to Mpesa
    // const result = await deposit (accountNo, amount );
    // let deposit = stkFunct();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const currency = account.currency;
    const transactionType = "deposit";
    const entryType = "credit";
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
    const newBalance = parseInt(accountBalance) + parseInt(amount);
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

     // Send an SMS notification to the user
     const message = `You have deposited ${amount} to your account. Your new balance is ${newBalance}.`;
     client.messages
       .create({
         body: message,
         from: "+14753488225", // Replace with your Twilio phone number
         to: "+254759432206", // Replace with the user's phone number
       })
       .then((message) => console.log(message.sid));

    // Send response with transaction code
    res
      .status(200)
      .send(`Deposit successful. Transaction code: ${transactionCode}`);
  } catch (error) {
    // await connection.rollback();
    console.error(error);
    res.status(500).send("Server error");
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
