/* eslint-disable no-unused-expressions */

const app = require('../../../app.js');
const { expect } = require('chai');
const { exec } = require('child_process');
const config = require('config');
const request = require('supertest')(app);

describe('Black Box Test: Auth', () => {
  beforeEach((done) => {
    exec('NODE_ENV=test yarn migrate && yarn seed', (error) => {
      done(error);
    });
  });

  afterEach((done) => {
    exec('NODE_ENV=test yarn migrate:undo', (error) => {
      config.auth.jwt = false;

      done(error);
    });
  });

  describe('POST /api/payments/charge', () => {
    it('should charge a customer', (done) => {
      request
        .post('/api/payments/charge')
        .send({
          stripeToken: 'tok_visa',
          stripeEmail: 'mike@xxxxxxxx.com',
          amount: '1400',
        })
        .expect(200)
        .end((err, response) => {
          const body = response.body;
          const data = body.data.payment;

          expect(data.status).to.equal('succeeded');
          expect(data.amount).to.equal(1400);
          expect(data.captured).to.be.true;
          expect(data.currency).to.equal('usd');
          expect(data.receipt_email).to.equal('mike@xxxxxxxx.com');

          done();
        });
    });

    it('should throw an error if card is declined', (done) => {
      request
        .post('/api/payments/charge')
        .send({
          stripeToken: 'tok_chargeDeclined',
          stripeEmail: 'mike@xxxxxxxx.com',
        })
        .expect(400)
        .end((err, response) => {
          const body = response.body;

          expect(body.status).to.equal('fail');
          expect(body).to.have.all.keys('status', 'name', 'data');
          expect(body.data).to.have.all.keys('payment');
          expect(body.name).to.equal('StripeInvalidRequestError');

          done();
        });
    });
  });
});
