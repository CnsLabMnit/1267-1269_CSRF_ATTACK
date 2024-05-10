var _ = require("underscore");
var BigNumber = require("bignumber.js");
var bodyParser = require("body-parser");
var express = require("express");
var exphbr = require("express-handlebars");
var session = require("express-session");
var crypto = require("crypto");

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

app.use(function (req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  next();
});

function csrfProtection(req, res, next) {
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    return next();
  }

  var csrfToken = req.body._csrf || req.headers["x-csrf-token"];

  if (!csrfToken || csrfToken !== req.session.csrfToken) {
    return res.status(403).send("CSRF token missing or invalid.");
  }

  next();
}

app.get("/", requireLogin, function (req, res, next) {
  res.render("home", {
    username: req.session.user.name,
    balance: accounts[req.session.user.name] || 0,
    csrfToken: req.session.csrfToken,
  });
});

app.get("/login", function (req, res, next) {
  res.render("login", { csrfToken: req.session.csrfToken });
});

var validLogins = [
  { username: "bob", password: "test" },
  { username: "alice", password: "test" },
];

app.post("/login", function (req, res, next) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).send("Username and password are required.");
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

  req.session.csrfToken = generateCsrfToken();
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
  res.render("transfer", { csrfToken: req.session.csrfToken });
});

app.post("/transfer", csrfProtection, requireLogin, function (req, res, next) {
  // Handle funds transfer
  var to = req.body.to;
  var amount = req.body.amount;

  transferFunds(to, req.session.user.name, amount, function (error) {
    if (error) {
      return res.status(400).send(error.message);
    }
    res.redirect("/");
  });
});

var accounts = {
  bob: "500",
  alice: "500",
};

function generateCsrfToken() {
  return crypto.randomBytes(16).toString("hex");
}

var transferFunds = function (to, from, amount, cb) {
  if (!to || !from) {
    return cb(new Error('"To" and "From" accounts are required.'));
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
    return cb(new Error("Amount is required."));
  }

  try {
    amount = new BigNumber(amount);
  } catch (error) {
    return cb(new Error("Amount must be a valid number."));
  }

  console.log(
    "Transferring funds (" +
      amount.toString() +
      ') from "' +
      from +
      '" to "' +
      to +
      '"'
  );

  accounts[to] = new BigNumber(accounts[to]).plus(amount).toString();
  var num = new BigNumber(accounts[from]).minus(amount);

  if (num.lt(0)) {
    return cb(new Error("Insufficient funds in the '" + from + "' account."));
  } else {
    accounts[from] = num.toString();
  }

  console.log("New account balances:");
  console.log(JSON.stringify(accounts, null, 2));

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
