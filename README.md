# ActionCable Example

## Definitions
[ActionCable](https://guides.rubyonrails.org/action_cable_overview.html) was introduced in Ruby on Rails v5 and it allows real-time communication between the server and the client using WebSockets.

WebSockets are a communication protocol that provides bi-directional and real-time communication between a client and a server, using a single, long-lived TCP connection.

### HTTP vs WebSocket
* HTTP is a **stateless** communication system
    * each request is treated by the server as new and separate
* WebSocket is a **stateful** communication system
    * the server keeps the state/context of client's interactions

ActionCable organises communication into channels. Channels manage WebSocket connections and handle communication between the server and the client.

ActionCable allows the server to broadcast messages to all clients subscribed (_the subscribers_) to a particular channel. This enables real-time updates to be pushed to clients instantly, providing a responsive and interactive user experience.

## This example
Generally, when demonstrating the power of WebSockets through ActionCable, the most common example that comes to mind is a real-time chat.

Instead, today we will try to do a very basic Jamboard to draw real-time on a canvas.

## First Steps
First of all, we create a Rails app:
```
rails new picasso
```

And move into the newly created folder:
```
cd picasso
```

Then we create a new controller:
```
rails g controller pages home
```

Finally, we create a new ActionCable channel:
```
rails g channel paint
```

Ok, we are done with the creation, let's start the server:
```
rails s
```

And you can open: [http://localhost:3000/](http://localhost:3000/)

## Server Side
### config/routes.rb
Now, it's time to do some setup for ActionCable in our `config/routes.rb`.

We remove the existing `get` and we define the `root` path route and we `mount` the ActionCable server:
```
mount ActionCable.server => '/cable'
root 'pages#home'
```

### Adding canvas to app/views/pages/home.html.erb
If we open the browser, it will suggest that we need to go to `app/views/pages/home.html.erb`, because that's exactly where we are going to add our canvas:
```
<canvas id="jamboard" width="600" height="600" style="border: 1px solid black;"></canvas>
```

### Configuring the channel in app/channels/paint_channel.rb
Now we need to think about the stream and the broadcast communication.

So, we go to `app/channels/paint_channel.rb`, where we need to:

A) define which channel we will be streaming from inside the `subscribed` method. This establishes a connection between the client and a Redis pubsub queue
```
stream_from "paint_channel"
```
B) add a method, in our case `paint` to actually start broadcasting. In the method, `ActionCable.server.broadcast` add a message in a Redis pubsub queue
```
def paint(data)
	ActionCable.server.broadcast("paint_channel", data)
end
```

In a real-world application, we would need to implement authentication and authorisation, we could do it in `app/channels/application_cable/connection.rb`, for example by defining `identified_by :current_user`, using `devise`, etc

For this example, we will keep things simple.

This means that we have finished with the server side configuration.

## Client Side
The key file is in `app/javascript/channels/paint_channel.js`.

First of all, let's define what happens when the subscription is ready for use on the server:
```
connected() {  
  // Called when the subscription is ready for use on the server  
  this.canvasSetup();  
},
```

Let's create the canvasSetup() method:
```
canvasSetup() {  
  // usual stuff related to canvas  
  this.canvas = document.getElementById("jamboard");  
  this.context = this.canvas.getContext("2d");  
  // we also need a remote context (what gets the receiver of the data)  
  this.remoteContext = this.canvas.getContext("2d");  
  
  // TBD...  
},
```

We might encounter the issue:
```
Cannot find package '@babel/plugin-proposal-private-methods'
```
And then the issue:
```
Error: [BABEL]: --- PLACEHOLDER PACKAGE ---
This @babel/plugin-proposal-private-property-in-object version is not meant to
be imported. Something is importing
@babel/plugin-proposal-private-property-in-object without declaring it in its
dependencies (or devDependencies) in the package.json file.
Add "@babel/plugin-proposal-private-property-in-object" to your devDependencies
to work around this error. This will make this message go away.
```
The best way is to add the missing dependencies, delete `node` folder and then run again with `yarn`.
```
yarn add @babel/plugin-proposal-private-methods @babel/plugin-proposal-private-property-in-object
```

Then we can define all the content all the logic:
```
import consumer from "./consumer"  
  
consumer.subscriptions.create("PaintChannel", {  
  connected() {  
    // Called when the subscription is ready for use on the server  
    this.canvasSetup();  
  },  
  
  canvasSetup() {  
    // usual stuff related to canvas  
    this.canvas = document.getElementById("jamboard");  
    this.context = this.canvas.getContext("2d");  
    // we also need a remote context (what gets the receiver of the data)  
    this.remoteContext = this.canvas.getContext("2d");  
  
    this.canvas.addEventListener("mousedown", this.handlePainting.bind(this, "start"));  
    this.canvas.addEventListener("mouseup", this.handlePainting.bind(this, "stop"));  
    this.canvas.addEventListener("mousemove", this.handlePainting.bind(this, "painting"));  
  },  
  
  // Add a bit of comments to this one  
  handlePainting(action, event) {  
    const isStartOrStop = action === "start" || action === "stop";  
  
    if (isStartOrStop) {  
      this.isPainting = action === "start";  
  
      this.lastX = event.offsetX;  
      this.lastY = event.offsetY;  
      this.lastSent = Date.now();  
  
      this.perform("paint", {  
        x: event.offsetX,  
        y: event.offsetY,  
        state: action,  
      });  
  
      return;    }  
  
    // instead, if it's painting...  
  
    if(!this.isPainting) return;  
  
    // Send to server every 8ms  
    if (Date.now() - this.lastSent > 8) {  
      this.perform("paint", {  
        x: event.offsetX,  
        y: event.offsetY,  
        state: "painting",  
      });  
      this.lastSent = Date.now();  
    }  
    this.paintOnCanvas(this.context, event.offsetX, event.offsetY);  
  
  },  
  
  paintOnCanvas(ctx, x, y) {  
    ctx.lineJoin = "round";  
    ctx.lineCap = "round";  
    // start from  
    ctx.beginPath();  
    // go to old coordinates  
    ctx.moveTo(this.lastX, this.lastY);  
    // go to new coordinates  
    ctx.lineTo(x, y);  
    ctx.stroke();  
    // set new coordinates  
    this.lastX = x;  
    this.lastY = y;  
  },  
  
  disconnected() {  
    // Called when the subscription has been terminated by the server  
  },  
  
  received(data) {  
    // Called when there's incoming data on the websocket for this channel  
    if (data.state === "start" || data.state === "stop") {  
      this.remoteLastX = data.x;  
      this.remoteLastY = data.y;  
      return;    }  
  
    // instead, paint using the remote context  
    this.paintOnCanvas(this.remoteContext, data.x, data.y);  
  },  
});
```

You can observe that is not working correctly because on the second screen it doesn't take correctly the last X,Y coordinates.

We can fix it easily in the `paintOnCanvas` method:

```
import consumer from "./consumer"  
  
consumer.subscriptions.create("PaintChannel", {  
  connected() {  
    // Called when the subscription is ready for use on the server  
    this.canvasSetup();  
  },  
  
  canvasSetup() {  
    // usual stuff related to canvas  
    this.canvas = document.getElementById("jamboard");  
    this.context = this.canvas.getContext("2d");  
    // we also need a remote context (what gets the receiver of the data)  
    this.remoteContext = this.canvas.getContext("2d");  
  
    this.canvas.addEventListener("mousedown", this.handlePainting.bind(this, "start"));  
    this.canvas.addEventListener("mouseup", this.handlePainting.bind(this, "stop"));  
    this.canvas.addEventListener("mousemove", this.handlePainting.bind(this, "painting"));  
  },  
  
  // choosing the right action to perform according to the mouse event  
  handlePainting(action, event) {  
    const isStartOrStop = action === "start" || action === "stop";  
  
    if (isStartOrStop) {  
      this.isPainting = action === "start";  
  
      this.lastX = event.offsetX;  
      this.lastY = event.offsetY;  
      this.lastSent = Date.now();  
  
      this.perform("paint", {  
        x: event.offsetX,  
        y: event.offsetY,  
        state: action,  
      });  
  
      return;
    }  
  
    // instead, if the action is "painting"
  
    if(!this.isPainting) return;  
  
    // send to server every 8ms  
    if (Date.now() - this.lastSent > 8) {  
      this.perform("paint", {  
        x: event.offsetX,  
        y: event.offsetY,  
        state: "painting",  
      });  
      this.lastSent = Date.now();  
    }

	// let's paint on canvas using the current coordinates of the MouseEvent
    this.paintOnCanvas(this.context, false, event.offsetX, event.offsetY);
  },  

	// this method actually paints a line on the screen, depending on the type of context
  paintOnCanvas(ctx, isRemoteContext, x, y) {  
    ctx.lineJoin = "round";  
    ctx.lineCap = "round";  
    // start from  
    ctx.beginPath();  
    // go to old coordinates  
    if (isRemoteContext) {  
      ctx.moveTo(this.remoteLastX, this.remoteLastY);  
    } else{
	// go to new coordinates  
      ctx.moveTo(this.lastX, this.lastY);  
    }  
    
    ctx.lineTo(x, y);  
    ctx.stroke();  
    // set new coordinates  
    if (isRemoteContext) {  
      this.remoteLastX = x;  
      this.remoteLastY = y;  
      return;
    }  
    this.lastX = x;  
    this.lastY = y;  
  },  
  
  disconnected() {  
    // Called when the subscription has been terminated by the server  
  },  
  
  received(data) {  
    // Called when there's incoming data on the websocket for this channel  
    if (data.state === "start" || data.state === "stop") {  
      this.remoteLastX = data.x;  
      this.remoteLastY = data.y;  
      return;    }  
  
    // instead, paint using the remote context  
    this.paintOnCanvas(this.remoteContext, true, data.x, data.y);  
  },  
});
```

## Final Notes
* You could observe some kind of inconsistencies, this depends on the interpolation.
* Redis (key-value database) is the default for Action Cable, but we can also configure it in the `cable.yaml` file to use other databases for storing subscription data. 
