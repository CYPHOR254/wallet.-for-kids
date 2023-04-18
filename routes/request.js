const router = require("express").Router();
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const Mpesa = require("mpesa-node");
const mysql = require("mysql");
const { stk, stkFunct } = require("../controllers/mpesa-cont");
const request = require("request");

// Initialize M-PESA API client
const mpesa = new Mpesa({
  consumerKey: "p4Thu6G1hGl5qwV3Nl3dO4KBy0OOc8qA",
  consumerSecret: "Y04GkoVBtc93d09wv",
  environment: "sandbox",
  shortCode: "600984",
  initiatorName: "testapi",
  securityCredential: "Safaricom999!*!",
  baseUrl: "https://sandbox.safaricom.co.ke/",
});


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
router.post("/requestMoneyByEmail", access, async function (req, res) {
  const { email, amount, reason, accountNo } = req.body;

  try {
    // Send the request to Mpesa

    // const result = await requestMoney (amount, reason);

    // Insert the payment request data into the MySQL database
    const pool = mysql.createPool({
      connectionLimit: 100,
      host: "127.0.0.1", //This is your localhost IP
      user: "root", // "newuser" created in Step 1(e)
      password: "!asapmysql+2enen#", // password for the new user
      database: "userDB", // Database name
      port: "3306", // port name, "3306" by default
    });

    // Send an email to the recipient asking for money
    const mailOptions = {
      from: "earvinekinyua@gmail.com",
      to: email,
      subject: `Payment Request: ${amount} KES for ${reason}`,
      text: `Dear PARENT,\n\nYou have been requested to pay ${amount} KES for ${reason}. Please use your M-Pesa app or USSD menu to accept or decline the request.Deposit to the following accountNo${accountNo} The transaction ID is .\n\nBest regards,\nMY PIGGY BANK`,
    };
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "earvinekinyua@gmail.com",
        pass: "eobgrnqgysxkdvsh",
      },
    });
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.log(err);
      else console.log(`Email sent to ${email}: ${info.response}`);
    });

    // STK- LINA NA MPESA ONLINE
    let url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
    let auth = "Bearer " + req.access_token;
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, -3);
    const password =
      "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjMwNDE3MTIxMjI2"; // TODO: Replace with your Safaricom password
      
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
          TransactionDesc:
            "you have successfully requested ${amount} to the phone number",
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

    // let requestMoney= await stkFunct(amount);

    // Return the transaction ID to the client
    res.json({ transactionId: "result.ConversationID" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// // create an endpoint to retrieve transactions
// router.get('/transactions', (req, res) => {
//   // SQL query to retrieve transactions
//   const sql = 'SELECT * FROM transactions';

//   // Insert the payment request data into the MySQL database
//   const pool = mysql.createPool({
//     connectionLimit: 100,
//     host: "localhost", //This is your localhost IP
//     user: "root", // "newuser" created in Step 1(e)
//     password: "!asapmysql+2enen#", // password for the new user
//     database: "userDB", // Database name
//     port: "3306", // port name, "3306" by default
//   });
//   // execute the query
//   pool.query(sql, (err, results) => {
//     if (err) throw err;
//     res.json(results); // send the transactions as a JSON response
//   });
// });

module.exports = router;
