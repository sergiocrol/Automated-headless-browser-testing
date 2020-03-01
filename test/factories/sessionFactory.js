// this is a session factory. Everytime we want to login a user, we will call to this function
const Buffer = require('safe-buffer').Buffer;
// We use keygrip, that is going to generate a session signature with the session string and the cookie key.
// The cookie key is extracted from keys.js, which is a document that determines what key returns depending of environment
// we are making the calling from
const Keygrip = require('keygrip');
const keys = require('../../config/keys');
const keygrip = new Keygrip([keys.cookieKey]);

module.exports = (user) => {
  // We create an object with the user id, and we convert it into base64 string
  const sessionObj = {
    passport: {
      user: user._id.toString()
    }
  };
  const session = Buffer.from(JSON.stringify(sessionObj)).toString('base64');
  const sig = keygrip.sign('session=' + session);

  return { session, sig };
};