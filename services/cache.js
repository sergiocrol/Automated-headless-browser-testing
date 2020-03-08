// When we make a query through mongoose, it will be executed right after the search has been completed
// In this case, we want the query only to be executed if the request has not been made before, so in this script
// we can override mongoose functions. If the query exists in the cache, we return the cached value, otherwise, we return 
// the execute the mongoose original query.

const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const key = require('../config/keys');

const client = redis.createClient(key.redisUrl);
client.hget = util.promisify(client.hget);
// Here we're storing a reference to the original exec function
const exec = mongoose.Query.prototype.exec;

// Because of we are modifying the exec function of mongoose (and exec function is ALWAYS called in every 
// query), this cache logic will be executed in all the queries, and maybe that is something we want to avoid.
// For that, we will declare another function (cache), that we use only in those queries we want to apply the cache logic
mongoose.Query.prototype.cache = function (options = {}) {
  // the keyword 'this' is equal to the query instance, so if we run a query (Blog.find({id: 123}), for instance), a query instance
  // of Blog will be created. We can call then to the cache function back in the query -> Blog.find({id: 123}).cache(), and
  // this.useCache will be true only for that Blog instance.
  this.useCache = true;

  this.hashKey = JSON.stringify(options.key || '');
  // to make 'cache' as a chainable property -> Blog.find({id: 123}).cache().limit(10).sort()... we return it.
  return this;
}

// We don't use arroy function because we want to reference to Query whe we use this keyword
mongoose.Query.prototype.exec = async function () {
  // If we don't want to use this cache logic, we check that the query does not have useCache to true (what means that cache()
  // function has not been called). In this case, we return the original exec function
  if (!this.useCache) {
    return exec.apply(this, arguments);
  }

  // In order to get a consistent and unique key, we need the made query, as well as the collection name
  // (because maybe we're requesting an ID, but this ID can be requested for Blogs and for Users, for example; so 
  // only the convination of both allows us to get a reliable key)

  // Object.assign is used to safely copy properties from one object to another:
  // First arg: Object that we are going to copy a buch of properties to.
  const key = JSON.stringify(Object.assign({}, this.getQuery(), {
    collection: this.mongooseCollection.name
  }));

  // See if we have a value for key in Redis
  const cacheValue = await client.hget(this.hashKey, key);

  // If we do, return that
  if (cacheValue) {
    // exec function is supposed to return a mongoose model, not a JSON object, so we pass the cacheValue object 
    // to the model.But since the cacheValue can be a single object or an array, we have to handle it
    const doc = JSON.parse(cacheValue);

    return Array.isArray(doc)
      ? doc.map(d => new this.model(d))
      : new this.model(doc);
  }

  // Otherwise, issue the query and store the result in Redis
  // this code will execute the ORIGINAL exec function. We use the apply function, so that we can pass in 
  // automatically any arguments that are passed into exec as well
  const result = await exec.apply(this, arguments);
  //Since does not exist in cache, we save it (we can also assign an expiration in seconds: 'EX', 10 <- Number of seconds)
  client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10);

  return result;
}

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  }
}