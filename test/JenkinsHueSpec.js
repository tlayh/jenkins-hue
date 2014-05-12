'use strict';

var JenkinsHue = require('../lib/JenkinsHue');
var Jenkins = require('../lib/Jenkins');
var Hue = require('../lib/Hue');
var chai = require("chai");
var sinon = require("sinon");
var sinonChai = require("sinon-chai");
var expect = chai.expect;
var q = require('q');

chai.use(sinonChai);

var jenkinsHue, jenkinsHueWithConfig;

var configuration = {
    jenkins: {
        host: 'http://ci.jruby.org'
    },
    hue: {
        host: '192.168.178.210',
        username: ''
    }
};

describe('JenkinsHue', function () {

    beforeEach(function () {
        jenkinsHue = new JenkinsHue();
        jenkinsHueWithConfig = new JenkinsHue(configuration);
        sinon.stub(jenkinsHueWithConfig.jenkins, 'getJobColor');
        sinon.stub(jenkinsHueWithConfig.hue, 'setLight').returns(q.resolve());
    });

    afterEach(function() {
        jenkinsHueWithConfig.jenkins.getJobColor.restore();
        jenkinsHueWithConfig.hue.setLight.restore();
    });

    describe('Configuration', function () {
        it('should have no configuration by default', function () {
            var config = jenkinsHue.config;
            expect(config).to.be.null;
        });

        it('should have a configuration when one is given in the constructor', function () {
            var config = jenkinsHueWithConfig.config;
            expect(config).not.to.be.empty;
            expect(config.jenkins.host).to.be.equals('http://ci.jruby.org');
        });
    });

    describe('#init()', function () {
        it('should create an instance for Jenkins module', function () {
            jenkinsHue.init(configuration);
            expect(jenkinsHue.jenkins).to.be.instanceOf(Jenkins);
        });

        it('should create an instance for Hue module', function () {
            jenkinsHue.init(configuration);
            expect(jenkinsHue.hue).to.be.instanceOf(Hue);
        });
    });

    describe('#setLightForJenkinsJob()', function () {

        it('should fail with an error when no configuration was set', function () {
            expect(function () {
                jenkinsHue.setLightForJenkinsJob(1, 'foobar');
            }).to.throw(Error);
        });

        it('should fail when a parameter is missing', function () {
            expect(function () {
                jenkinsHueWithConfig.setLightForJenkinsJob();
            }).to.throw(Error);

            expect(function () {
                jenkinsHueWithConfig.setLightForJenkinsJob('bar');
            }).to.throw(Error);
        });

        it('should save the current light state for the given lightId', function () {
            jenkinsHueWithConfig.jenkins.getJobColor.returns(q.resolve('green'));

            return jenkinsHueWithConfig.setLightForJenkinsJob(3, 'jruby-dist-1_7').then(function () {
                expect(jenkinsHueWithConfig.getCurrentLightState(3)).to.exist;
                expect(jenkinsHueWithConfig.getCurrentLightState(3)).to.be.equals(jenkinsHueWithConfig.hueLightStates.PASSED);
            });
        });

        it('should blink if job color changes and is different', function() {
            var spy = sinon.spy(jenkinsHueWithConfig, 'blinkLight');
            var stub = jenkinsHueWithConfig.jenkins.getJobColor;
            stub.onCall(0).returns(q.resolve('green'));

            return jenkinsHueWithConfig.setLightForJenkinsJob(3, 'jruby-dist-1_7').done(function () {
                expect(spy).to.have.been.calledOnce;
            });
        });

        it('should not blink if job color changes and is the same ', function() {
            var spy = sinon.spy(jenkinsHueWithConfig, 'blinkLight');
            var stub = jenkinsHueWithConfig.jenkins.getJobColor;
            stub.onCall(0).returns(q.resolve('green'));
            stub.onCall(1).returns(q.resolve('green'));

            return jenkinsHueWithConfig.setLightForJenkinsJob(3, 'jruby-dist-1_7').done(function () {
                return jenkinsHueWithConfig.setLightForJenkinsJob(3, 'jruby-dist-1_7').done(function () {
                    expect(spy).to.have.been.calledOnce;
                });
            });
        });
    });

    describe('#switchOff', function() {
        it('should switch the given light off', function() {
            expect(jenkinsHueWithConfig.getCurrentLightState(3)).to.not.be.equals(jenkinsHueWithConfig.hueLightStates.OFF);
            jenkinsHueWithConfig.switchOff(3);
            expect(jenkinsHueWithConfig.getCurrentLightState(3)).to.be.equals(jenkinsHueWithConfig.hueLightStates.OFF);
        });
    });

    describe('#isLightSwitchedOn', function() {
        beforeEach(function() {
            sinon.stub(jenkinsHueWithConfig.hue, 'getLightStatus')
                .withArgs(1).returns(q.resolve(require('./fixtures/hue.lightstate.on.json')))
                .withArgs(2).returns(q.resolve(require('./fixtures/hue.lightstate.off.json')));
        });

        afterEach(function() {
            jenkinsHueWithConfig.hue.getLightStatus.restore();
        });

        it('should return true if light is on', function() {
           return jenkinsHueWithConfig.isLightSwitchedOn(1).done(function(lightState) {
               expect(lightState).to.be.true;
           });
        });

        it('should return false if light is off', function() {
            return jenkinsHueWithConfig.isLightSwitchedOn(2).done(function(lightState) {
                expect(lightState).to.be.false;
            });
        });
    });
});