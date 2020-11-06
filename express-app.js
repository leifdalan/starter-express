const express = require("express");
const morgan = require("morgan");
const { createRequestHandler } = require("@remix-run/express");

let app = express();

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.static("public"));

app.get(
  "*",
  (req, res, next) => {
    return createRequestHandler({
      getLoadContext() {
        // Whatever you return here will be passed as `context` to your loaders.
      }
    })(req, res, next)
  
  }
);

module.exports = app;
