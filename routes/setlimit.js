const router = require("express").Router();
const bodyParser = require("body-parser");
const { response } = require("express");
const nodemailer = require("nodemailer");

let spendingLimit = 0;
let dailySpendingLimit = 0;
let weeklySpendingLimit = 0;
let monthlySpendingLimit = 0;

router.use(bodyParser.json());

router.post("/setlimit", (req, res) => {
  const { limitType, limitAmount, email } = req.body;

  switch (limitType) {
    case "daily":
      dailySpendingLimit = limitAmount;
      break;
    case "weekly":
      weeklySpendingLimit = limitAmount;
      break;
    case "monthly":
      monthlySpendingLimit = limitAmount;
      break;
    default:
      spendingLimit = limitAmount;
      break;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "earvinekinyua@gmail.com",
      pass: "eobgrnqgysxkdvsh",
    },
  });

  const mailOptions = {
    from: "mypiggybank@gmail.com",
    to: email,
    subject: "Spending limit set successfully",
    text: `Dear parent, your child's spending limit has been set successfully to ${limitAmount} ${limitType}.`,
  };
  
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      res.status(500).json({ message: "Error: email could not be sent" });
    } else {
      console.log("Email sent: " + info.response);
      res
        .status(200)
        .json({
          message: "Spending limit set successfully. Email sent to parent.",
        });
    }
  });
});

module.exports = router;



