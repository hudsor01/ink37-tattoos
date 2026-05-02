'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, X, Pencil, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export function InlineEdit({
  value,
  onSave,
  label,
  type = 'text',
  options,
  placeholder,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  if (prevValue !== value) {
    setPrevValue(value);
    setEditValue(value);
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  function handleStartEdit() {
    setEditValue(value);
    setIsEditing(true);
  }

  function handleCancel() {
    setEditValue(value);
    setIsEditing(false);
  }

  async function handleSave() {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={handleStartEdit}
        className="group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-muted"
        aria-label={`Edit ${label}`}
      >
        <span className="flex-1">{value || <span className="text-muted-foreground">{placeholder ?? 'Not set'}</span>}</span>
        <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex items-start gap-1">
      {type === 'textarea' ? (
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label={label}
          className="min-h-textarea-sm text-sm"
        />
      ) : type === 'select' && options ? (
        <Select
          value={editValue}
          onValueChange={(val) => setEditValue(val as string)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type === 'date' ? 'date' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label={label}
          className="text-sm"
        />
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleSave}
        disabled={isSaving}
        aria-label="Save"
      >
        {isSaving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleCancel}
        disabled={isSaving}
        aria-label="Cancel"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
