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

    // TBD...
  },

  disconnected() {
    // Called when the subscription has been terminated by the server
  },

  received(data) {
    // Called when there's incoming data on the websocket for this channel
  }
});
