Joydiv
======

A javascript (and typescript) library four multi-touch (and mouse) joystick.

Integration
-----------

All you need is the joydiv.js file. 
The library has no dependencies.

See [example1](http://vanisoft.pl/~lopuszanski/public/controller/example1/) for a minimal demonstration.
    
      <script type="text/javascript">
        var element = document.getElementById('controller');
        var joydiv = new JoydivModule.Joydiv({'element':element});
        element.addEventListener('joydiv-changed',function(e){
          document.getElementById('direction').value = joydiv.getOneOf8Directions().name;
        });
      </script>

Introduction
-------
The JoydivModule defined in joydiv.[tj]s file contains Joydiv (the main course) 
and Direction (a helper class, which represents the current direction pointed by user).

The Joydiv does not create any HTML for you, nor adds styles to the elements.
(OK, actually it adds left and top styles to the tracker element, but this is likely to change in future, too).
You own the HTML, while Joydiv just attaches event listeners to it and reinterprets mouse, and touch events, to create more comprehensible information in the form of Direction.

If you are worried about the lack of help with HTML, do not be.
The [example1](http://vanisoft.pl/~lopuszanski/public/controller/example1/) and [example2](http://vanisoft.pl/~lopuszanski/public/controller/example2/) show you the basic HTML you can use as a good start.
Also the file joydiv-skin-default.css provides some default CSS styles you can use. 
But you don't have to, and this is the beauty.

You can create multiple instances of Joydiv -- in fact this was the purpose of the library,
as it was necessary use case for www.kongregate.com/games/qbolec/2pac.
Just make sure that exactly single instance is connected with each controller which you have defined in the DOM.

API
-----

Joydiv exposes following methods:
* new (options) , where is a key-value map of following options
  * element : DOMElement _required_ the DOM element which hosts the Joydiv. It does not have to be present in the document at the moment of calling the constructor. It must contain .joydiv-left .joydiv-right, .joydiv-up, .joydiv-down, .joydiv-trackpad, .joydiv-tracker elements.
  * querySelector : (element,selector) => DOMElement, an implementation to use instead of element.querySelector(selector) to support older broswers. For example use 
    *  function(el,selector){return el.getElement(selector);} for Mootools.
  * clampX : number, if you want Math.abs(Direction.offset.x) to be limited. It affects Direction.angle, Direction.magnitude, and Direction.name as well.
  * clampY : number, similar to above
  * clampMagnitude : number, if you want Euclidian length of offset to be limited
  * flipY : true, if you like the idea the "up" should have negative y, just like in most places in CSS. I don't so it is not the default. Please, understand. The up arrow on the screen will still cause Direction.name = 'up'. The only difference is that Direction.offset.y and Direction.angle will be mirrored.
* getOneOf4Directions():Direction, if your game is simple (character can move only in four directions) this is the best choice. It returns Direction which is always parallel to an axis. This is achieved by averaging all input methods, and touch points and then casting onto the closest axis. The Direction.name is guaranteed to be one of 'up','left','right','down' or 'none'. Currently none happens only when there is no input, but in next version I'll introduce deadZone option.
* getOneOf8Directions():Direction, similar to above, but this time 'up-left','up-right','down-left', and 'down-right' are also possible. For example touching both arrows at the same time can produce such result.
* getOneDirection():Direction, if your game is freestyle, you will probably need this. Direction.name is probably less useful in this case, but it is still provided (an arc of 1/8 of full circle is assigned to each of 8 possible names). The Direction is average of all touch and mouse inputs.
* getAllDirections():Direction[], if you are really hardcore, and want to know exactly what your player do, then you can get direct access to all inputs. For example if the user clicks one arrow, touches two others, while dragging the tracker, you will get 4 entries in the array. Good luck.

Direction is a simple data structure with following fields
* offset.x : number, a floating point value, where 1 is "i wanna go right", and 2 is "I reaaaally wanna go right, so much, that I dragged the tracker twice too far". Negative values are to the left obviously. Unless you use clampX the values are not restricted. The normalization is done by dividing by the clientWidth of the controller.
* offset.y : number, similarly normalized value. If flipY option was set, then negative value is 'up'.
* magnitude : number, this is just sqrt(x*x+y*y) for your convenience. Yes, I know you can compute it yourself, but, this is a library, so you don't have to.
* angle : number, this is basically atan2(x,y), but in the range 0 to 2*PI, as I don't like the negative values returned by native Math.atan2(x,y)
* name : string, one of 9 values already mentioned above. 


Supported platforms
-------------------
The goal of this library is to support as many devices as possible.
Currently it is tested on Samsung Galaxy Tab with Android native browser and Chrome on laptop,
which obviously is just the begining.
For example it does not work correctly on Nokia with Windows Phone 7.5, which will be the next step.


More info
---------
If you write in Typescript (as I do) perhaps you prefer the original joydiv.ts.

The library uses element.querySelector(selector) internally, 
which obviously is not supported in older browsers.
To deal with this issue, while staying framework agnostic, 
the Joydiv constructor accepts querySelector option,
which should be of type (element,string)=>DOMElement.

The eventing system relays on the browser's support for document.createEvent('Event').
On browsers which do not support it, we suggest polling the state,
or wait till we implement our own events system...

It is a good idea to give the user visual feedback that the Joydiv is responsive.
Since you are in charge of the DOM, you have to do it yourself.
It is very easy actually.
See 
2 for some ideas.
Remember that the user may cover the controller with the finger or thumb, so provide the visual clues in visible areas.

     ['up','right','down','left'].each(function(name){
        var pressed = 0<=direction.name.indexOf(name);
        joydivElement.getElement('.joydiv-' + name).toggleClass('pressed',pressed);
      });
   
The joydiv-skin-default.css always tries to scale to fit the div you provided.
As it uses some CSS triangles and other border-width tricks it relies on 1em to be defined to be equal the size of the controller.
So if you want to use it, make sure that widht,height and font-size are all equal.



