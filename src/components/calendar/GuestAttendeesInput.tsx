import React, { useState } from 'react';
import { Users, Plus, X, Mail, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export interface Attendee {
  name: string;
  email: string;
  relationship?: 'spouse' | 'parent_guardian' | 'family_member' | 'co_therapist' | 'other';
}

interface GuestAttendeesInputProps {
  attendees: Attendee[];
  onChange: (attendees: Attendee[]) => void;
  className?: string;
}

export const GuestAttendeesInput: React.FC<GuestAttendeesInputProps> = ({
  attendees,
  onChange,
  className = '',
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [relationship, setRelationship] = useState<Attendee['relationship']>('spouse');
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAdd = () => {
    if (!emailInput.trim()) {
      setError('Please enter an email address');
      return;
    }
    if (!isValidEmail(emailInput.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    if (attendees.some((a) => a.email.toLowerCase() === emailInput.trim().toLowerCase())) {
      setError('This attendee is already added');
      return;
    }

    const newAttendee: Attendee = {
      name: nameInput.trim() || emailInput.split('@')[0],
      email: emailInput.trim().toLowerCase(),
      relationship,
    };

    onChange([...attendees, newAttendee]);
    setEmailInput('');
    setNameInput('');
    setError(null);
  };

  const handleRemove = (emailToRemove: string) => {
    onChange(attendees.filter((a) => a.email !== emailToRemove));
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>Additional Attendees (Couples & Family Therapy)</span>
        </label>
        <span className="text-xs text-muted-foreground">Optional</span>
      </div>

      {/* Added Attendees List */}
      {attendees.length > 0 && (
        <div className="space-y-1.5">
          {attendees.map((attendee) => (
            <div
              key={attendee.email}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs">
              <div className="flex items-center space-x-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{attendee.name}</span>
                <span className="text-muted-foreground">({attendee.email})</span>
                {attendee.relationship && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary uppercase">
                    {attendee.relationship.replace('_', ' ')}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(attendee.email)}
                className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="text"
          placeholder="Name (e.g. Partner, Parent)"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          className="text-xs h-9"
        />
        <Input
          type="email"
          placeholder="attendee@example.com"
          value={emailInput}
          onChange={(e) => {
            setEmailInput(e.target.value);
            if (error) setError(null);
          }}
          className="text-xs h-9"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as Attendee['relationship'])}
          className="h-9 px-2.5 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="spouse">Spouse / Partner</option>
          <option value="parent_guardian">Parent / Guardian</option>
          <option value="family_member">Family Member</option>
          <option value="co_therapist">Co-Therapist</option>
          <option value="other">Other</option>
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="h-9 text-xs shrink-0 font-medium">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <p className="text-[11px] text-muted-foreground flex items-center">
        <Shield className="w-3 h-3 mr-1 text-emerald-600" />
        All participants will receive meeting invites and the HIPAA-compliant telehealth room link.
      </p>
    </div>
  );
};

export default GuestAttendeesInput;
