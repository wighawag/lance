'use strict';

const assert = require('chai').assert;
const incheon = require('../../');
const testGameServer = require('./testGame/server');
const phantom = require('phantom');
const NUM_CLIENTS = 5;

let state = {
    server: null,
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
                console.log(`started phatom instance ${c}`)
                clientDesc.instance = instance;
                clientDesc.id = c;
                return instance.createPage();
            })
            .then(page => {
                clientDesc.page = page;
                return page.open('http://127.0.0.1:3000/');
            })
            .then(status => {
                clientDesc.status = status;
                return clientDesc.page.property('content');
            })
            .catch(error => {
                console.log(error);
                done('phantom error');
            });
        state.clients[c] = clientDesc;
        return p;
    }

    it('start five clients', function(done) {
        this.timeout(10000);
        let promises = [];
        for (let c=0; c<NUM_CLIENTS; c++) {
            promises.push(startClient(c));
        }
        Promise.all(promises).then(() => {done();});
    });

    it('show client state', function(done) {
        state.clients.forEach((c) => {
            console.log(`client ${c.id} status ${c.status} content ${c.content}`);
        });
        done();
    });
});
