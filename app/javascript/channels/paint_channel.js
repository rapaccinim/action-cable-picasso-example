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

      return;
    }

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
    this.paintOnCanvas(this.context, false, event.offsetX, event.offsetY);

  },

  paintOnCanvas(ctx, isRemoteContext, x, y) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    // start from
    ctx.beginPath();
    // go to old coordinates
    if (isRemoteContext) {
      ctx.moveTo(this.remoteLastX, this.remoteLastY);
    } else{
      ctx.moveTo(this.lastX, this.lastY);
    }
    // go to new coordinates
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
      return;
    }

    // instead, paint using the remote context
    this.paintOnCanvas(this.remoteContext, true, data.x, data.y);
  },
});
