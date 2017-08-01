"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.connect = connect;
exports.disconnectGraph = disconnectGraph;
exports.Destination = Destination;
exports.Analyzer = Analyzer;
exports.Processor = Processor;
exports.Gain = Gain;
exports.SourceBuffer = SourceBuffer;
exports.Oscillator = Oscillator;
exports.ChannelMerger = ChannelMerger;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * This module provides a set of methods for easily creating and connecting web
 * audio nodes. In some cases, it provides default options for configs and
 * abilities to modify props. The expectation is that nodes can easily be
 * chained together, i.e.
 * Oscillator({frequency: 300}, Gain({value: 0.5}, Destination())
 */

var context = void 0;
function getContext() {
  if (context) {
    return context;
  }

  if (typeof AudioContext !== "undefined") {
    context = new AudioContext();
  } else if (typeof window.webkitAudioContext !== "undefined") {
    context = new window.webkitAudioContext();
  } else {
    throw new Error('AudioContext not supported. :(');
  }

  return context;
}

/**
 * Hacky omit function to avoid using lodash. Clones hash and removes given
 * field name
 */
function omit(hash, field) {
  var newHash = Object.assign({}, hash);
  delete newHash[field];
  return newHash;
}

/**
 * Methods can be passed an optional set of options, followed by a list of
 * targets. This method determines whether an options hash was passed in or not
 * and returns an options hash and the set of targets
 */
function resolveInputs(options) {
  for (var _len = arguments.length, targets = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    targets[_key - 1] = arguments[_key];
  }

  options = options || {};
  if (options instanceof AudioNode) {
    targets = [options].concat(_toConsumableArray(targets));
    options = {};
  }
  return [options, targets];
}

/**
 * Any options directly settable on the node (determined by whether our default
 * node ends up with this prop) are passed through. Other props must be handled
 * manually
 */
function applyOptions(node, options) {
  for (var prop in options) {
    if (prop in node && options[prop] !== undefined) {
      node[prop] = options[prop];
    }
  }
}

/**
 * Connect a source node to a set of target. Provide some additional trakcing
 * so that we know which nodes we're connected to.
 */
function connect(source) {
  for (var _len2 = arguments.length, targets = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    targets[_key2 - 1] = arguments[_key2];
  }

  // Override native connect method with our own. May or may not be better to
  // instead expose our custom connect method.
  if (!source.nativeConnect) {
    source.nativeConnect = source.connect;
    source.connect = function () {
      for (var _len3 = arguments.length, targets = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        targets[_key3] = arguments[_key3];
      }

      return connect.apply(undefined, [source].concat(targets));
    };
  }

  source._targets = [];
  targets.forEach(function (target) {
    source.nativeConnect(target);
    source._targets.push(target);
  });
  return source;
}

/**
 * Disconnect all nodes linked to from passed in node
 */
function disconnectGraph(node) {
  if (!node._targets) {
    return;
  }
  node._targets.forEach(function (targetNode) {
    node.disconnect(targetNode);
    disconnectGraph(targetNode);
  });
  node._targets = [];
}

function Destination() {
  return getContext().destination;
}

/**
 * @param options.fftSize
 * @param options.minDecibels
 * @param options.maxDecibels
 * @param options.smoothingTimeConstant
 */
function Analyzer(options) {
  for (var _len4 = arguments.length, targets = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
    targets[_key4 - 1] = arguments[_key4];
  }

  var _resolveInputs = resolveInputs.apply(undefined, [options].concat(_toConsumableArray(targets)));

  var _resolveInputs2 = _slicedToArray(_resolveInputs, 2);

  options = _resolveInputs2[0];
  targets = _resolveInputs2[1];


  var node = getContext().createAnalyser();
  applyOptions(node, options);
  return connect.apply(undefined, [node].concat(_toConsumableArray(targets)));
}

/**
 * @param options.bufferSize
 * @param options.onaudioprocess
 */
function Processor(options) {
  for (var _len5 = arguments.length, targets = Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
    targets[_key5 - 1] = arguments[_key5];
  }

  var _resolveInputs3 = resolveInputs.apply(undefined, [options].concat(_toConsumableArray(targets)));

  var _resolveInputs4 = _slicedToArray(_resolveInputs3, 2);

  options = _resolveInputs4[0];
  targets = _resolveInputs4[1];


  var node = getContext().createScriptProcessor(options.bufferSize || 4096);
  applyOptions(node, omit(options, 'bufferSize'));
  return connect.apply(undefined, [node].concat(_toConsumableArray(targets)));
}

/**
 * @param options.value
 */
function Gain(options) {
  for (var _len6 = arguments.length, targets = Array(_len6 > 1 ? _len6 - 1 : 0), _key6 = 1; _key6 < _len6; _key6++) {
    targets[_key6 - 1] = arguments[_key6];
  }

  var _resolveInputs5 = resolveInputs.apply(undefined, [options].concat(_toConsumableArray(targets)));

  var _resolveInputs6 = _slicedToArray(_resolveInputs5, 2);

  options = _resolveInputs6[0];
  targets = _resolveInputs6[1];


  var node = getContext().createGain();
  applyOptions(node, options);
  node.gain.value = options.value || 1;
  return connect.apply(undefined, [node].concat(_toConsumableArray(targets)));
}

/**
 * @param options.buffer
 */
function SourceBuffer(options) {
  for (var _len7 = arguments.length, targets = Array(_len7 > 1 ? _len7 - 1 : 0), _key7 = 1; _key7 < _len7; _key7++) {
    targets[_key7 - 1] = arguments[_key7];
  }

  var _resolveInputs7 = resolveInputs.apply(undefined, [options].concat(_toConsumableArray(targets)));

  var _resolveInputs8 = _slicedToArray(_resolveInputs7, 2);

  options = _resolveInputs8[0];
  targets = _resolveInputs8[1];


  var node = getContext().createBufferSource();
  applyOptions(node, options);
  return connect.apply(undefined, [node].concat(_toConsumableArray(targets)));
}

/**
 * @param options.frequency
 */
function Oscillator(options) {
  for (var _len8 = arguments.length, targets = Array(_len8 > 1 ? _len8 - 1 : 0), _key8 = 1; _key8 < _len8; _key8++) {
    targets[_key8 - 1] = arguments[_key8];
  }

  var _resolveInputs9 = resolveInputs.apply(undefined, [options].concat(_toConsumableArray(targets)));

  var _resolveInputs10 = _slicedToArray(_resolveInputs9, 2);

  options = _resolveInputs10[0];
  targets = _resolveInputs10[1];


  var node = getContext().createOscillator();
  node.frequency.value = options.frequency || 3000;
  node.frequency.type = 'sine';
  return connect.apply(undefined, [node].concat(_toConsumableArray(targets)));
}

function ChannelMerger(options) {
  for (var _len9 = arguments.length, targets = Array(_len9 > 1 ? _len9 - 1 : 0), _key9 = 1; _key9 < _len9; _key9++) {
    targets[_key9 - 1] = arguments[_key9];
  }

  var _resolveInputs11 = resolveInputs.apply(undefined, [options].concat(_toConsumableArray(targets)));

  var _resolveInputs12 = _slicedToArray(_resolveInputs11, 2);

  options = _resolveInputs12[0];
  targets = _resolveInputs12[1];


  var node = getContext().createChannelMerger(options.numInputs);
  return connect.apply(undefined, [node].concat(_toConsumableArray(targets)));
}