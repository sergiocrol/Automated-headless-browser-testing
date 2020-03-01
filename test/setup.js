// By default Jest give us 5000ms to complete a test. Sometimes we'll need more time in order to complete
// more complex integration tests, so that is sometething we can handle here
jest.setTimeout(30000);

// In this file we're gonna setup our test suite in order to get access to mongoose 
// (by default, JEST is going to run only the files with .test extension). But to say JEST to look for
// this file, we need to set in our package.json
require('../models/User');

const mongoose = require('mongoose');
const keys = require('../config/keys');

mongoose.Promise = global.Promise;
mongoose.connect(keys.mongoURI, { useMongoClient: true });