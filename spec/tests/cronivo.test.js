'use strict';

const proxyquire = require('proxyquire').noCallThru();

describe('cronivo:', () => {
  let cronivo;

  let redisLock;

  beforeEach(() => {
    redisLock = jasmine.createSpy('redisLock');
    cronivo = proxyquire('../../src/cronivo', {
      'redis-lock': redisLock,
    });
  });

  describe('setUp:', () => {
    it('should initialize redisLock and return the public api', () => {
      const argument = 'redisClient';
      const result = cronivo(argument);
      expect(redisLock).toHaveBeenCalledWith(argument);
      expect(result.setInterval).toBeDefined();
    });
  });
});
