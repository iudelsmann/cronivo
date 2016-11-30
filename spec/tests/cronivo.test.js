'use strict';

const proxyquire = require('proxyquire').noCallThru();
const later = require('later');

describe('cronivo:', () => {
  const redisClient = {};

  let cronivo;
  let redisLock;
  let redisLockMethod;
  let freeLock;

  const basetime = new Date('2000-01-01 00:00:04');

  beforeEach(() => {
    freeLock = jasmine.createSpy('freeLock');
    redisLockMethod = jasmine.createSpy('redisLockMethod').and.callFake((lockName, cb) => cb(freeLock));
    redisLock = jasmine.createSpy('redisLock').and.returnValue(redisLockMethod);

    redisClient.set = jasmine.createSpy('set').and.callFake((jobName, value, cb) => cb());

    spyOn(later, 'setInterval').and.callFake(func => func());

    cronivo = proxyquire('../../src/cronivo', {
      'redis-lock': redisLock,
      later,
    });

    jasmine.clock().install();
    jasmine.clock().mockDate(basetime);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  describe('setUp:', () => {
    it('should initialize redisLock and return the public api', () => {
      const argument = 'redisClient';
      const result = cronivo(argument);
      expect(redisLock).toHaveBeenCalledWith(argument);
      expect(result.setInterval).toBeDefined();
    });
  });

  describe('setInterval:', () => {
    let setInterval;
    let schedule;
    let action;

    beforeEach(() => {
      setInterval = cronivo(redisClient).setInterval;
      schedule = later.parse.recur().every(5).second();
      action = jasmine.createSpy('action');
    });

    it('should call the function if no value was on the database', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, null));

      const jobName = 'jobName';
      setInterval(action, schedule, jobName);

      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).toHaveBeenCalledWith(jobName, basetime.getTime() + 1000,
        jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
    });

    it('should call the function if the database value was earlier than now', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, basetime.getTime() - 4000));

      const jobName = 'jobName';
      setInterval(action, schedule, jobName);

      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).toHaveBeenCalledWith(jobName, basetime.getTime() + 1000,
        jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
    });

    it('should not call the function if the database value is greater than now', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, basetime.getTime() + 1000));

      const jobName = 'jobName';
      setInterval(action, schedule, jobName);

      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).not.toHaveBeenCalled();
      expect(freeLock).toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
    });
  });
});
