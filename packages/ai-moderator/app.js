const express = require("express");
const moderationRouter = require('./routes/moderation-routes.js');
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/moderation', moderationRouter);

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;