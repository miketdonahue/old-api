/* eslint-disable no-unused-expressions */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('Unit Test: Auth Emails', () => {
  let mock;
  let authEmails;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    mock = {
      mailer: {
        send: sinon.spy(),
      },
    };

    authEmails = proxyquire('../auth-emails', {
      'local-mailer': mock.mailer,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Confirmation Email', () => {
    it('should be passed the correct options for confirmation email', () => {
      const options = {
        campaignId: 'signup-confirmation',
        templateId: 'signup-confirmation',
        substitutionData: {
          first_name: 'Mike',
          confirmed_token: '123xyz',
        },
      };

      const user = {
        first_name: 'Mike',
        confirmed_token: '123xyz',
      };

      authEmails.sendConfirmMail(user);

      expect(mock.mailer.send.calledOnce).to.be.true;
      expect(mock.mailer.send.getCall(0).args[1]).to.deep.equal(options);
    });
  });

  describe('Welcome Email', () => {
    it('should be passed the correct options for welcome email', () => {
      const options = {
        campaignId: 'welcome',
        templateId: 'welcome',
        substitutionData: {
          first_name: 'Mike',
        },
      };

      const user = {
        first_name: 'Mike',
      };

      authEmails.sendWelcomeMail(user);

      expect(mock.mailer.send.calledOnce).to.be.true;
      expect(mock.mailer.send.getCall(0).args[1]).to.deep.equal(options);
    });
  });

  describe('Reset Password Email', () => {
    it('should be passed the correct options for reset password email', () => {
      const options = {
        campaignId: 'reset-password',
        templateId: 'reset-password',
        substitutionData: {
          first_name: 'Mike',
          reset_password_token: '123xyz',
        },
      };

      const user = {
        first_name: 'Mike',
        reset_password_token: '123xyz',
      };

      authEmails.sendResetPasswordMail(user);

      expect(mock.mailer.send.calledOnce).to.be.true;
      expect(mock.mailer.send.getCall(0).args[1]).to.deep.equal(options);
    });
  });
});
