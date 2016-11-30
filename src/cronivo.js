'use strict';

const _ = require('lodash');
const later = require('later');

let redisClient;
let redisLock;

/**
 * Executes the action for either setInterval or setTimeout, using lock and redis to synchronize
 * execution.
 *
 * @param  {Function}       action   The function to be executed on the provided schedule
 * @param  {schedule}       schedule A later schedule for the action
 * @param  {string}         jobName  The name of the job to be executed
 * @private
 */
function executeAction(action, schedule, jobName) {
  // Locks so other jobs wait before executing
  redisLock(`${jobName}Lock`, (done) => {
    // Gets the job next execution saved on redis
    redisClient.get(jobName, (err, reply) => {
      // If the next execution (saved on redis) is null or greater than now, then this job must
      // execute, else, it was already executed
      const nextExecution = later.schedule(schedule).next(1);
      // Sets milliseconds to zero since later doesn't use or set it
      nextExecution.setMilliseconds(0);
      if (_.isNil(reply) || reply.toString() < nextExecution.getTime()) {
        // Sets the next execution time on redis so other jobs wont run
        redisClient.set(jobName, nextExecution.getTime(), () => {
          // Releases the lock since it is no longer required
          done();
          // Calls the method passed by the user
          action();
        });
      } else {
        done();
      }
    });
  });
}

// Public methods
const api = {
  /**
   * Executes the provided function repeatedely in the provided schedule. Uses the job name as a key
   * on redis, therefore it must be unique.
   *
   * @param  {Function}       action   The function to be executed on the provided schedule
   * @param  {schedule}       schedule A later schedule for the action
   * @param  {string}         jobName  The name of the job to be executed
   */
  setInterval(action, schedule, jobName) {
    // Uses later setInterval method to schedule the job, with some extra instructions to ensure
    // synced execution
    later.setInterval(() => executeAction(action, schedule, jobName), schedule);
  },

  /**
   * Executes the provided function once in the provided schedule. Uses the job name as a key on
   * redis, therefore it must be unique.
   *
   * @param  {Function}       action   The function to be executed on the provided schedule
   * @param  {schedule}       schedule A later schedule for the action
   * @param  {string}         jobName  The name of the job to be executed
   */
  setTimeout(action, schedule, jobName) {
    // Uses later setInterval method to schedule the job, with some extra instructions to ensure
    // synced execution
    later.setTimeout(() => executeAction(action, schedule, jobName), schedule);
  },
};

/**
 * Sets up the module, saving the redis client and using it to startup redisLock.
 *
 * @param {RedisClient} client A redis client connected to a redis instance where the jobs data will
 *                             be saved
 * @return {Object}            The public methods available to schedule jobs
 */
function setUp(client) {
  redisClient = client;
  // Uses the provided client to configure redisLock
  redisLock = require('redis-lock')(redisClient);  // eslint-disable-line global-require
  // Returns available methods
  return api;
}


module.exports = setUp;
