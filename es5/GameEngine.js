'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _GameWorld = require('./GameWorld');

var _GameWorld2 = _interopRequireDefault(_GameWorld);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _Timer = require('./game/Timer');

var _Timer2 = _interopRequireDefault(_Timer);

var _Trace = require('./lib/Trace');

var _Trace2 = _interopRequireDefault(_Trace);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * The GameEngine contains the game logic.  Extend this class
 * to implement game mechanics.  The GameEngine derived
 * instance runs once on the server, where the final decisions
 * are always taken, and one instance will run on each client as well,
 * where the client emulates what it expects to be happening
 * on the server.
 *
 * The game engine's logic must listen to user inputs and
 * act on these inputs to change the game state.  For example,
 * the game engine listens to controller/keyboard inputs to infer
 * movement for the player/ship/first-person.  The game engine listens
 * to clicks, button-presses to infer firing, etc..
 *
 * Note that the game engine runs on both the server and on the
 * clients - but the server decisions always have the final say,
 * and therefore clients must resolve server updates which conflict
 * with client-side predictions.
 */
var GameEngine = function () {

  /**
    * Create a game engine instance.  This needs to happen
    * once on the server, and once on each client.
    *
    * @param {Object} options - options object
    * @param {Number} options.traceLevel - the trace level from 0 to 5.  Lower value traces more.
    * @param {Number} options.delayInputCount - client side only.  Introduce an artificial delay on the client to better match the time it will occur on the server.  This value sets the number of steps the client will wait before applying the input locally
    */
  function GameEngine(options) {
    _classCallCheck(this, GameEngine);

    // TODO I think we should discuss this whole globals issues
    // place the game engine in the LANCE globals
    var isServerSide = typeof window === 'undefined';
    var glob = isServerSide ? global : window;
    glob.LANCE = { gameEngine: this };

    // set options
    var defaultOpts = { GameWorld: _GameWorld2.default, traceLevel: _Trace2.default.TRACE_NONE };
    if (!isServerSide) defaultOpts.clientIDSpace = 1000000;
    this.options = Object.assign(defaultOpts, options);

    /**
     * client's player ID, as a string. If running on the client, this is set at runtime by the clientEngine
     * @member {String}
     */
    this.playerId = NaN;

    // set up event emitting and interface
    var eventEmitter = new _eventemitter2.default();

    /**
     * Register a handler for an event
     *
     * @method on
     * @memberof GameEngine
     * @instance
     * @param {String} eventName - name of the event
     * @param {Function} eventHandler - handler function
     */
    this.on = eventEmitter.on;

    /**
     * Register a handler for an event, called just once (if at all)
     *
     * @method once
     * @memberof GameEngine
     * @instance
     * @param {String} eventName - name of the event
     * @param {Function} eventHandler - handler function
     */
    this.once = eventEmitter.once;

    /**
     * Remove a handler
     *
     * @method removeListener
     * @memberof GameEngine
     * @instance
     * @param {String} eventName - name of the event
     * @param {Function} eventHandler - handler function
     */
    this.removeListener = eventEmitter.removeListener;

    this.emit = eventEmitter.emit;

    // set up trace
    this.trace = new _Trace2.default({ traceLevel: this.options.traceLevel });
  }

  _createClass(GameEngine, [{
    key: 'findLocalShadow',
    value: function findLocalShadow(serverObj) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {

        for (var _iterator = Object.keys(this.world.objects)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var localId = _step.value;

          if (Number(localId) < this.options.clientIDSpace) continue;
          var localObj = this.world.objects[localId];
          if (localObj.hasOwnProperty('inputId') && localObj.inputId === serverObj.inputId) return localObj;
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return null;
    }
  }, {
    key: 'initWorld',
    value: function initWorld(worldSettings) {

      this.world = new _GameWorld2.default();

      // on the client we have a different ID space
      if (this.options.clientIDSpace) {
        this.world.idCount = this.options.clientIDSpace;
      }

      /**
      * The worldSettings defines the game world constants, such
      * as width, height, depth, etc. such that all other classes
      * can reference these values.
      * @member {Object} worldSettings
      * @memberof GameEngine
      */
      this.worldSettings = Object.assign({}, worldSettings);
    }

    /**
      * Start the game. This method runs on both server
      * and client. Extending the start method is useful
      * for setting up the game's worldSettings attribute,
      * and registering methods on the event handler.
      */

  }, {
    key: 'start',
    value: function start() {
      var _this = this;

      this.trace.info(function () {
        return '========== game engine started ==========';
      });
      this.initWorld();

      // create the default timer
      this.timer = new _Timer2.default();
      this.timer.play();
      this.on('postStep', function (step, isReenact) {
        if (!isReenact) _this.timer.tick();
      });

      this.emit('start', { timestamp: new Date().getTime() });
    }

    /**
      * Single game step.
      *
      * @param {Boolean} isReenact - is this step a re-enactment of the past.
      * @param {Number} t - the current time (optional)
      * @param {Number} dt - elapsed time since last step was called.  (optional)
      * @param {Boolean} physicsOnly - do a physics step only, no game logic
      */

  }, {
    key: 'step',
    value: function step(isReenact, t, dt, physicsOnly) {
      var _this2 = this;

      // physics-only step
      if (physicsOnly) {
        if (dt) dt /= 1000; // physics engines work in seconds
        this.physicsEngine.step(dt, objectFilter);
        return;
      }

      // emit preStep event
      if (isReenact === undefined) throw new Error('game engine does not forward argument isReenact to super class');

      isReenact = Boolean(isReenact);
      var step = ++this.world.stepCount;
      var clientIDSpace = this.options.clientIDSpace;
      this.emit('preStep', { step: step, isReenact: isReenact, dt: dt });

      // skip physics for shadow objects during re-enactment
      function objectFilter(o) {
        return !isReenact || o.id < clientIDSpace;
      }

      // physics step
      if (this.physicsEngine) {
        if (dt) dt /= 1000; // physics engines work in seconds
        this.physicsEngine.step(dt, objectFilter);
      }

      // for each object
      // - apply incremental bending
      // - refresh object positions after physics
      this.world.forEachObject(function (id, o) {
        if (typeof o.refreshFromPhysics === 'function') o.refreshFromPhysics();
        _this2.trace.trace(function () {
          return 'object[' + id + '] after ' + (isReenact ? 'reenact' : 'step') + ' : ' + o.toString();
        });
      });

      // emit postStep event
      this.emit('postStep', { step: step, isReenact: isReenact });
    }

    /**
     * Add object to the game world.
     * On the client side, the object may not be created, if the server copy
     * of this object is already in the game world.  This could happen when the client
     * is using delayed-input, and the RTT is very low.
     *
     * @param {Object} object - the object.
     * @return {Object} object - the final object.
     */

  }, {
    key: 'addObjectToWorld',
    value: function addObjectToWorld(object) {

      // if we are asked to create a local shadow object
      // the server copy may already have arrived.
      if (Number(object.id) >= this.options.clientIDSpace) {
        var serverCopyArrived = false;
        this.world.forEachObject(function (id, o) {
          if (o.hasOwnProperty('inputId') && o.inputId === object.inputId) serverCopyArrived = true;
        });
        if (serverCopyArrived) {
          this.trace.info(function () {
            return '========== shadow object NOT added ' + object.toString() + ' ==========';
          });
          return null;
        }
      }

      this.world.addObject(object);

      // tell the object to join the game, by creating
      // its corresponding physical entities and renderer entities.
      if (typeof object.onAddToWorld === 'function') object.onAddToWorld(this);

      this.emit('objectAdded', object);
      this.trace.info(function () {
        return '========== object added ' + object.toString() + ' ==========';
      });

      return object;
    }

    /**
     * Override this function to implement input handling.
     * This method will be called on the specific client where the
     * input was received, and will also be called on the server
     * when the input reaches the server.  The client does not call this
     * method directly, rather the client calls {@link ClientEngine#sendInput}
     * so that the input is sent to both server and client, and so that
     * the input is delayed artificially if so configured.
     *
     * The input is described by a short string, and is given an index.
     * The index is used internally to keep track of inputs which have already been applied
     * on the client during synchronization.  The input is also associated with
     * the ID of a player.
     *
     * @param {Object} inputMsg - input descriptor object
     * @param {String} inputMsg.input - describe the input (e.g. "up", "down", "fire")
     * @param {Number} inputMsg.messageIndex - input identifier
     * @param {Number} playerId - the player ID
     * @param {Boolean} isServer - indicate if this function is being called on the server side
     */

  }, {
    key: 'processInput',
    value: function processInput(inputMsg, playerId, isServer) {
      this.trace.info(function () {
        return 'game engine processing input[' + inputMsg.messageIndex + '] <' + inputMsg.input + '> from playerId ' + playerId;
      });
    }

    /**
     * Remove an object from the game world.
     *
     * @param {Object|String} objectId - the object or object ID
     */

  }, {
    key: 'removeObjectFromWorld',
    value: function removeObjectFromWorld(objectId) {

      if ((typeof objectId === 'undefined' ? 'undefined' : _typeof(objectId)) === 'object') objectId = objectId.id;
      var object = this.world.objects[objectId];

      if (!object) {
        throw new Error('Game attempted to remove a game object which doesn\'t (or never did) exist, id=' + objectId);
      }
      this.trace.info(function () {
        return '========== destroying object ' + object.toString() + ' ==========';
      });

      if (typeof object.onRemoveFromWorld === 'function') object.onRemoveFromWorld(this);

      this.emit('objectDestroyed', object);
      this.world.removeObject(objectId);
    }

    /**
     * Check if a given object is owned by the player on this client
     *
     * @param {Object} object the game object to check
     * @return {Boolean} true if the game object is owned by the player on this client
     */

  }, {
    key: 'isOwnedByPlayer',
    value: function isOwnedByPlayer(object) {
      return object.playerId == this.playerId;
    }

    /**
     * Register Game Object Classes
     *
     * @example
     * registerClasses(serializer) {
     *   serializer.registerClass(require('../common/Paddle'));
     *   serializer.registerClass(require('../common/Ball'));
     * }
     *
     * @param {Serializer} serializer - the serializer
     */

  }, {
    key: 'registerClasses',
    value: function registerClasses(serializer) {}

    /**
     * Decide whether the player game is over by returning an Object, need to be implemented
     *
     * @return {Object} truthful if the game is over for the player and the object is returned as GameOver data
     */

  }, {
    key: 'getPlayerGameOverResult',
    value: function getPlayerGameOverResult() {
      return null;
    }
  }]);

  return GameEngine;
}();

/**
 * EVENTS
 */

/**
 * Marks the beginning of a new game step
 *
 * @event GameEngine#preStep
 * @param {Number} stepNumber - the step number
 * @param {Boolean} isReenact - is this step a re-enactment
 */

/**
 * Marks the end of a game step
 *
 * @event GameEngine#postStep
 * @param {Number} stepNumber - the step number
 * @param {Boolean} isReenact - is this step a re-enactment
 */

/**
 * An object has been added to the world
 *
 * @event GameEngine#objectAdded
 * @param {Object} obj - the new object
 */

/**
 * An object has been removed from the world
 *
 * @event GameEngine#objectDestroyed
 * @param {Object} obj - the object
 */

/**
 * A player has joined
 *
 * @event GameEngine#playerJoined
 * @param {Number} joinTime - epoch of join time
 * @param {Object} playerDesc - player descriptor
 * @param {String} playerDesc.playerId - the player ID
 */

/**
 * A player has left
 *
 * @event GameEngine#playerDisconnected
 * @param {Number} joinTime - epoch of join time
 * @param {Number} disconnectTime - epoch of disconnect time
 * @param {Object} playerDesc - player descriptor
 * @param {String} playerDesc.playerId - the player ID
 */

/**
 * A player has joined on the server
 *
 * @event GameEngine#server__playerJoined
 * @param {Number} joinTime - epoch of join time
 * @param {Object} playerDesc - player descriptor
 * @param {String} playerDesc.playerId - the player ID
 */

/**
  * A player has left on the server
  *
  * @event GameEngine#server__playerDisconnected
  * @param {Number} joinTime - epoch of join time
  * @param {Number} disconnectTime - epoch of disconnect time
  * @param {Object} playerDesc - player descriptor
  * @param {String} playerDesc.playerId - the player ID
  */

/**
 * A synchronization update arrived from the server
 *
 * @event GameEngine#syncReceived
 * @param {Object} sync - the synchronization object
 */

/**
 * Marks the beginning of a game step on the client
 *
 * @event GameEngine#client__preStep
 */

/**
 * Marks the end of a game step on the client
 *
 * @event GameEngine#client__postStep
 */

/**
 * An input needs to be handled.  Emitted just before the GameEngine
 * method processInput is invoked.
 *
 * @event GameEngine#processInput
 * @param {Object} input - input descriptor object
 * @param {String} input.input - describe the input (e.g. "up", "down", "fire")
 * @param {Number} input.messageIndex - input identifier
 * @param {Object} input.options - the object which was passed as SendInput's InputOptions parameter
 * @param {Number} input.step - input execution step
 * @param {Number} playerId - the player ID
 */

/**
 * An input needs to be handled.
 * This event is emitted on the server only, just before the
 * general processInput event.
 *
 * @event GameEngine#server__processInput
 * @param {Object} input - input descriptor object
 * @param {String} input.input - describe the input (e.g. "up", "down", "fire")
 * @param {Number} input.messageIndex - input identifier
 * @param {Object} input.options - the object which was passed as SendInput's InputOptions parameter
 * @param {Number} input.step - input execution step
 * @param {Number} playerId - the player ID
 */

/**
 * An input needs to be handled.
 * This event is emitted on the client only, just before the
 * general processInput event.
 *
 * @event GameEngine#client__processInput
 * @param {Object} input - input descriptor object
 * @param {String} input.input - describe the input (e.g. "up", "down", "fire")
 * @param {Number} input.messageIndex - input identifier
 * @param {Object} input.options - the object which was passed as SendInput's InputOptions parameter
 * @param {Number} input.step - input execution step
 * @param {Number} playerId - the player ID
 */

/**
 * Client received a sync from the server
 *
 * @event GameEngine#client__syncReceived
 * @param {Object} sync - sync from the server
 * @param {Array} syncEvents - array of events in the sync
 * @param {Number} maxStepCount - highest step in the sync
 */

/**
 * Client reset the world step
 *
 * @event GameEngine#client__stepReset
 * @param {Object} resetDesc - sync from the server
 * @param {Number} oldStep - the old step count
 * @param {Number} newStep - the new step count
 */

/**
 * Marks the beginning of a game step on the server
 *
 * @event GameEngine#server__preStep
 * @param {Number} stepNumber - the step number
 */

/**
 * Marks the end of a game step on the server
 *
 * @event GameEngine#server__postStep
 * @param {Number} stepNumber - the step number
 */

/**
 * User input received on the server
 *
 * @event GameEngine#server__inputReceived
 * @param {Object} input - input descriptor
 * @param {Object} input.data - input descriptor
 * @param {String} input.playerId - player that sent the input
 */

/**
 * Report slow frame rate on the browser.
 * The browser did not achieve a reasonable frame rate
 *
 * @event GameEngine#client__slowFrameRate
 */

/**
 * server has started
 *
 * @event GameEngine#start
 * @param {Number} timestamp - UTC epoch of start time
 */

// TODO: the declaration "export default" could be done as part of the class
// declaration up above, but the current version of jsdoc doesn't support this.
// when jsdoc is fixed, move this descriptor back to the class declaration,
// in all relevant files (12 files)
// see: https://github.com/jsdoc3/jsdoc/issues/1132


exports.default = GameEngine;