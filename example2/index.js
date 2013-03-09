//In this demo each of 3 controllers is a bit different,
//and all of them can be used simultanously (provided, you have 3 hands).

//The Joydiv uses DOM elements that you provide. It does not add anything to the DOM.
//Fill free to use any technique you find suitable to generate the DOM.
//Here we use an HTML tamplate stored in a script tag.
var htmlTemplate = $('joydiv-template').get('text');
//We want to create 3 controllers, one in each .test DIV.
$$('.test').each(function(testElement,index){
  var joydivElement = new Element('div',{
    'html' : htmlTemplate
  });
  //The JoydivModule is a result of compiling the joydiv.ts file to *.js.
  //As you can see in this example, you can use it in js projects.
  //In the module Joydiv is declared as a public constructor.
  //It accepts several options, but the 'element' is required.
  //Other interesting option is querySelector:(element,selector)=>DOMElement, which you can use
  //to provide backward compatibility for older browsers, by passing Mootools' or JQuery's implementation.
  var joydiv = new JoydivModule.Joydiv({
    element: joydivElement,
    //querySelector : function(el,selector){return el.getElement(selector);},
    //clampX:1,
    //clampY:1,
    //clampMagnitude:1,
    //flipY:true
  });
  //Joydiv does not require the element to be present in the document at the moment of construction.
  testElement.grab(joydivElement);

  var outputElement = testElement.getElement('.output');
  //You can listen for CustomEvents on the DOM element containing the Joydiv.
  //If the browser does not support CustomEvents, then probably this won't work, and you should simply poll the state.
  joydivElement.addEventListener('joydiv-changed',function(e){
    //The detail contains only a handle to joydiv which triggered the event. 
    //Use various methods of joydiv to fetch the controller state. 
    outputElement.set('text', JSON.encode(e.detail.joydiv.getAllDirections()));
  });

  var pawn = new Element('div',{
    id:'pawn-' + index,
    class:'pawn'
  });
  $('playground').grab(pawn);

  var pos = [200*(index+1),100];
  setInterval(function(){
    var speed;//[x,y]
    var direction;// {name, offset, angle, magnitude}
    switch(index){
      case 0: //this pawn moves only along one of 2 axes. However, as offset is not clamped, he can move at any speed.
        direction = joydiv.getOneOf4Directions();
        //If you want the offset to be clamped, you can pass clampX and clampY options to the Joystick constructor.
        //By default Joydiv uses positive Y to indicate "up".
        //If you do not like it, you can pass flipY:true to constructor
        speed = [direction.offset.x,-direction.offset.y];
        break;
      case 1: //this pawn can move also diagonally. However as 'name' is discrete, it moves at predefined speed.
        direction = joydiv.getOneOf8Directions();
        //This lookup table is not really necessary.
        //It is just an illustration that you can do whatever you want with the discrete value of 'name' field,
        //for example map it to some predefined speeds.
        var directionOffset = {
          'none':[0,0],
          'up' :[0,-1], //this could be jump in your game
          'up-right': [1,-1],  //this could be 1/Math.sqrt(2) to prevent cheating
          'right' :[1,0],
          'down-right': [1,1],
          'down' :[0,1],  //this could be duck and cover:)
          'down-left': [-1,1],
          'left' :[-1,0],
          'up-left' :[-1,-1]
        };
        speed = directionOffset[direction.name];
        break;
      case 2: //this pawn moves whatever direction he likes (direction.name is 'unnamed' here), and can control speed
        direction = joydiv.getOneDirection();
        //Unclamped magnitute could be arbitrary large, so we clamp it.
        //Another way to handle it, is to pass 'clampMagnitude' to Joydiv constructor.
        var magnitude = Math.min(2,direction.magnitude);
        //By default angle 0 is 'up', angle PI down, right is PI/2 and left is 1.5PI.
        //You can use flipY:true if you don't like this.  
        speed= [Math.sin(direction.angle)*magnitude,-Math.cos(direction.angle)*magnitude];
        break;
    }
    //The offset or magnitude 1 is meant to indicate the "full" throttle in particular direction.
    //Without clamping a user can make it larger than one by dragging the tracker too far.
    //Multiply the values as you see fit in your app. 
    for(var i=2;i--;){
      pos[i]+=speed[i]*10;
    }
    pawn.setStyles({'left':pos[0],'top':pos[1]});
    
    //Some simple visual feedback, to demonstrate how to add your own styles.
    //The class "pressed" is defined in your own css style sheet.
    ['up','right','down','left'].each(function(name){
      var pressed = 0<=direction.name.indexOf(name);
      joydivElement.getElement('.joydiv-' + name).toggleClass('pressed',pressed);
    });
  },100);
});