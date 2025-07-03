'use client'

import React, { useState, useRef, useCallback, forwardRef } from 'react'
import { Textarea } from './textarea'
import { cn } from '@/lib/utils'
import { useAutocomplete } from '@/hooks/use-autocomplete'
import { Loader2, Sparkles } from 'lucide-react'

interface TextareaWithAutocompleteProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string
  onValueChange?: (value: string) => void
  enableAutocomplete?: boolean
  maxLength?: number
}

export const TextareaWithAutocomplete = forwardRef<HTMLTextAreaElement, TextareaWithAutocompleteProps>(
  ({ value = '', onValueChange, enableAutocomplete = true, maxLength = 280, className, ...props }, ref) => {
    const [cursorPosition, setCursorPosition] = useState(0)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)

    const handleSuggestionSelect = useCallback((suggestion: string, suggestionCursorPos: number) => {
      const textBeforeCursor = value.substring(0, cursorPosition)
      const textAfterCursor = value.substring(cursorPosition)
      const newValue = textBeforeCursor + suggestion + textAfterCursor
      
      onValueChange?.(newValue)
      
      // Set cursor position after the inserted suggestion
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = cursorPosition + suggestion.length
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
          textareaRef.current.focus()
        }
      }, 0)
    }, [value, cursorPosition, onValueChange])

    const {
      suggestions,
      isLoading,
      showSuggestions,
      selectedIndex,
      triggerAutocomplete,
      selectSuggestion,
      handleKeyDown,
      hideSuggestions
    } = useAutocomplete({ onSuggestionSelect: handleSuggestionSelect })

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      onValueChange?.(newValue)
      
      const cursorPos = e.target.selectionStart || 0
      setCursorPosition(cursorPos)
      
      if (enableAutocomplete) {
        triggerAutocomplete(newValue, cursorPos)
      }
    }, [onValueChange, enableAutocomplete, triggerAutocomplete])

    const handleKeyDownInternal = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle autocomplete navigation
      handleKeyDown(e)
      
      // Update cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          setCursorPosition(textareaRef.current.selectionStart || 0)
        }
      }, 0)
      
      // Call original onKeyDown if provided
      props.onKeyDown?.(e)
    }, [handleKeyDown, props])

    const handleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
      const target = e.target as HTMLTextAreaElement
      setCursorPosition(target.selectionStart || 0)
      props.onClick?.(e)
    }, [props])

    const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Hide suggestions when textarea loses focus (with a small delay to allow clicking on suggestions)
      setTimeout(() => {
        hideSuggestions()
      }, 150)
      props.onBlur?.(e)
    }, [hideSuggestions, props])

    return (
      <div className="relative">
        <Textarea
          ref={(el) => {
            textareaRef.current = el
            if (typeof ref === 'function') {
              ref(el)
            } else if (ref) {
              ref.current = el
            }
          }}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDownInternal}
          onClick={handleClick}
          onBlur={handleBlur}
          className={cn(className)}
          maxLength={maxLength}
          {...props}
        />
        
        {/* Character count */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-1 rounded">
          {value.length}/{maxLength}
        </div>
        
        {/* AI indicator */}
        {enableAutocomplete && (
          <div className="absolute top-2 right-2 flex items-center space-x-1">
            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
            <Sparkles className="h-3 w-3 text-blue-500" />
          </div>
        )}
        
        {/* Autocomplete suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
          >
            <div className="p-2 text-xs text-gray-500 font-medium border-b border-gray-100">
              AI Suggestions
            </div>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                  index === selectedIndex && "bg-blue-50 text-blue-900"
                )}
                onClick={() => selectSuggestion(index)}
                onMouseEnter={() => {
                  // Set selected index on hover for keyboard navigation consistency
                }}
              >
                <div className="font-medium">Continue with:</div>
                <div className="text-gray-600 mt-1 truncate">
                  {value.substring(0, cursorPosition)}
                  <span className="bg-blue-100 text-blue-900 px-1 rounded">
                    {suggestion}
                  </span>
                  {value.substring(cursorPosition)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
)

TextareaWithAutocomplete.displayName = 'TextareaWithAutocomplete'