'use strict';
module.exports = Stream
var List = require('jscons/list')
  , Cons = require('jscons')
  , Promise = require('promise')
  , inherits = require('./inherits')

inherits(Stream, Promise)
function Stream(fn) {
  Promise.call(this, function(resolve, reject) {
    return fn(function(val) {
      try {
        val = StreamElement.from(val)
      }
      catch (e) {
        reject(e)
        return
      }
      resolve(val)
    }, reject)
  })

  this.then = new Promise(this.then).then
}

Stream.from = function(value) {
  return value instanceof Stream
    ? value
    : new Stream(function(resolve, reject) { resolve(value) })
}

inherits(StreamElement, Cons)
function StreamElement(head, tail) {
  if (typeof tail != 'function')
    throw new TypeError('tail of a stream element must be a function')
  this._head = head
  this._tailFn = tail
}

StreamElement.from = function(value) {
  if (value === null)
    return null

  if (value instanceof StreamElement)
    return value

  value = Cons.from(value)

  return new StreamElement(value.head(), function() {
    return Stream.from(value.tail())
  })
}

StreamElement.prototype.tail = function() {
  if (this._tailFn !== null) {
    this._tail = Stream.from(this._tailFn.call(null))
    this._tailFn = null
  }
  return this._tail
}


Stream.denodeify = wrap
function wrap(stream) {
  var resolve
    , reject
    , prom

  stream
    .on('error', function(err) { reject(err) })
    .on('end', function() { resolve(null) })

  prepare()
  return next()

  function prepare() {
    var p = new Stream(function(resolve_, reject_) {
      resolve = function(val) {
        prepare()
        resolve_(val)
        return p
      }
      reject = reject_

      if (!stream.readable)
        resolve(null)
    })
    prom = p
  }

  function next() {
    var elem
    try {
      var item = stream.read()
      if (item === null) {
        stream.once('readable', next)
        return prom
      }
      elem = new StreamElement(item, next)
    }
    catch (e) {
      reject(e)
      return
    }

    return resolve(elem)
  }
}

Stream.toList = function list(stream) {
  return Stream
    .from(stream)
    .then(function(elem) {
      if (elem === null)
        return null

      var head = elem.head()
      return list(elem.tail())
        .then(function(tail) { return new List(head, tail) })
    })
}

Stream.toArray = function(stream) {
  var arr = []
  return Stream.from(stream)
    .then(function append(elem) {
      if (elem === null)
        return arr

      arr.push(elem.head())
      return elem.tail().then(append)
    })
}
