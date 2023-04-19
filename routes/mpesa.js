const express = require("express");
const db = require("../database.js");
const router = express.Router();
const request = require("request");
const { response } = require("express");
const { body } = require("express-validator");
const bodyParser = require("body-parser");
const { url } = require("inspector");
const { stkFunct, balanceFunction, simulateFunction, registerFunction,b2c, b2cFunct } = require("../controllers/mpesa-cont.js");
const c2bRegister = require("mpesa-node/src/endpoints/c2b-register.js");

// const urls = {
//   stk: "",
//   simulate: "",
//   b2c: "",
//   base_url: "",
// };

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
const consumerKey = "4Thu6G1hGl5qwV3Nl3dO4KBy0OOc8qA";
const consumerSecret = "04GkoVBtc93d09wv";

router.get("/access_token", (req, res) => {
  res.status(200).json({ access_token: req.access_token });
});

// router.get("/register", access, (req, resp) => {
//   let url = "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl";
//   let auth = "Bearer " + req.access_token;

//   request(
//     {
//       url: url,
//       method: "POST",
//       headers: {
//         Authorization: auth,
//       },
//       json: {
//         ShortCode: 600999,
//         ResponseType: "Completed",
//         ConfirmationURL: "https://10.20.33.70.8080/confirmation",
//         ValidationURL: "https://10.20.33.70.8080/validation",
//       },
//     },
//     function (error, response, body) {
//       if (error) {
//         console.error(error);
//       }
//       console.log(body, response, "fgdgfdgfd");
//       resp.status(200).json(body);
//     }
//   );
// });


router.get("/register", access, registerFunction);


router.get("/confirmation", (req, res) => {
  console.log("........confirmation......");
  console.log(req.body);
});

router.get("/validation", (req, res) => {
  console.log(req.body);
  console.log("........validation......");
});

router.get("/simulate", access, simulateFunction);

// Account Balance
router.get("/balance", access, balanceFunction );



// STK- LINA NA MPESA ONLINE
router.get("/stk", access, stkFunct);

//B2C 
router.get("/b2c", access, b2cFunct  )

//callback url
// router.post('/callback',access , stkFunct);


module.exports = router;







// function access(req, res, next) {
//   // access token
//   let saf_url =
//     "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
//   let auth = new Buffer.from(
//     "PrAF2ERfi8k5QNJ92Bb6zk5trGYBtUqp:OGefPDG82zxl6s5T"
//   ).toString("base64");

//   console.log(auth);
//   request(
//     {
//       url: saf_url,
//       headers: {
//         Authorization: `Basic ${auth}`,
//       },
//     },
//     (error, response, body) => {
//       if (error) {
//         console.error(error);
//       } else {
//         // console.log(body);
//         const result = JSON.parse(body);
//         // req.access_token = result;
//         console.log(result);
//         req.access_token = result.access_token;
//         next();
//       }
//     }
//   );
// }