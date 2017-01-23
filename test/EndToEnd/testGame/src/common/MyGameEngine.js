'use strict';
const incheon = require('../../../../../');
const GameEngine = incheon.GameEngine;
const PlayerAvatar = require('./PlayerAvatar');

class MyGameEngine extends GameEngine {

    start() {

        super.start();
        this.players = {};

        this.worldSettings = {
            width: 400,
            height: 400
        };
    }

    addPlayer(playerId) {
        let p = this.players[playerId] = new PlayerAvatar(++this.world.idCount, 10 * playerId, 0);
        this.addObjectToWorld(p);
        console.log(`added player ${p.toString()}`);
    }

    processInput(inputData, playerId) {

        super.processInput(inputData, playerId);

        // get the player tied to the player socket
        let player;
        for (let objId in this.world.objects) {
            if (this.world.objects[objId].playerId == playerId) {
                player = this.world.objects[objId];
                break;
            }
        }

        if (player) {
            console.log(`player ${playerId} pressed ${inputData.input}`);
            if (inputData.input === 'up') {
                player.isMovingUp = true;
            } else if (inputData.input === 'down') {
                player.isMovingDown = true;
            } else if (inputData.input === 'right') {
                player.isRotatingRight = true;
            } else if (inputData.input === 'left') {
                player.isRotatingLeft = true;
            } else if (inputData.input === 'space') {
                this.fire(player, inputData.messageIndex);
                this.emit('fire');
            }
        }
    }
}

module.exports = MyGameEngine;
