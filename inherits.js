'use strict';
module.exports = inherits
function inherits(Ctor, Super) {
  function X() {}
  X.prototype = Super.prototype
  Ctor.prototype = new X()
  Ctor.prototype.constructor = Ctor
}
