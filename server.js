const express = require("express");
const bodyparser = require("body-parser");
const validator = require("validator");

const app = express();

require("dotenv").config();


const port = process.env.PORT || 4000;

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());

app.get("/", (req, res, next) =>
{
    res.send("Hello")
} )

app.post("/", (req, res, next) =>
{
    try {
let okay = req.body
console.log(okay, "Let's Go")
let splitCompObj = okay
if (splitCompObj.SplitInfo.length > 20) {
    console.error("Split entities more than 20");
    throw new Error("Split entities more than 20");
  }
  
  // to get the total ratio if its there
  let tRatio = 0,
    ratCount = 0;
  splitCompObj.SplitInfo.forEach((el) => {
    if (el.SplitType == "RATIO") {
      tRatio += el.SplitValue;
      ratCount++;
    }
  });
  
  splitCompObj.SplitInfo.sort((el1, el2) => {
    if (
      el1.SplitType == "FLAT" &&
      (el2.SplitType == "RATIO" || el2.SplitType == "PERCENTAGE")
    ) {
      return -10;
    }
    if (el1.SplitType == "PERCENTAGE" && el2.SplitType == "RATIO") {
      return -10;
    }
  });
  
  let responseObj = {
    ID: splitCompObj.ID,
    SplitBreakdown: [],
  };
  let initAmount = splitCompObj.Amount;
  let bal = splitCompObj.Amount,
    sumRatio = 0;
  let sumAll = 0;
  
  // on reciept of data
  for (let i = 0; i < splitCompObj.SplitInfo.length; i++) {
    let el = splitCompObj.SplitInfo[i];
    let returnObj;
    if (el.SplitType != "RATIO") {
      returnObj = computePayment(
        bal,
        el.SplitType,
        el.SplitValue,
        el.SplitEntityId
      );
  
      if (returnObj.sent > initAmount) {
        console.error("Invalid transaction, Possible cause: Insufficient funds");
        throw new Error("Invalid transaction, Possible cause: Insufficient funds");
      }
      if (returnObj.sent < 0) {
        console.error(
          "Invalid transaction, Possible cause: Invalid split values"
        );
        throw new Error( "Invalid transaction, Possible cause: Invalid split values");
      }
  
      bal = returnObj.balance;
      sumAll += returnObj.sent;
      responseObj.SplitBreakdown.push({
        SplitEntityId: returnObj.id,
        Amount: returnObj.sent,
      });
    } else {
      // If the ratio count is 1 then split it by the value of the single ratio
      let val = ratCount < 2 ? 1 : el.SplitValue;
      tRatio = ratCount < 2 ? el.SplitValue : tRatio;
      returnObj = computePayment(
        bal,
        el.SplitType,
        val,
        el.SplitEntityId,
        tRatio
      );
  
      if (returnObj.sent > initAmount) {
        console.error("Invalid transaction, Possible cause: Insufficient funds");
        throw new Error("Invalid transaction, Possible cause: Insufficient funds");
      }
      if (returnObj.sent < 0) {
        console.error(
          "Invalid transaction, Possible cause: Invalid split values"
        );
        throw new Error(  "Invalid transaction, Possible cause: Invalid split values");
      }
  
      // for the overall sum
      sumAll += returnObj.sent;
  
      // to calculate balance
      sumRatio += returnObj.sent;
  
      responseObj.SplitBreakdown.push({
        SplitEntityId: returnObj.id,
        Amount: returnObj.sent,
      });
    }
  }
  if (sumAll > initAmount) {
    console.error("Invalid transaction, Possible cause: Insufficient funds");
    throw new Error( "Invalid transaction, Possible cause: Insufficient funds");
  }
  if (bal < 0) {
    console.error("Invalid transaction, Possible cause: Insufficient funds");
    throw new Error( "Invalid transaction, Possible cause: Insufficient funds");
  }
  responseObj.Balance = sumRatio > 0 ? bal - sumRatio : bal;
  console.log("\n\n", responseObj, "aha");
  res.status(200).send(responseObj)
  function computePayment(balance, type, value, id, totalRatio = 1) {
    let sent = 0;
    if (type == "FLAT") {
      sent = value;
      balance -= sent;
      return { balance, sent, id };
    } else if (type == "PERCENTAGE") {
      sent = (value / 100) * balance;
      balance -= sent;
      return { balance, sent, id };
    } else if (type == "RATIO") {
      sent = (value / totalRatio) * balance;
      balance -= sent;
      return { balance, sent, id };
    }
  }
}
catch (e)
{
    next(e.message, "Problem")
    e.type = 'redirect' // adding custom property to specify handling behaviour
    next(e)
}
});

app.use((error, req, res, next) => {
    console.log("Error Handling Middleware called")
    res.status(401).send(error)
})

app.listen(port, (req, res) =>
{
    console.log("There's a Problem")
});
