const express = require("express");
const db = require("../database.js");
const router = express.Router();
const request = require("request");
const { response } = require("express");
const { body } = require("express-validator");
const bodyParser = require("body-parser");
const { url } = require("inspector");


const consumerKey = "PrAF2ERfi8k5QNJ92Bb6zk5trGYBtUqp";
const consumerSecret = "OGefPDG82zxl6s5T";


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

exports.registerFunction = (req, resp) => {
    let url = "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl";
    let access_token = access()
    console.log(access_token);
    let auth = "Bearer " + access_token;

  
    request(
      {
        url: url,
        method: "POST",
        headers: {
          Authorization: auth,
        },
        json: {
          ShortCode: 600999,
          ResponseType: "Completed",
          ConfirmationURL: "https://10.20.33.70.8080/confirmation",
          ValidationURL: "https://10.20.33.70.8080/validation",
        },
      },
      function (error, response, body) {
        if (error) {
          console.error(error);
        }
        console.log(body, response, "fgdgfdgfd");
        resp.status(200).json(body);
      }
    );
  };
  
// const access = async () => {
//     // access token
//     let saf_url =
//       "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
//     let auth = new Buffer.from("p4Thu6G1hGl5qwV3Nl3dO4KBy0OOc8qA:04GkoVBtc93d09wv").toString("base64");
//     let atk;
//     await request(
//       {
//         url: saf_url,
//         headers: {
//           Authorization: `Basic ${auth}`,
//         },
//       },
//       (error, response, body) => {
//         if (error) {
//           console.error(error);
//         } else {
//           // console.log(body);
//           const result = JSON.parse(body);
//           // req.access_token = result;
//         //   req.access_token
//         console.log(result.access_token);
//            atk =  result.access_token;
          
//         //   next();
//         }
//       }
//     );
//     console.log(atk, 'ghfgfhghf');

//     return atk
//   };

exports.balanceFunction = (req, res) => {
    let url = "https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query";
    let access_token = access()

    let auth = "Bearer " + access_token;
  
    request(
      {
        url: url,
        method: "POST",
        headers: {
          Authorization: auth,
        },
        json: {
          Initiator: "testapi",
          SecurityCredential:
            "lfRaZ+BwkEv4Y2ry22FaYSKXckgRqgRas7iodQewYWcMgwxxWt45S40VFeAA3JB3TpkHq8Bjrkms5xXw3OL7VuXovLLZlKrqFNVl02vTO8BJEySMl1AlcFi4wuZt4PBkCgE2D5SBVKUYRS49uOdmN02wUHCmL0cWVjh931YOXsRDjsm30ec8IiDmKmHYe0Yqvow6dgCkyeRxsc6u4rvlnHhmrDYN6V6/iY7TA7r7jjwJur4sVqI38ts/wDaa1oKxZaqEx/Uqasou1ARqyA0jawmp4uXXL5ravr6oNnDFbYIXYaue8a9KWKJ8+/kTfQTx8PXBrOwiUIFEVhiUndCVVQ==",
          CommandID: "AccountBalance",
          PartyA: 600999,
          IdentifierType: "4",
          Remarks: "freee",
          QueueTimeOutURL: "https://mydomain.com/AccountBalance/queue/",
          ResultURL: "https://mydomain.com/AccountBalance/result/",
        },
      },
      function (error, response, body) {
        if (error) {
          console.error(error);
        } else {
          res.status(200).json(body);
        }
      }
    );
  } 

  exports.simulateFunction = async  (req, res) => {
    let url = "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate";
    let access_token = access()

    let auth = "Bearer " + access_token;
  
    request(
      {
        url: url,
        method: "POST",
        headers: {
          Authorization: auth,
        },
        json: {
          ShortCode: 600999,
          CommandID: "CustomerBuyGoodsOnline",
          Amount: 100,
          Msisdn: 254708374149,
          BillRefNumber: "testApi",
        },
      },
      function (error, response, body) {
        if (error) {
          console.error(error);
        } else {
          res.status(200).json(body);
        }
      }
    )
  }
//function that calls the LipaNaMpesa endpoint on daraja API
exports.stkFunct = async (amount) => {
console.log(amount);rs
    // STK- LINA NA MPESA ONLINE
  let url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
  let auth = "Bearer " + req.access_token;
  // let auth = "Bearer " + req.access_token;

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
          TransactionDesc: "you have successfully sent ${amount} to the phone number"
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
  )};

  
exports.postFunct= (res, req) =>{
  const callbackData = req.body;
}
