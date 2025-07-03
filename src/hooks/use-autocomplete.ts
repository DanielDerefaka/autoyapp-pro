'use client'

import { useState, useCallback, useRef } from 'react'

interface UseAutocompleteOptions {
  onSuggestionSelect: (suggestion: string, cursorPosition: number) => void
  debounceMs?: number
}

export function useAutocomplete({ onSuggestionSelect, debounceMs = 500 }: UseAutocompleteOptions) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const fetchSuggestions = useCallback(async (text: string, cursorPosition: number) => {
    if (text.length < 10) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, cursorPosition })
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
        setShowSuggestions(data.suggestions?.length > 0)
        setSelectedIndex(-1)
      }
    } catch (error) {
      console.error('Error fetching autocomplete suggestions:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const triggerAutocomplete = useCallback((text: string, cursorPosition: number) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(text, cursorPosition)
    }, debounceMs)
  }, [fetchSuggestions, debounceMs])

  const selectSuggestion = useCallback((index: number) => {
    if (index >= 0 && index < suggestions.length) {
      onSuggestionSelect(suggestions[index], 0) // Cursor position will be handled by parent
      setSuggestions([])
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }, [suggestions, onSuggestionSelect])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (selectedIndex >= 0) {
          selectSuggestion(selectedIndex)
        }
        break
      case 'Escape':
        setSuggestions([])
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }, [showSuggestions, suggestions.length, selectedIndex, selectSuggestion])

  const hideSuggestions = useCallback(() => {
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
  }, [])

  return {
    suggestions,
    isLoading,
    showSuggestions,
    selectedIndex,
    triggerAutocomplete,
    selectSuggestion,
    handleKeyDown,
    hideSuggestions
  }
}