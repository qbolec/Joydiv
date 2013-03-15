module JoydivModule{

  interface TouchEvent extends UIEvent{
    touches:any;
    targetTouches:any;
  }

  export class Direction{
    public static names = ['up','up-right','right','down-right','down','down-left','left','up-left']; 
    public magnitude;
    public angle;
    public name;
    public offset;
    constructor(offset){
      this.offset = {x:offset.x,y:offset.y};//clone
      this.angle = Math.atan2(this.offset.x,this.offset.y);
      if(this.angle<0){
        this.angle+=Math.PI*2;
      }
      this.magnitude = Math.sqrt(this.offset.x*this.offset.x+this.offset.y*this.offset.y);
      this.name = this.magnitude ? Direction.names[Math.floor((this.angle/(Math.PI/4))+.5)%8] : 'none'; 
    }
  }
    
  export class Joydiv{
    //DOM elements
    private rootElement;
    private arrows=[];
    private tracker;
    private trackpad;

    //state:
    private votes={};

    //helper functions:
    private each(obj,foo){
      if (obj.length === +obj.length) {
        for (var i = 0, l = obj.length; i < l; i++) {
          foo(obj[i], i, obj);
        }
      } else {
        for (var i in obj) {
          if (obj.hasOwnProperty(i)) {
            foo(obj[i], i, obj);
          }
        }
      }
    }
    private map(obj,foo){
      var acc = [];
      this.each(obj,(val,key)=>{acc.push(foo(val,key,obj));});
      return acc;
    }

    // options:
    //   querySelector(element,selector) a replacement for element.querySelector(selector)
    constructor(private options){
      var querySelector = options.querySelector || (e,selector) => e.querySelector(selector);
      this.rootElement = options.element;
      this.trackpad = querySelector(this.rootElement,'.joydiv-trackpad');
      this.tracker = querySelector(this.trackpad,'.joydiv-tracker');
      var arrowInfo=[
        {name:'up'   , direction:new Direction({x:0,y:1})},
        {name:'right', direction:new Direction({x:1,y:0})},
        {name:'down' , direction:new Direction({x:0,y:-1})},
        {name:'left' , direction:new Direction({x:-1,y:0})}
      ];
      //arrows pressing support
      this.arrows = this.map(arrowInfo,(info,i)=>{
        var arrow = querySelector(this.rootElement,'.joydiv-' + info.name);
        //Support for real mouse (does not work well with browsers which trigger mousedown together with mouseup):
        arrow.addEventListener('mousedown',(e)=>{
          //e.preventDefault();
          this.addVote(info.direction,'arrow-mouse-'+i);
        },false);
        document.addEventListener('mouseup',(e)=>{
          this.removeVote('arrow-mouse-'+i);
        },true);
        //Support for touch devices on which mousedown fires too late (that is, together with mouseup)
        arrow.addEventListener('touchstart',(e)=>{
          e.preventDefault();
          this.addVote(info.direction,'arrow-touch-'+i);
        },false);
        arrow.addEventListener('touchend',(e)=>{
          e.preventDefault();
          this.removeVote('arrow-touch-'+i);
        },true);
        
        return arrow;
      });
      var onTrackerScreenPos = (e,origin)=>{
        var x= 2*(e.screenX-origin.x)/this.rootElement.clientWidth;
        var y= 2*(e.screenY-origin.y)/this.rootElement.clientHeight;
        this.tracker.style.left = (x+.5)*100 + "%";
        this.tracker.style.top = (y+.5)*100 + "%";
        return new Direction({x:x,y:-y});
      };
      //tracker dragging via mouse events
      (()=>{
        var origin = null;
        this.trackpad.addEventListener('mousedown',(e)=>{
          origin = {x:e.screenX,y:e.screenY};
          e.preventDefault();
        },false);
        var unmount = () =>{
          origin = null;
          this.tracker.style.left = "50%";
          this.tracker.style.top = "50%";
          this.removeVote('tracker-mouse');
        }
        document.addEventListener('mousemove',(e:MouseEvent)=>{
          if(origin){
            this.addVote(onTrackerScreenPos(e,origin),'tracker-mouse');
          }
        },true);

        document.addEventListener('mouseup',unmount,true);
      })();

      //tracker dragging via touch events
      (()=>{
        var origin = null;
        var touchId = null;
        this.trackpad.addEventListener('touchstart',(e)=>{
          var touch = e.targetTouches.item(0);
          touchId = touch.identifier;
          origin = {x:touch.screenX,y:touch.screenY};
          e.preventDefault();
        },false);
        var unmount = () => {
          origin = null;
          touchId = null;
          this.tracker.style.left = "50%";
          this.tracker.style.top = "50%";
          this.removeVote('tracker-touch');  
        }
        //Touch moves are difficult to track, as w3c specification does
        //not mention it clearly to which of multiple targets the event should be sent.
        //In particular on Samsung Galaxy with Android, the event is dispatched with e.target = the first touched element.
        //Therefore we listen at document level.
        document.addEventListener('touchmove',(e:TouchEvent)=>{
          if(origin){
            var touch;
            for(var i=0;i<e.touches.length;++i){
              if(e.touches.item(i).identifier == touchId ){
                touch = e.touches.item(i);
              }
            }
            if(touch){
              this.addVote(onTrackerScreenPos(touch,origin),'tracker-touch');            
            }else{
              unmount();
            }
          }
        },true);
        this.each(['touchend','touchcancel'],(eventName)=>{
          this.trackpad.addEventListener(eventName,unmount,true);
        });
      })();
    }
    private addVote(direction:Direction, voter:string){
      this.votes[voter] = direction;
      this.changed();
    }
    private removeVote(voter:string){
      if(voter in this.votes){
        delete this.votes[voter];
        this.changed();
      }
    }
    private changed(){
      var event = <any>document.createEvent('Event');
      event.initEvent('joydiv-changed',true,false);
      event.detail = {
        joydiv: this
      };
      this.rootElement.dispatchEvent(event);
    }
    private getNoneDirection(){
      return new Direction({x:0,y:0});
    }
    private getSnapped(numberOfDirections){
      var net = this.getRawOneDirection();
      if(net.magnitude){
        var angleId = Math.round(numberOfDirections*net.angle/(2*Math.PI))%numberOfDirections;
        var angle = angleId * (2*Math.PI/numberOfDirections);
        var base = [Math.sin(angle),Math.cos(angle)];
        var shadowLength = net.offset.x*base[0] + net.offset.y*base[1];
        return this.getPostProcessed(new Direction({x:base[0]*shadowLength,y:base[1]*shadowLength}));
      }else{
        return this.getNoneDirection();
      }
    }
    public getOneOf8Directions():Direction{
      return this.getSnapped(8);
    } 
    public getOneOf4Directions():Direction{
      return this.getSnapped(4);
    } 
    private getRawOneDirection():Direction{
      var acc={x:0,y:0};
      var cnt = 0;
      this.each(this.votes,direction => {
        acc.x += direction.offset.x;
        acc.y += direction.offset.y;
        ++cnt;
      });
      if(!cnt){
        return this.getNoneDirection();
      }else{
        return new Direction({x:acc.x/cnt,y:acc.y/cnt});
      }
    }
    public getOneDirection():Direction{
      return this.getPostProcessed(this.getRawOneDirection());
    }
    public getAllDirections():Direction[]{
      return this.map(this.votes, (direction)=>this.getPostProcessed(direction));
    }
    public getPostProcessed(direction){
      direction = new Direction(direction.offset);//clone
      if(this.options.clampX){
        var m=Math.abs(direction.offset.x);
        if(this.options.clampX<m){
          direction.offset.x /=m;
          direction.offset.x *= this.options.clampX;
        }
      }
      if(this.options.clampY){
        var m=Math.abs(direction.offset.y);
        if(this.options.clampY<m){
          direction.offset.y /=m;
          direction.offset.y *= this.options.clampY;
        }
      }
      if(this.options.clampMagnitude){
        var m = Math.sqrt(direction.offset.y*direction.offset.y+direction.offset.x*direction.offset.x);
        if(this.options.clampMagnitude<m){
          direction.offset.x /=m;
          direction.offset.x *= this.options.clampMagnitude;
          direction.offset.y /=m;
          direction.offset.y *= this.options.clampMagnitude;
        }
      }
      var newDir = new Direction(direction.offset);
      if(this.options.flipY){
        newDir.offset.y*=-1;
        newDir.angle = (Math.PI*3 - newDir.angle)%(Math.PI*2);
      }
      return newDir;
    }
  }
}