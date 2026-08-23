import React, { useState } from 'react';
import { MessageSquare, X, Send, Clock, FileCheck, Calendar, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { type WhatsAppReminderParams } from '../../utils/whatsappHelper';

interface WhatsAppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialParams?: Partial<WhatsAppReminderParams>;
}

export const WhatsAppDrawer: React.FC<WhatsAppDrawerProps> = ({
  isOpen,
  onClose,
  initialParams = {},
}) => {
  const [clientName, setClientName] = useState(initialParams.clientName || 'Alex Rivera');
  const [clientPhone, setClientPhone] = useState(initialParams.clientPhone || '+91 98765 43210');
  const [selectedTemplate, setSelectedTemplate] = useState<'reminder' | 'confirm' | 'homework' | 'reschedule'>('reminder');
  const [customMessage, setCustomMessage] = useState('');

  if (!isOpen) return null;

  const templates = {
    reminder: `Hello ${clientName},\n\nThis is a friendly reminder for your therapy session with Dr. Therapist at Iragu Health today.\n\n⏰ Time: 10:00 AM\n🔗 Zoom Video Call: ${window.location.origin}/telehealth\n\nPlease ensure you are in a quiet, private space. Warm regards!`,
    confirm: `Hello ${clientName},\n\nYour therapy appointment has been confirmed!\n\n🗓 Date: Tuesday, Aug 18, 2026\n⏰ Time: 10:00 AM\n💬 Mode: Zoom In-App Video Call\n\nLooking forward to speaking with you.`,
    homework: `Hello ${clientName},\n\nThank you for today's session. As discussed, please take 10 minutes to complete your thought log before our next session.\n\nWarm regards,\nDr. Therapist`,
    reschedule: `Hello ${clientName},\n\nI need to adjust our upcoming appointment time. Please check your available slots at ${window.location.origin}/calendar or reply with a convenient time for you.\n\nThank you for your understanding!`,
  };

  const handleSend = () => {
    const messageToSend = customMessage.trim() || templates[selectedTemplate];
    const cleanPhone = clientPhone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageToSend)}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-md bg-card border-l border-border h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-emerald-500/10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">WhatsApp Clinical Messenger</h3>
              <p className="text-xs text-muted-foreground">Direct HIPAA-safe client notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Recipient */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recipient Details
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-muted-foreground mb-1 block">Client Name</span>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="text-xs h-9"
                  placeholder="Client Name"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground mb-1 block">WhatsApp Phone</span>
                <Input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="text-xs h-9 font-mono"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
          </div>

          {/* Quick Templates */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Message Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate('reminder');
                  setCustomMessage('');
                }}
                className={`flex items-center space-x-2 p-2.5 rounded-xl border text-left text-xs transition-colors ${
                  selectedTemplate === 'reminder'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Session Reminder</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate('confirm');
                  setCustomMessage('');
                }}
                className={`flex items-center space-x-2 p-2.5 rounded-xl border text-left text-xs transition-colors ${
                  selectedTemplate === 'confirm'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}>
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Confirmation</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate('homework');
                  setCustomMessage('');
                }}
                className={`flex items-center space-x-2 p-2.5 rounded-xl border text-left text-xs transition-colors ${
                  selectedTemplate === 'homework'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}>
                <FileCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Post-Session Plan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate('reschedule');
                  setCustomMessage('');
                }}
                className={`flex items-center space-x-2 p-2.5 rounded-xl border text-left text-xs transition-colors ${
                  selectedTemplate === 'reschedule'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}>
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Reschedule</span>
              </button>
            </div>
          </div>

          {/* Message Preview & Edit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Message Content
              </label>
              <span className="text-[11px] text-muted-foreground">Editable</span>
            </div>
            <Textarea
              rows={8}
              value={customMessage || templates[selectedTemplate]}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="text-xs font-sans leading-relaxed resize-none p-3"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <Send className="w-3.5 h-3.5 mr-1.5" /> Send via WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppDrawer;
