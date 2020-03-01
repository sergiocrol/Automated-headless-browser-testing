const { clearHash } = require('../services/cache');

module.exports = async (req, res, next) => {
  // In this case we want to run this middleware AFTER the function has been executed (because if there is some 
  // error we won't want to clear the hash), so the way would be to make the function async, and wait until the 
  // route handler has been finished (next()) to make the rest operations
  await next();

  clearHash(req.user.id);
};