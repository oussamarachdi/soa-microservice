const express = require('express');
const routes = require('./routes');

const app = express();
app.use(express.json());

// REST routes
app.use('/api/users', routes);

app.listen(3001, () => {
  console.log('User Service running on port 3001');
});