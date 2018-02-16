/**
 * This module provides a set of methods for easily creating and connecting web
 * audio nodes. In some cases, it provides default options for configs and
 * abilities to modify props. The expectation is that nodes can easily be
 * chained together, i.e.
 * Oscillator({frequency: 300}, Gain({value: 0.5}, Destination())
 */

let context;
export function getContext () {
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
  let newHash = { ...hash };
  delete newHash[field];
  return newHash;
}

/**
 * Methods can be passed an optional set of options, followed by a list of
 * targets. This method determines whether an options hash was passed in or not
 * and returns an options hash and the set of targets
 */
function resolveInputs(options, ...targets) {
  options = options || {};
  if (options instanceof AudioNode) {
    targets = [options, ...targets];
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
  for (let prop in options) {
    if (prop in node && options[prop] !== undefined) {
      node[prop] = options[prop];
    }
  }
}

/**
 * Connect a source node to a set of target. Provide some additional trakcing
 * so that we know which nodes we're connected to.
 */
export function connect(source, ...targets) {
  // Override native connect method with our own. May or may not be better to
  // instead expose our custom connect method.
  if (!source.nativeConnect) {
    source.nativeConnect = source.connect;
    source.connect = (...targets) => connect(source, ...targets);
  }

  source._targets = [];
  targets.forEach(target => {
    source.nativeConnect(target);
    source._targets.push(target);
  });
  return source;
}

/**
 * Disconnect all nodes linked to from passed in node
 */
export function disconnectGraph(node) {
  if (!node._targets) {
    return;
  }
  node._targets.forEach(targetNode => {
    node.disconnect(targetNode);
    disconnectGraph(targetNode);
  });
  node._targets = [];
}

export function Destination() {
  return getContext().destination;
}

/**
 * @param options.fftSize
 * @param options.minDecibels
 * @param options.maxDecibels
 * @param options.smoothingTimeConstant
 */
export function Analyzer(options, ...targets) {
  [options, targets] = resolveInputs(options, ...targets);

  const node = getContext().createAnalyser();
  applyOptions(node, options);
  return connect(node, ...targets);
}

/**
 * @param options.bufferSize
 * @param options.onaudioprocess
 */
export function Processor(options, ...targets) {
  [options, targets] = resolveInputs(options, ...targets);

  const node = getContext().createScriptProcessor(options.bufferSize || 4096);
  applyOptions(node, omit(options, 'bufferSize'));
  return connect(node, ...targets);
}

/**
 * @param {number} options.value
 */
export function Gain(options, ...targets) {
  [options, targets] = resolveInputs(options, ...targets);

  const node = getContext().createGain();
  applyOptions(node, options);
  if (options.value !== undefined) {
    node.gain.setValueAtTime(options.value, getContext().currentTime);
  }
  return connect(node, ...targets);
}

/**
 * @param options.buffer
 */
export function SourceBuffer(options, ...targets) {
  [options, targets] = resolveInputs(options, ...targets);

  const node = getContext().createBufferSource();
  applyOptions(node, options);
  return connect(node, ...targets);
}

/**
 * @param options.frequency
 */
export function Oscillator(options, ...targets) {
  [options, targets] = resolveInputs(options, ...targets);

  const node = getContext().createOscillator();
  node.frequency.value = options.frequency || 3000;
  node.frequency.type = 'sine';
  return connect(node, ...targets);
}

/**
 * @param {number} options.numInputs
 */
export function ChannelMerger(options, ...targets) {
  [options, targets] = resolveInputs(options, ...targets);

  const node = getContext().createChannelMerger(options.numInputs);
  return connect(node, ...targets);
}

/**
 * @param {MediaStream} options.stream
 */
export function MediaStreamSource(options, ...targets) {
  [options, targets] = resolveInputs(options, ...targets);

  const node = getContext().createMediaStreamSource(options.stream);
  return connect(node, ...targets);
}
