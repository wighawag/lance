'use strict';

const assert = require('chai').assert;
const incheon = require('../../');
const testGameServer = require('./testGame/server');
const phantom = require('phantom');
const NUM_CLIENTS = 4;

let state = {
    server: null,
    clientPromises: [],
    clients: []
};

describe('multiplayer-game', function() {

    it('start server', function(done) {
        let s = state.server = testGameServer.start();
        assert.instanceOf(s.gameEngine, incheon.GameEngine);
        assert.instanceOf(s.serverEngine, incheon.ServerEngine);
        assert.instanceOf(s.physicsEngine, incheon.physics.PhysicsEngine);
        done();
    });

    function startClient(c) {
        let clientDesc = {};
        let p = phantom.create([], {})
            .then(instance => {
                console.log(`started phatom instance ${c}`);
                clientDesc.instance = instance;
                clientDesc.id = c;
                return instance.createPage();
            })
            .then(page => {
                clientDesc.page = page;
                page.property('onConsoleMessage', function(m) {
                    console.log('message: ', m);
                });
                page.property('onResourceError', function(m) {
                    console.log('resource error: ', m);
                });
                return page.open('http://127.0.0.1:3000/');
            })
            .then(status => {
                clientDesc.status = status;
                return clientDesc.page.property('content');
            })
            .then(content => {
                clientDesc.content = content;
                return Promise.resolve();
            });
        state.clients[c] = clientDesc;
        return p;
    }

    it('start clients', function(done) {
        this.timeout(20000);
        for (let c = 0; c < NUM_CLIENTS; c++) {
            state.clientPromises.push(startClient(c));
        }
        Promise.all(state.clientPromises)
            .then(() => {done();})
            .catch(error => { console.log(error); done(error); });
    });

    it('show client state', function(done) {
        this.timeout(20000);
        state.clients.forEach((c) => {
            console.log(`client ${c.id} status ${c.status} content ${c.content}`);
        });
        done();
    });
});
