class PaintChannel < ApplicationCable::Channel
  def subscribed
    stream_from "paint_channel"
  end

  def paint(data)
    ActionCable.server.broadcast("paint_channel", data)
  end

  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
  end
end
