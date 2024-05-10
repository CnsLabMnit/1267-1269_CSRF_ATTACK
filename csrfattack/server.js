var _ = require("underscore");
var BigNumber = require("bignumber.js");
var bodyParser = require("body-parser");
var express = require("express");
var exphbr = require("express-handlebars");
var session = require("express-session");

var app = express();

app.use(bodyParser.urlencoded({ extended: false }));

app.use(
  session({
    secret: "not so secret",
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: false },
  })
);

app.engine(
  "html",
  exphbr({
    defaultLayout: "main",
    extname: ".html",
  })
);

app.set("view engine", "html");

var requireLogin = function (req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
};

app.get("/", requireLogin, function (req, res, next) {
  res.render("home", {
    username: req.session.user.name,
    balance: accounts[req.session.user.name] || 0,
  });
});

var validLogins = [
  { username: "bob", password: "test" },
  { username: "alice", password: "test" },
];

app.get("/login", function (req, res, next) {
  res.render("login");
});

app.post("/login", function (req, res, next) {
  if (!req.body.username) {
    return res.status(400).send("Username is required.");
  }

  if (!req.body.password) {
    return res.status(400).send("Password is required.");
  }

  var user = _.find(validLogins, function (login) {
    return (
      login.username === req.body.username &&
      login.password === req.body.password
    );
  });

  if (!user) {
    return res.status(400).send("Invalid username or password.");
  }

  req.session.regenerate(function (error) {
    if (error) {
      console.log(error);
      return res.status(500).send("An unexpected error occurred.");
    }

    req.session.user = { name: user.username };
    res.redirect("/");
  });
});

app.get("/transfer", requireLogin, function (req, res, next) {
  transferFunds(
    req.query.to,
    req.session.user.name,
    req.query.amount,
    function (error) {
      if (error) {
        return res.status(400).send(error.message);
      }
      res.redirect("/");
    }
  );
});

app.post("/transfer", requireLogin, function (req, res, next) {
  transferFunds(
    req.body.to,
    req.session.user.name,
    req.body.amount,
    function (error) {
      if (error) {
        return res.status(400).send(error.message);
      }
      res.redirect("/");
    }
  );
});

var accounts = {
  bob: "500",
  alice: "500",
};

var transferFunds = function (to, from, amount, cb) {
  if (!to) {
    return cb(new Error('"To account" is required.'));
  }

  if (!from) {
    return cb(new Error('"From account" is required.'));
  }

  if (!accounts[to]) {
    return cb(
      new Error('Cannot transfer funds to non-existent account ("' + to + '").')
    );
  }

  if (!accounts[from]) {
    return cb(
      new Error(
        'Cannot transfer funds from non-existent account ("' + from + '").'
      )
    );
  }

  if (!amount) {
    return cb(new Error('"Amount" is required.'));
  }

  try {
    amount = new BigNumber(amount);
  } catch (error) {
    return cb(new Error("Amount must be a valid number."));
  }

  // console.log(
  //   "Transferring funds (" +
  //     amount.toString() +
  //     ') from "' +
  //     from +
  //     '" to "' +
  //     to +
  //     '"'
  // );

  accounts[to] = new BigNumber(accounts[to]).plus(amount).toString();
  var num = new BigNumber(accounts[from]).minus(amount);

  if (num.lt(0)) {
    return cb(new Error("Insufficient funds in the '" + from + "' account."));
  } else {
    accounts[from] = num.toString();
  }

  // console.log("New account balances:");
  // console.log(JSON.stringify(accounts, null, 2));

  cb();
};

app.listen(3000, function () {
  console.log("Server started and listening at localhost:3000");
});

var evilApp = express();

evilApp.engine(
  "html",
  exphbr({
    defaultLayout: "main",
    extname: ".html",
  })
);

evilApp.set("view engine", "html");

evilApp.get("/", function (req, res, next) {
  res.render("evil-examples");
});

evilApp.get("/malicious-form", function (req, res, next) {
  res.render("malicious-form");
});

evilApp.listen(3001, function () {
  console.log('"Evil" server started and listening at localhost:3001');
});
