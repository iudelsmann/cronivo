'use strict';

const proxyquire = require('proxyquire').noCallThru();
const later = require('later');

describe('cronivo:', () => {
  const redisClient = {};

  let Cronivo;
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
    redisClient.del = jasmine.createSpy('del').and.callFake((jobName, cb) => cb());

    spyOn(later, 'setInterval').and.callFake((func) => { func(); return 'Mock'; });
    spyOn(later, 'setTimeout').and.callFake((func) => { func(); return 'Mock'; });

    Cronivo = proxyquire('../../src/cronivo', {
      'redis-lock': redisLock,
      later,
    });

    cronivo = new Cronivo(redisClient);

    jasmine.clock().install();
    jasmine.clock().mockDate(basetime);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  describe('constructor:', () => {
    it('should initialize redisLock redisClient and the jobs list', () => {
      const argument = 'redisClient';
      const instance = new Cronivo(argument);
      expect(redisLock).toHaveBeenCalledWith(argument);
      expect(instance.redisLock).toBeDefined();
      expect(instance.redisClient).toBeDefined();
      expect(instance.jobs).toBeDefined();
    });
  });

  describe('addJob:', () => {
    let schedule;
    let action;

    beforeEach(() => {
      schedule = later.parse.recur().every(5).second();
      action = jasmine.createSpy('action');
    });

    it('should call the function if no value was on the database', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, null));

      const jobName = 'jobName';
      cronivo.addJob(action, schedule, jobName);

      expect(later.setInterval).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).toHaveBeenCalledWith(jobName, basetime.getTime() + 1000,
        jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
      expect(cronivo.jobs[jobName]).toBeDefined();
    });

    it('should call the function if the database value was earlier than now', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, basetime.getTime() - 4000));

      const jobName = 'jobName';
      cronivo.addJob(action, schedule, jobName);

      expect(later.setInterval).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).toHaveBeenCalledWith(jobName, basetime.getTime() + 1000,
        jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
      expect(cronivo.jobs[jobName]).toBeDefined();
    });

    it('should not call the function if the database value is greater than now', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, basetime.getTime() + 1000));

      const jobName = 'jobName';
      cronivo.addJob(action, schedule, jobName);

      expect(later.setInterval).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).not.toHaveBeenCalled();
      expect(freeLock).toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
      expect(cronivo.jobs[jobName]).toBeDefined();
    });
  });

  describe('addSingleJob:', () => {
    let schedule;
    let action;

    beforeEach(() => {
      schedule = later.parse.recur().every(5).second();
      action = jasmine.createSpy('action');
    });

    it('should call the function if no value was on the database', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, null));

      const jobName = 'jobName';
      cronivo.addSingleJob(action, schedule, jobName);

      expect(later.setTimeout).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).toHaveBeenCalledWith(jobName, basetime.getTime() + 1000,
        jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
      expect(cronivo.jobs[jobName]).toBeDefined();
    });

    it('should call the function if the database value was earlier than now', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, basetime.getTime() - 4000));

      const jobName = 'jobName';
      cronivo.addSingleJob(action, schedule, jobName);

      expect(later.setTimeout).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).toHaveBeenCalledWith(jobName, basetime.getTime() + 1000,
        jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
      expect(action).toHaveBeenCalled();
      expect(cronivo.jobs[jobName]).toBeDefined();
    });

    it('should not call the function if the database value is greater than now', () => {
      redisClient.get = jasmine.createSpy('get').and.callFake((jobName, cb) => cb(null, basetime.getTime() + 1000));

      const jobName = 'jobName';
      cronivo.addSingleJob(action, schedule, jobName);

      expect(later.setTimeout).toHaveBeenCalled();
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(redisClient.get).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisClient.set).not.toHaveBeenCalled();
      expect(freeLock).toHaveBeenCalled();
      expect(action).not.toHaveBeenCalled();
      expect(cronivo.jobs[jobName]).toBeDefined();
    });
  });

  describe('cancelJob:', () => {
    it('should erase job from jobs list and redis', () => {
      const jobName = 'jobName';
      const mockJob = {
        clear: jasmine.createSpy('clear'),
      };
      cronivo.jobs[jobName] = mockJob;
      cronivo.cancelJob(jobName);
      expect(mockJob.clear).toHaveBeenCalled();
      expect(cronivo.jobs[jobName]).not.toBeDefined();
      expect(redisClient.del).toHaveBeenCalledWith(jobName, jasmine.any(Function));
      expect(redisLockMethod).toHaveBeenCalledWith(`${jobName}Lock`, jasmine.any(Function));
      expect(freeLock).toHaveBeenCalled();
    });

    it('should  not throw error for unexistent jobs', () => {
      const jobName = 'jobName';
      cronivo.cancelJob(jobName);
      expect(redisClient.del).not.toHaveBeenCalled();
      expect(redisLockMethod).not.toHaveBeenCalled();
      expect(freeLock).not.toHaveBeenCalled();
    });
  });
});
