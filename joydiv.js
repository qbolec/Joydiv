var JoydivModule;
(function (JoydivModule) {
    var Direction = (function () {
        function Direction(offset) {
            this.offset = {
                x: offset.x,
                y: offset.y
            };
            this.angle = Math.atan2(this.offset.x, this.offset.y);
            if(this.angle < 0) {
                this.angle += Math.PI * 2;
            }
            this.magnitude = Math.sqrt(this.offset.x * this.offset.x + this.offset.y * this.offset.y);
            this.name = this.magnitude ? Direction.names[Math.floor((this.angle / (Math.PI / 4)) + 0.5) % 8] : 'none';
        }
        Direction.names = [
            'up', 
            'up-right', 
            'right', 
            'down-right', 
            'down', 
            'down-left', 
            'left', 
            'up-left'
        ];
        return Direction;
    })();
    JoydivModule.Direction = Direction;    
    var Joydiv = (function () {
        function Joydiv(options) {
            this.options = options;
            var _this = this;
            this.arrows = [];
            this.votes = {
            };
            var querySelector = options.querySelector || function (e, selector) {
                return e.querySelector(selector);
            };
            this.rootElement = options.element;
            this.trackpad = querySelector(this.rootElement, '.joydiv-trackpad');
            this.tracker = querySelector(this.trackpad, '.joydiv-tracker');
            var arrowInfo = [
                {
                    name: 'up',
                    direction: new Direction({
                        x: 0,
                        y: 1
                    })
                }, 
                {
                    name: 'right',
                    direction: new Direction({
                        x: 1,
                        y: 0
                    })
                }, 
                {
                    name: 'down',
                    direction: new Direction({
                        x: 0,
                        y: -1
                    })
                }, 
                {
                    name: 'left',
                    direction: new Direction({
                        x: -1,
                        y: 0
                    })
                }
            ];
            this.arrows = this.map(arrowInfo, function (info, i) {
                var arrow = querySelector(_this.rootElement, '.joydiv-' + info.name);
                arrow.addEventListener('mousedown', function (e) {
                    _this.addVote(info.direction, 'arrow-mouse-' + i);
                }, false);
                document.addEventListener('mouseup', function (e) {
                    _this.removeVote('arrow-mouse-' + i);
                }, true);
                arrow.addEventListener('touchstart', function (e) {
                    e.preventDefault();
                    _this.addVote(info.direction, 'arrow-touch-' + i);
                }, false);
                arrow.addEventListener('touchend', function (e) {
                    e.preventDefault();
                    _this.removeVote('arrow-touch-' + i);
                }, true);
                return arrow;
            });
            var onTrackerScreenPos = function (e, origin) {
                var x = 2 * (e.screenX - origin.x) / _this.rootElement.clientWidth;
                var y = 2 * (e.screenY - origin.y) / _this.rootElement.clientHeight;
                _this.tracker.style.left = (x + 0.5) * 100 + "%";
                _this.tracker.style.top = (y + 0.5) * 100 + "%";
                return new Direction({
                    x: x,
                    y: -y
                });
            };
            (function () {
                var origin = null;
                _this.trackpad.addEventListener('mousedown', function (e) {
                    origin = {
                        x: e.screenX,
                        y: e.screenY
                    };
                    e.preventDefault();
                }, false);
                var unmount = function () {
                    origin = null;
                    _this.tracker.style.left = "50%";
                    _this.tracker.style.top = "50%";
                    _this.removeVote('tracker-mouse');
                };
                document.addEventListener('mousemove', function (e) {
                    if(origin) {
                        _this.addVote(onTrackerScreenPos(e, origin), 'tracker-mouse');
                    }
                }, true);
                document.addEventListener('mouseup', unmount, true);
            })();
            (function () {
                var origin = null;
                var touchId = null;
                _this.trackpad.addEventListener('touchstart', function (e) {
                    var touch = e.targetTouches.item(0);
                    touchId = touch.identifier;
                    origin = {
                        x: touch.screenX,
                        y: touch.screenY
                    };
                    e.preventDefault();
                }, false);
                var unmount = function () {
                    origin = null;
                    touchId = null;
                    _this.tracker.style.left = "50%";
                    _this.tracker.style.top = "50%";
                    _this.removeVote('tracker-touch');
                };
                document.addEventListener('touchmove', function (e) {
                    if(origin) {
                        var touch;
                        for(var i = 0; i < e.touches.length; ++i) {
                            if(e.touches.item(i).identifier == touchId) {
                                touch = e.touches.item(i);
                            }
                        }
                        if(touch) {
                            _this.addVote(onTrackerScreenPos(touch, origin), 'tracker-touch');
                        } else {
                            unmount();
                        }
                    }
                }, true);
                _this.each([
                    'touchend', 
                    'touchcancel'
                ], function (eventName) {
                    _this.trackpad.addEventListener(eventName, unmount, true);
                });
            })();
        }
        Joydiv.prototype.each = function (obj, foo) {
            if(obj.length === +obj.length) {
                for(var i = 0, l = obj.length; i < l; i++) {
                    foo(obj[i], i, obj);
                }
            } else {
                for(var i in obj) {
                    if(obj.hasOwnProperty(i)) {
                        foo(obj[i], i, obj);
                    }
                }
            }
        };
        Joydiv.prototype.map = function (obj, foo) {
            var acc = [];
            this.each(obj, function (val, key) {
                acc.push(foo(val, key, obj));
            });
            return acc;
        };
        Joydiv.prototype.addVote = function (direction, voter) {
            this.votes[voter] = direction;
            this.changed();
        };
        Joydiv.prototype.removeVote = function (voter) {
            if(voter in this.votes) {
                delete this.votes[voter];
                this.changed();
            }
        };
        Joydiv.prototype.changed = function () {
            var event = document.createEvent('Event');
            event.initEvent('joydiv-changed', true, false);
            event.detail = {
                joydiv: this
            };
            this.rootElement.dispatchEvent(event);
        };
        Joydiv.prototype.getNoneDirection = function () {
            return new Direction({
                x: 0,
                y: 0
            });
        };
        Joydiv.prototype.getSnapped = function (numberOfDirections) {
            var net = this.getRawOneDirection();
            if(net.magnitude) {
                var angleId = Math.round(numberOfDirections * net.angle / (2 * Math.PI)) % numberOfDirections;
                var angle = angleId * (2 * Math.PI / numberOfDirections);
                var base = [
                    Math.sin(angle), 
                    Math.cos(angle)
                ];
                var shadowLength = net.offset.x * base[0] + net.offset.y * base[1];
                return this.getPostProcessed(new Direction({
                    x: base[0] * shadowLength,
                    y: base[1] * shadowLength
                }));
            } else {
                return this.getNoneDirection();
            }
        };
        Joydiv.prototype.getOneOf8Directions = function () {
            return this.getSnapped(8);
        };
        Joydiv.prototype.getOneOf4Directions = function () {
            return this.getSnapped(4);
        };
        Joydiv.prototype.getRawOneDirection = function () {
            var acc = {
                x: 0,
                y: 0
            };
            var cnt = 0;
            this.each(this.votes, function (direction) {
                acc.x += direction.offset.x;
                acc.y += direction.offset.y;
                ++cnt;
            });
            if(!cnt) {
                return this.getNoneDirection();
            } else {
                return new Direction({
                    x: acc.x / cnt,
                    y: acc.y / cnt
                });
            }
        };
        Joydiv.prototype.getOneDirection = function () {
            return this.getPostProcessed(this.getRawOneDirection());
        };
        Joydiv.prototype.getAllDirections = function () {
            var _this = this;
            return this.map(this.votes, function (direction) {
                return _this.getPostProcessed(direction);
            });
        };
        Joydiv.prototype.getPostProcessed = function (direction) {
            direction = new Direction(direction.offset);
            if(this.options.clampX) {
                var m = Math.abs(direction.offset.x);
                if(this.options.clampX < m) {
                    direction.offset.x /= m;
                    direction.offset.x *= this.options.clampX;
                }
            }
            if(this.options.clampY) {
                var m = Math.abs(direction.offset.y);
                if(this.options.clampY < m) {
                    direction.offset.y /= m;
                    direction.offset.y *= this.options.clampY;
                }
            }
            if(this.options.clampMagnitude) {
                var m = Math.sqrt(direction.offset.y * direction.offset.y + direction.offset.x * direction.offset.x);
                if(this.options.clampMagnitude < m) {
                    direction.offset.x /= m;
                    direction.offset.x *= this.options.clampMagnitude;
                    direction.offset.y /= m;
                    direction.offset.y *= this.options.clampMagnitude;
                }
            }
            var newDir = new Direction(direction.offset);
            if(this.options.flipY) {
                newDir.offset.y *= -1;
                newDir.angle = (Math.PI * 3 - newDir.angle) % (Math.PI * 2);
            }
            return newDir;
        };
        return Joydiv;
    })();
    JoydivModule.Joydiv = Joydiv;    
})(JoydivModule || (JoydivModule = {}));

