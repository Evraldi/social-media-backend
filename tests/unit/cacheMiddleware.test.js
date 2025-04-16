const { expect } = require('chai');
const sinon = require('sinon');
const { cache, clearCache } = require('../../middlewares/cacheMiddleware');
const { redisClient } = require('../../config/redis');

describe('Cache Middleware', () => {
  let req, res, next, redisGetStub, redisSetExStub, redisDelStub, redisKeysStub;

  beforeEach(() => {
    // Setup request, response and next function
    req = {
      method: 'GET',
      originalUrl: '/api/test'
    };

    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
      send: sinon.stub()
    };

    next = sinon.stub();

    // Stub Redis methods
    redisGetStub = sinon.stub(redisClient, 'get');
    redisSetExStub = sinon.stub(redisClient, 'setEx');
    redisDelStub = sinon.stub(redisClient, 'del');
    redisKeysStub = sinon.stub(redisClient, 'keys');

    // Mock isReady property
    sinon.stub(redisClient, 'isReady').value(true);
  });

  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });

  describe('cache middleware', () => {
    it('should skip caching for non-GET requests', async () => {
      req.method = 'POST';
      await cache()(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(redisGetStub.called).to.be.false;
    });

    it('should skip caching if Redis is not connected', async () => {
      // Override isReady property
      sinon.restore(); // Restore previous stub
      sinon.stub(redisClient, 'isReady').value(false);

      await cache()(req, res, next);
      expect(next.calledOnce).to.be.true;
      expect(redisGetStub.called).to.be.false;
    });

    it('should return cached response if available', async () => {
      // Reset stubs for this test
      sinon.restore();
      sinon.stub(redisClient, 'isReady').value(true);
      redisGetStub = sinon.stub(redisClient, 'get');

      // Setup request, response and next function again
      req = {
        method: 'GET',
        originalUrl: '/api/test'
      };

      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
        send: sinon.stub()
      };

      next = sinon.stub();

      const cachedData = { data: 'test data' };
      redisGetStub.resolves(JSON.stringify(cachedData));

      await cache()(req, res, next);

      expect(redisGetStub.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({
        ...cachedData,
        cache: true
      })).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should call next and set up response interception if cache miss', async () => {
      // Reset stubs for this test
      sinon.restore();
      sinon.stub(redisClient, 'isReady').value(true);
      redisGetStub = sinon.stub(redisClient, 'get');

      // Setup request, response and next function again
      req = {
        method: 'GET',
        originalUrl: '/api/test'
      };

      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
        send: sinon.stub()
      };

      next = sinon.stub();

      redisGetStub.resolves(null);

      await cache()(req, res, next);

      expect(redisGetStub.calledOnce).to.be.true;
      expect(next.calledOnce).to.be.true;
      expect(typeof res.send).to.equal('function');
    });

    it('should cache successful responses', async () => {
      // Reset stubs for this test
      sinon.restore();
      sinon.stub(redisClient, 'isReady').value(true);
      redisGetStub = sinon.stub(redisClient, 'get');
      redisSetExStub = sinon.stub(redisClient, 'setEx');

      // Setup request, response and next function again
      req = {
        method: 'GET',
        originalUrl: '/api/test'
      };

      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
        send: sinon.stub()
      };

      next = sinon.stub();

      redisGetStub.resolves(null);

      await cache()(req, res, next);

      // Simulate a successful response
      const responseData = { success: true, data: 'test data' };
      res.statusCode = 200;
      res.send(JSON.stringify(responseData));

      expect(redisSetExStub.calledOnce).to.be.true;
      expect(redisSetExStub.firstCall.args[0]).to.equal('cache:/api/test');
      expect(redisSetExStub.firstCall.args[1]).to.equal(60); // Default TTL
      expect(JSON.parse(redisSetExStub.firstCall.args[2])).to.deep.equal(responseData);
    });
  });

  describe('clearCache function', () => {
    it('should do nothing if Redis is not connected', async () => {
      // Override isReady property
      sinon.restore(); // Restore previous stub
      sinon.stub(redisClient, 'isReady').value(false);

      // Re-stub the methods we need
      redisKeysStub = sinon.stub(redisClient, 'keys');
      redisDelStub = sinon.stub(redisClient, 'del');

      await clearCache('test*');

      expect(redisKeysStub.called).to.be.false;
      expect(redisDelStub.called).to.be.false;
    });

    it('should delete keys matching the pattern', async () => {
      // Reset stubs for this test
      sinon.restore();
      sinon.stub(redisClient, 'isReady').value(true);
      redisKeysStub = sinon.stub(redisClient, 'keys');
      redisDelStub = sinon.stub(redisClient, 'del');

      const keys = ['cache:test1', 'cache:test2'];
      redisKeysStub.resolves(keys);

      await clearCache('test*');

      expect(redisKeysStub.calledWith('cache:test*')).to.be.true;
      expect(redisDelStub.calledWith(keys)).to.be.true;
    });

    it('should not call del if no keys match the pattern', async () => {
      // Reset stubs for this test
      sinon.restore();
      sinon.stub(redisClient, 'isReady').value(true);
      redisKeysStub = sinon.stub(redisClient, 'keys');
      redisDelStub = sinon.stub(redisClient, 'del');

      redisKeysStub.resolves([]);

      await clearCache('test*');

      expect(redisKeysStub.calledWith('cache:test*')).to.be.true;
      expect(redisDelStub.called).to.be.false;
    });
  });
});
