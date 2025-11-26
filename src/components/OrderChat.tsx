import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface OrderChatProps {
  orderId: string;
  currentUserId: string;
}

const OrderChat = ({ orderId, currentUserId }: OrderChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
  }, [orderId]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Error loading messages", variant: "destructive" });
    } else {
      setMessages(data || []);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    const { error } = await supabase.from("messages").insert({
      order_id: orderId,
      sender_id: currentUserId,
      message: newMessage.trim(),
    });

    if (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
    } else {
      setNewMessage("");
      fetchMessages();
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Chat</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4 mb-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No messages yet</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender_id === currentUserId ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.sender_id === currentUserId
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {format(new Date(msg.created_at), "MMM dd, HH:mm")}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderChat;
