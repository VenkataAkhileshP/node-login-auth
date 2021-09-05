// mongodb
require('./config/db');
require('dotenv').config();

const app = require('express')();
const cors = require('cors');
const morgan = require("morgan");
const bodyParser = require('express').json;
const port = process.env.PORT || 8000;

const UserRouter = require('./api/User');

app.use(morgan("common"));
app.use(cors());
app.use(bodyParser());

app.get("/health-check", (req, res) => {
  return res.json({ status: "alive" });
})

app.use('/user', UserRouter);

// 404 Response
app.use((req, res) => {
  res.status(404).json({ error: "Not Found." });
});

app.listen(port, () => {
    console.log(`Listening on ${port}`);
    console.log(`PID: ${process.pid}`);
})